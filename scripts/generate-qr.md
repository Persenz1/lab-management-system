# 二维码生成说明

实验室管理系统采用网页入口二维码。二维码内容为系统页面 URL，扫码后手机浏览器直接打开对应页面。

## 二维码内容

将以下 URL 中的 `服务器IP` 替换为实验室服务器实际 IP 地址。

### 总入口二维码

```text
http://服务器IP:8090/
```

贴放位置：实验室门口、公告栏。

### 设备登记页二维码

```text
http://服务器IP:8090/equipment-use.html
```

贴放位置：服务器旁、3D 打印机旁。

### 单设备预选二维码

每台设备使用专属二维码，自动预选该设备。

```text
http://服务器IP:8090/equipment-use.html?equipment_id=设备ID
```

设备 ID 可在 PocketBase Admin 中查询：
- 打开 `http://服务器IP:8090/_/`
- 进入 Collections → equipment
- 点击对应设备，复制 ID

贴放位置：对应设备旁。

## 生成方式

### 方式一：在线生成器（推荐，简单）

1. 打开任意在线二维码生成器（如 [QR Code Generator](https://www.qr-code-generator.com)）
2. 输入页面 URL
3. 下载 PNG 或 SVG 图片
4. 打印并贴放

### 方式二：本地命令行（Ubuntu）

```bash
# 安装 qrencode
sudo apt install qrencode

# 生成总入口二维码
qrencode -o /tmp/lab-entry.png -s 10 "http://192.168.1.50:8090/"

# 生成设备登记页二维码
qrencode -o /tmp/lab-equipment.png -s 10 "http://192.168.1.50:8090/equipment-use.html"

# 生成单设备预选二维码（替换为实际设备 ID）
qrencode -o /tmp/lab-equipment-server-a.png -s 10 "http://192.168.1.50:8090/equipment-use.html?equipment_id=设备ID"
```

### 方式三：Python 脚本

```bash
# 安装依赖
pip install qrcode[pil]

# 生成二维码
python3 -c "
import qrcode
img = qrcode.make('http://192.168.1.50:8090/')
img.save('lab-entry.png')
print('已生成 lab-entry.png')
"
```

## 注意事项

1. **必须使用固定局域网 IP**，不要用 DHCP 动态 IP。IP 变化后所有二维码都会失效。
2. 二维码是纯网页入口，不是物资二维码管理系统。
3. 建议打印后过塑，贴放在设备旁。
4. 二维码图片本身可以备份到网盘，方便重新打印。
