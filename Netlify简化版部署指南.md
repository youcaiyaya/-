# 🚀 Netlify简化版部署指南

## 📋 问题说明

Netlify是静态网站托管，不支持Node.js后端。要在Netlify上运行，需要：

1. 去掉Node.js服务器依赖
2. 前端直接连接ESP32
3. ESP32需要支持CORS

---

## ⚡ 快速解决方案

### 方案1：使用Ngrok暴露ESP32（推荐测试）

**步骤：**

1. **下载并启动Ngrok**
```bash
# 下载: https://ngrok.com/download
# 假设ESP32在80端口
ngrok http 10.212.215.31:80
```

2. **获取公网地址**
```
Forwarding: https://xxxx-xx-xx.ngrok.io -> http://10.212.215.31:80
```

3. **修改前端代码**

修改 `app.js`：
```javascript
// 第1行附近，修改ESP32地址
const ESP32_IP = 'xxxx-xx-xx.ngrok.io';  // 你的ngrok地址（不要http://）

// 修改getUrl函数
function getUrl(path) {
    return 'https://' + ESP32_IP + path;  // 使用https
}
```

修改 `energy-history.js`：
```javascript
// 第15行附近
const ESP32_IP = 'xxxx-xx-xx.ngrok.io';

// 第20行附近
function getUrl(path) {
    return 'https://' + ESP32_IP + path;
}
```

4. **重新部署到Netlify**

---

### 方案2：本地运行（最简单）

**不部署到Netlify，直接在本地运行：**

```bash
cd web
npm start
```

在局域网内访问：`http://你的电脑IP:3001`

---

## 🔧 ESP32 CORS配置

如果ESP32不支持CORS，需要修改ESP32代码：

```cpp
// 在ESP32的每个HTTP响应中添加
server.sendHeader("Access-Control-Allow-Origin", "*");
server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

// 处理OPTIONS预检请求
server.on("/status", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(200);
});
```

---

## 📝 完整修改步骤

### 1. 修改 app.js

找到这些行并修改：

```javascript
// 原来的代码（第1-2行）
const ESP32_IP = localStorage.getItem('esp32_ip') || '10.212.215.31';
document.getElementById('esp32Ip').value = ESP32_IP;

// 修改为
const ESP32_IP = 'xxxx-xx-xx.ngrok.io';  // 你的ngrok地址
// 删除或注释掉IP配置相关代码

// 原来的getUrl函数（第5-7行）
function getUrl(path) {
    return '/api' + path;
}

// 修改为
function getUrl(path) {
    return 'https://' + ESP32_IP + path;
}
```

### 2. 修改 energy-history.js

```javascript
// 第15行附近
const ESP32_IP = 'xxxx-xx-xx.ngrok.io';

// 第20行附近
function getUrl(path) {
    return 'https://' + ESP32_IP + path;
}
```

### 3. 修改 login.js（如果有IP配置）

删除或注释掉IP配置相关代码。

---

## 🎯 推荐方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **本地运行** | 最简单、免费 | 只能局域网访问 | 家庭使用 |
| **Ngrok** | 可外网访问 | 免费版不稳定 | 临时测试 |
| **Tailscale** | 稳定、安全 | 需要安装客户端 | 个人使用 |
| **云服务器** | 完全控制 | 需要付费 | 商业使用 |

---

## 💡 最佳建议

### 如果只是自己用
→ **直接在电脑/树莓派上运行**
```bash
cd web
npm start
```

### 如果需要外网访问
→ **使用Tailscale**（最简单的外网方案）

### 如果要给别人演示
→ **使用Ngrok临时暴露**

---

## ⚠️ 重要提示

1. **Ngrok免费版限制**
   - 每次重启地址会变
   - 需要重新修改代码
   - 有连接数限制

2. **安全性**
   - 暴露到公网有安全风险
   - 建议添加密码保护
   - 不要暴露敏感信息

3. **稳定性**
   - Ngrok可能断线
   - 需要重新启动
   - 不适合长期使用

---

## 📞 需要帮助？

如果你告诉我：
1. 你的使用场景（只在家用？需要外网访问？）
2. 你的技术水平（新手？有经验？）
3. 你的预算（免费？可以付费？）

我可以给你更具体的建议！

---

**版本：** v1.5.1  
**更新：** 2026-04-03  
**作者：** 冯有才
