@echo off
chcp 65001 >nul
echo =========================================
echo 🚀 智能插排控制系统 - Ngrok快速启动
echo =========================================
echo.

echo 📝 使用说明：
echo    1. 确保已安装Ngrok并配置token
echo    2. 此脚本会同时启动Node.js服务器和Ngrok
echo    3. 获取公网地址后分享给任何人
echo.
echo =========================================
echo.

echo 🔍 检查Ngrok是否安装...
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Ngrok
    echo.
    echo 📥 请先安装Ngrok：
    echo    1. 访问 https://ngrok.com/download
    echo    2. 下载Windows版本
    echo    3. 解压到系统PATH目录
    echo    4. 运行: ngrok config add-authtoken 你的token
    echo.
    pause
    exit /b 1
)

echo ✅ Ngrok已安装
echo.

echo 🚀 启动Node.js服务器...
start "Smart Power Server" cmd /c "D:\Node\node.exe server.js"
timeout /t 3 >nul

echo 🌐 启动Ngrok内网穿透...
echo.
echo =========================================
echo 📋 获取公网地址后，复制Forwarding地址
echo    例如: https://xxxx.ngrok-free.app
echo =========================================
echo.

ngrok http 3000

pause
