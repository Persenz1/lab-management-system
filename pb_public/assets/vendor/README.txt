此目录保存本地 PocketBase JS SDK，HTML 页面会引用：

  assets/vendor/pocketbase.umd.js

部署时必须保留该文件，避免局域网/离线环境依赖公网 CDN。

下载地址（选任一）：
  jsDelivr: https://cdn.jsdelivr.net/npm/pocketbase@0.21.5/dist/pocketbase.umd.js
  GitHub:   https://github.com/pocketbase/js-sdk/releases

或者用脚本下载：
  curl -L -o pocketbase.umd.js https://cdn.jsdelivr.net/npm/pocketbase@0.21.5/dist/pocketbase.umd.js

部署到离线 LAN 环境时，请确保此文件存在，否则所有页面会因缺少 SDK 而初始化失败。
