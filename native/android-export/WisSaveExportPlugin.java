package com.wis.game;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.JsonReader;
import android.util.JsonToken;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "WisSaveExport")
public class WisSaveExportPlugin extends Plugin {
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final ExecutorService writer = Executors.newSingleThreadExecutor();
    private volatile boolean destroyed;
    // Never put a potentially multi-megabyte save in Android's saved-state Bundle.
    @Override protected Bundle saveInstanceState() { return null; }
    @Override protected void handleOnDestroy() {
        destroyed = true;
        busy.set(false);
        writer.shutdownNow();
    }
    @PluginMethod public void saveText(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("文件保存正在进行"); return; }
        try {
            String text = call.getString("text");
            if (text == null || text.isEmpty()) throw new Exception("存档内容为空");
            String filename = call.getString("filename", "WIS-save.json").replaceAll("[\\\\/\\r\\n]", "_");
            if (!filename.endsWith(".json")) filename += ".json";
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(Boolean.TRUE.equals(call.getBoolean("generic", false)) ? "application/octet-stream" : "application/json");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(call, intent, "fileSelected");
        } catch (Exception e) { busy.set(false); call.reject("无法打开文件保存：" + e.getMessage(), e); }
    }
    @ActivityCallback private void fileSelected(PluginCall call, ActivityResult result) {
        if (call == null || destroyed) { busy.set(false); return; }
        if (result.getResultCode() != Activity.RESULT_OK) {
            busy.set(false);
            JSObject response = new JSObject(); response.put("status", "cancelled"); call.resolve(response); return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null) { busy.set(false); call.reject("文件选择器没有返回保存位置"); return; }
        try { writer.execute(() -> {
            try {
                String text = call.getString("text");
                // Streaming syntax validation consumes numeric tokens as strings, never doubles.
                try (JsonReader reader = new JsonReader(new StringReader(text))) {
                    reader.setLenient(false);
                    if (reader.peek() != JsonToken.BEGIN_OBJECT) throw new Exception("存档必须为 JSON 对象");
                    validateValue(reader, 0);
                    if (reader.peek() != JsonToken.END_DOCUMENT) throw new Exception("存档包含多余内容");
                }
                byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
                byte[] expected = MessageDigest.getInstance("SHA-256").digest(bytes);
                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (out == null) throw new Exception("无法打开目标文件");
                    out.write(bytes); out.flush();
                }
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long count = 0;
                try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
                    if (in == null) throw new Exception("无法读回目标文件");
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = in.read(buffer)) != -1) { count += n; digest.update(buffer, 0, n); }
                }
                if (count != bytes.length || !MessageDigest.isEqual(expected, digest.digest())) throw new Exception("文件读回校验不一致");
                if (destroyed) return;
                StringBuilder sha = new StringBuilder();
                for (byte value : expected) sha.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
                JSObject response = new JSObject(); response.put("status", "saved"); response.put("bytes", count);
                response.put("sha256", sha.toString()); response.put("filename", call.getString("filename"));
                call.resolve(response);
            } catch (Exception e) {
                // The provider may return an existing document: never delete the returned URI.
                if (!destroyed) call.reject("文件未确认保存，请保留存档文本并重试：" + e.getMessage(), e);
            } finally { busy.set(false); }
        }); } catch (Exception e) { busy.set(false); call.reject("保存任务无法启动", e); }
    }
    private static void validateValue(JsonReader reader, int depth) throws Exception {
        if (depth > 256) throw new Exception("JSON 嵌套过深");
        switch (reader.peek()) {
            case BEGIN_OBJECT:
                reader.beginObject(); while (reader.hasNext()) { reader.nextName(); validateValue(reader, depth + 1); } reader.endObject(); break;
            case BEGIN_ARRAY:
                reader.beginArray(); while (reader.hasNext()) validateValue(reader, depth + 1); reader.endArray(); break;
            case STRING: case NUMBER: reader.nextString(); break;
            case BOOLEAN: reader.nextBoolean(); break;
            case NULL: reader.nextNull(); break;
            default: throw new Exception("JSON 格式无效");
        }
    }
}
