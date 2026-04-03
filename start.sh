#!/bin/bash

echo "========================================"
echo "智能插排控制面板 - 启动脚本"
echo "========================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到Node.js"
    echo ""
    echo "请先安装Node.js："
    echo "https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✅ Node.js版本："
node --version
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    echo ""
    npm install
    echo ""
fi

# 设置ESP32 IP地址（可修改）
export ESP32_IP=10.212.215.31

echo "========================================"
echo "🚀 启动服务器..."
echo "========================================"
echo "📡 ESP32 IP: $ESP32_IP"
echo ""

# 启动服务器
node server.js
