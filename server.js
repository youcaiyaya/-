const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;

// 从环境变量或配置文件读取ESP32 IP
const ESP32_IP = process.env.ESP32_IP || '10.212.215.31';

console.log('========================================');
console.log('🚀 智能插排控制服务器');
console.log('========================================');
console.log('📡 ESP32 IP:', ESP32_IP);
console.log('🌐 服务器端口:', PORT);
console.log('========================================');

// 静态文件服务
app.use(express.static(__dirname));

// 根路径重定向到登录页
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// 代理API请求到ESP32（解决CORS跨域问题）
app.get('/api/*', async (req, res) => {
    const path = req.path.replace('/api', '');
    const esp32Url = `http://${ESP32_IP}${path}`;
    
    console.log(`📤 代理请求: ${path} -> ${esp32Url}`);
    
    try {
        const response = await axios.get(esp32Url, {
            timeout: 5000,
            params: req.query
        });
        
        console.log(`✅ 响应成功: ${path}`);
        res.json(response.data);
    } catch (error) {
        console.error(`❌ 请求失败: ${path}`, error.message);
        res.status(500).json({
            error: '无法连接到ESP32',
            message: error.message,
            esp32_ip: ESP32_IP
        });
    }
});

// 代理POST请求到ESP32
app.post('/api/*', express.urlencoded({ extended: true }), async (req, res) => {
    const path = req.path.replace('/api', '');
    const esp32Url = `http://${ESP32_IP}${path}`;
    
    console.log(`📤 代理POST请求: ${path} -> ${esp32Url}`);
    console.log('📦 数据:', req.body);
    
    try {
        const response = await axios.post(esp32Url, req.body, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log(`✅ 响应成功: ${path}`);
        res.json(response.data);
    } catch (error) {
        console.error(`❌ 请求失败: ${path}`, error.message);
        res.status(500).json({
            error: '无法连接到ESP32',
            message: error.message,
            esp32_ip: ESP32_IP
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('✅ 服务器启动成功！');
    console.log('========================================');
    console.log(`🌐 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 局域网访问: http://[你的电脑IP]:${PORT}`);
    console.log('');
    console.log('📡 ESP32地址:', ESP32_IP);
    console.log('');
    console.log('💡 提示：');
    console.log('   - 按 Ctrl+C 停止服务器');
    console.log('   - 修改 ESP32_IP 环境变量可更改目标设备');
    console.log('========================================');
    console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n========================================');
    console.log('👋 服务器正在关闭...');
    console.log('========================================\n');
    process.exit(0);
});
