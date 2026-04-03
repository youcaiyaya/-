@echo off
chcp 65001 >nul
echo ========================================
echo 智能插排控制面板 - 启动脚本
echo ========================================
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误：未检测到Node.js
    echo.
    echo 请先安装Node.js：
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js版本：
node --version
echo.

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    echo.
    call npm install
    echo.
)

REM 设置ESP32 IP地址（可修改）
set ESP32_IP=10.212.215.31

echo ========================================
echo 🚀 启动服务器...
echo ========================================
echo 📡 ESP32 IP: %ESP32_IP%
echo.

REM 启动服务器
node server.js

pause
