## 0.2.1.2 同步

Android versionName 0.2.1.2 / versionCode 20102，原生导出插件与兼容签名保持。网页公式修复已同步APK。无鸿蒙真机验收。

# WIS Android 存档导出插件

此文件为0.2.1.1 APK实际编译的原生导出源码，供Git审查和恢复。完整Capacitor打包工程仍位于同级WIS-App，未将node_modules、SDK、密钥、构建输出复制到游戏仓库。

将WisSaveExportPlugin.java放入android/app/src/main/java/com/wis/game；MainActivity.onCreate在super.onCreate之前调用registerPlugin(WisSaveExportPlugin.class)。现有WisBackupPlugin注册保留。网页入口为js/ui/native-platform.js，功能为WisSaveExport.saveText({text,filename,generic})。UTF8写入、读回长度和SHA256一致才返回saved；取消返回cancelled。系统选择器和权限失败由分享/文本入口后备。

当前Android versionName0.2.1.1/versionCode20101，包名com.wis.game。此目录不是完整Android构建工程。不得提交签名密钥。
