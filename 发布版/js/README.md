# WIS 0.1.5.5 发布脚本

运行代码与对应开发版一致，发布差异限于构建开关和调试展示入口。

- `index.html` 是脚本及加载顺序权威，`script-manifest.json` 为生成清单。
- `core/build-config.js`：release 构建；调速和来源公式调试关闭。
- `core/config.js`：玩家版本 0.1.5.5，存档 Schema 61，结算规则版本 1。
- Profiler 保留生产调用所需的轻量门面，默认不计时；正常来源预览和异常恢复仍启用。

完整开发说明、测试及构建检查工具保留在开发目录。
