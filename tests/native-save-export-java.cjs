'use strict';
// Execute the actual Java validation blocks with Gson's streaming reader adapter.
// This tests native mode routing/JSON validation, not Android providers or lifecycle.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=process.env.WIS_NATIVE_TEST_OUT;
assert(out&&path.isAbsolute(out),'Set WIS_NATIVE_TEST_OUT to the E-drive evidence directory');
const java=process.env.JAVA_HOME,android=process.env.ANDROID_HOME;assert(java&&android,'Load WIS-App-Toolchain/env-ascii.ps1 first');
const gson=process.env.WIS_GSON_JAR||path.join(android,'cmdline-tools/latest/lib/external/com/google/code/gson/gson/2.11.0/gson-2.11.0.jar');assert(fs.existsSync(gson),'Gson streaming-reader adapter is required');
const source=fs.readFileSync(path.join(root,'native/android-export/WisSaveExportPlugin.java'),'utf8');
const save=source.indexOf('@PluginMethod public void saveText'),headerStart=source.indexOf('try {',save)+5,headerEnd=source.indexOf('String filename',headerStart);
const workerStart=source.indexOf('String text = call.getString("text");',source.indexOf('writer.execute')),workerEnd=source.indexOf('byte[] bytes',workerStart);
assert(headerStart>0&&headerEnd>headerStart&&workerStart>0&&workerEnd>workerStart);
const recursive=source.slice(source.indexOf('private static void validateValue'),source.lastIndexOf('}'));
const harness=`import com.google.gson.stream.JsonReader;import com.google.gson.stream.JsonToken;import java.io.StringReader;import java.nio.charset.StandardCharsets;
public class WISExportValidation {
 static class Call {String text,kind;Call(String t,String k){text=t;kind=k;}String getString(String k){return k.equals("text")?text:kind;}String getString(String k,String fallback){String v=getString(k);return v==null?fallback:v;}}
 static void header(Call call)throws Exception {${source.slice(headerStart,headerEnd)}}
 static void body(Call call)throws Exception {${source.slice(workerStart,workerEnd)}}
 ${recursive}
 static void accepts(String text,String kind)throws Exception {Call c=new Call(text,kind);header(c);body(c);if(!new String(text.getBytes(StandardCharsets.UTF_8),StandardCharsets.UTF_8).equals(text))throw new AssertionError("UTF8 changed");}
 static void rejects(String text,String kind)throws Exception {try{Call c=new Call(text,kind);header(c);body(c);}catch(Exception expected){return;}throw new AssertionError("unexpected acceptance: "+kind+" / "+text);}
 public static void main(String[] args)throws Exception {accepts("{坏档\\r\\n😀","raw");accepts("","raw");accepts("{\\\"数字\\\":1e9999,\\\"大数\\\":\\\"eee100\\\"}",null);accepts("{}","save");rejects("{broken",null);rejects("{broken","save");rejects("[]","save");rejects("{} trailing","save");rejects("{}","unsafe");System.out.println("PASS native raw malformed/empty/UTF8; default/save object validation, huge numeric token and invalid kind");}
}`;
fs.mkdirSync(out,{recursive:true});const file=path.join(out,'WISExportValidation.java');fs.writeFileSync(file,harness);
function run(tool,args){const r=spawnSync(path.join(java,'bin',tool),args,{encoding:'utf8'});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,tool+' validation failed');}
run('javac.exe',['-encoding','UTF-8','-cp',gson,'-d',out,file]);run('java.exe',['-cp',out+path.delimiter+gson,'WISExportValidation']);
