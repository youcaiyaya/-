# 🌐 Netlify部署问题说明

## ❌ 问题分析

你在Netlify部署后遇到的问题：

```
GET https://fluffy-hotteok-f03b36.netlify.app/api/status 404 (Not Found)
```

### 根本原因

1. **Netlify是静态网站托管**
   - 只能托管HTML/CSS/JS文件
   - 不支持运行Node.js服务器
   - `/api/*` 路径没有对应的处理程序

2. **局域网访问限制**
   - 你的ESP32在局域网（10.212.215.31）
   - Netlify服务器在云端
   - **云端服务器无法访问你的局域网设备**

---

## 🚫 为什么Netlify不适合这个项目

### 架构要求
```
浏览器 → Node.js服务器 → ESP32设备
        (需要在同一局域网)
```

### Netlify的限制
```
浏览器 → Netlify云端 ✗ 无法访问局域网 ✗ ESP32设备
```

即使使用Netlify Functions，云端服务器也无法访问你家里/办公室的ESP32设备。

---

## ✅ 推荐的部署方案

### 方案1：本地部署（最简单）

**适用场景：** 只在局域网内使用

**步骤：**
```bash
# 1. 在你的电脑上启动服务器
cd web
npm start

# 2. 局域网内访问
http://你的电脑IP:3001
```

**优点：**
- ✅ 最简单
- ✅ 无需配置
- ✅ 完全免费
- ✅ 数据不出局域网

**缺点：**
- ❌ 只能局域网访问
- ❌ 电脑需要一直开着

---

### 方案2：树莓派/NAS部署（推荐）

**适用场景：** 需要24小时运行

**设备选择：**
- 树莓派（约200-400元）
- NAS设备（如群晖）
- 旧电脑/笔记本

**步骤：**
```bash
# 1. 在树莓派上安装Node.js
sudo apt update
sudo apt install nodejs npm

# 2. 上传项目文件
scp -r web/* pi@树莓派IP:/home/pi/smart-power/

# 3. 安装依赖
cd /home/pi/smart-power
npm install

# 4. 使用PM2启动（开机自启）
npm install -g pm2
pm2 start server.js --name smart-power
pm2 save
pm2 startup
```

**优点：**
- ✅ 24小时运行
- ✅ 低功耗
- ✅ 局域网访问
- ✅ 可配合内网穿透

**缺点：**
- ❌ 需要购买设备
- ❌ 需要一些配置

---

### 方案3：云服务器 + 内网穿透（公网访问）

**适用场景：** 需要从外网访问

**架构：**
```
外网浏览器 → 云服务器 → 内网穿透 → 本地服务器 → ESP32
```

#### 3.1 使用Vercel/Railway部署前端

**Vercel部署（免费）：**

1. 修改前端代码，直接连接ESP32（需要内网穿透）

```javascript
// app.js - 修改API地址
const ESP32_URL = 'https://你的内网穿透域名';

function getUrl(path) {
    return ESP32_URL + path;
}
```

2. 部署到Vercel
```bash
npm install -g vercel
vercel
```

#### 3.2 使用内网穿透工具

**选项A：Ngrok（简单）**
```bash
# 1. 下载ngrok: https://ngrok.com/
# 2. 启动本地服务器
npm start

# 3. 启动ngrok
ngrok http 3001

# 4. 获得公网地址
https://xxxx-xx-xx-xx-xx.ngrok.io
```

**选项B：FRP（免费）**
```bash
# 需要一台云服务器
# 配置frp服务端和客户端
```

**选项C：Tailscale（推荐）**
```bash
# 1. 安装Tailscale
# 2. 创建虚拟局域网
# 3. 所有设备都能访问
```

**优点：**
- ✅ 可以从外网访问
- ✅ 手机也能控制
- ✅ 随时随地访问

**缺点：**
- ❌ 配置复杂
- ❌ 可能需要付费
- ❌ 安全性需要考虑

---

### 方案4：Render.com部署（支持Node.js）

**适用场景：** 需要云端托管Node.js应用

**步骤：**

1. 注册Render.com账号（免费）

2. 创建Web Service

3. 连接GitHub仓库

4. 配置：
```yaml
# render.yaml
services:
  - type: web
    name: smart-power
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: ESP32_IP
        value: 你的ESP32公网地址
```

**问题：** 仍然需要ESP32有公网地址（内网穿透）

---

## 🎯 最佳实践建议

### 推荐方案组合

**方案A：纯局域网使用（最简单）**
```
电脑/树莓派运行Node.js → ESP32
局域网内访问
```

**方案B：外网访问（推荐）**
```
Vercel托管前端 → Tailscale虚拟局域网 → 本地服务器 → ESP32
```

**方案C：完全云端（复杂）**
```
云服务器 → FRP内网穿透 → 本地服务器 → ESP32
```

---

## 📝 具体实施步骤

### 如果你只需要局域网访问

**最简单的方法：**

1. 在你的电脑上运行：
```bash
cd web
npm start
```

2. 查看你的电脑IP：
```bash
# Windows
ipconfig

# 找到IPv4地址，例如：192.168.1.100
```

3. 在同一WiFi下的任何设备访问：
```
http://192.168.1.100:3001
```

4. 如果想让电脑关机后也能用，考虑：
   - 树莓派（200元左右）
   - 旧笔记本
   - NAS设备

---

### 如果你需要外网访问

**推荐使用Tailscale（最简单的外网访问方案）：**

1. 安装Tailscale
   - 电脑：https://tailscale.com/download
   - 手机：应用商店搜索Tailscale

2. 所有设备登录同一账号

3. 自动组成虚拟局域网

4. 在手机上访问电脑的局域网IP即可

**优点：**
- ✅ 配置超级简单
- ✅ 免费（个人使用）
- ✅ 安全加密
- ✅ 跨平台支持

---

## 🔧 修改Netlify部署的代码

如果你坚持使用Netlify，需要修改代码直接连接ESP32：

### 前提条件
- ESP32必须有公网地址（使用内网穿透）

### 修改步骤

1. **修改 app.js**
```javascript
// 将ESP32暴露到公网后的地址
const ESP32_PUBLIC_URL = 'https://你的ngrok地址.ngrok.io';

function getUrl(path) {
    return ESP32_PUBLIC_URL + path;
}
```

2. **ESP32添加CORS支持**

在ESP32代码中添加：
```cpp
server.sendHeader("Access-Control-Allow-Origin", "*");
server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
```

3. **使用Ngrok暴露ESP32**
```bash
# 假设ESP32在80端口
ngrok http 10.212.215.31:80
```

---

## 💡 总结

### Netlify不适合的原因
1. ❌ 不支持Node.js后端
2. ❌ 云端无法访问局域网设备
3. ❌ 需要ESP32有公网地址

### 推荐方案
1. ✅ **局域网使用：** 电脑/树莓派运行Node.js
2. ✅ **外网访问：** Tailscale虚拟局域网
3. ✅ **高级用户：** 云服务器 + FRP内网穿透

### 最简单的方案
```bash
# 在你的电脑上
cd web
npm start

# 局域网内访问
http://你的电脑IP:3001
```

---

## 📚 相关资源

- [Tailscale官网](https://tailscale.com/)
- [Ngrok官网](https://ngrok.com/)
- [Render.com](https://render.com/)
- [Railway.app](https://railway.app/)
- [FRP项目](https://github.com/fatedier/frp)

---

**建议：** 如果只是家里使用，直接在电脑或树莓派上运行就好，不需要部署到云端。

**版本：** v1.5.1  
**更新：** 2026-04-03  
**作者：** 冯有才
