#!/bin/bash

# 智能插排控制系统 - 服务器部署脚本
# 适用于Ubuntu 20.04/22.04

echo "========================================="
echo "🚀 智能插排控制系统 - 自动部署脚本"
echo "========================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用root权限运行此脚本"
    echo "   sudo bash deploy-server.sh"
    exit 1
fi

echo "📦 步骤1：更新系统..."
apt update && apt upgrade -y

echo ""
echo "📦 步骤2：安装Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "✅ Node.js安装完成"
else
    echo "✅ Node.js已安装: $(node --version)"
fi

echo ""
echo "📦 步骤3：安装PM2进程管理器..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo "✅ PM2安装完成"
else
    echo "✅ PM2已安装"
fi

echo ""
echo "📦 步骤4：安装项目依赖..."
npm install
echo "✅ 依赖安装完成"

echo ""
echo "📦 步骤5：配置防火墙..."
if command -v ufw &> /dev/null; then
    ufw allow 3000
    echo "✅ 已开放3000端口"
fi

echo ""
echo "🚀 步骤6：启动服务..."
pm2 start server.js --name smart-power
pm2 save
pm2 startup

echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo ""
echo "📊 服务状态："
pm2 status

echo ""
echo "🌐 访问地址："
echo "   http://$(curl -s ifconfig.me):3000"
echo ""
echo "💡 常用命令："
echo "   pm2 status              - 查看服务状态"
echo "   pm2 logs smart-power    - 查看日志"
echo "   pm2 restart smart-power - 重启服务"
echo "   pm2 stop smart-power    - 停止服务"
echo ""
echo "📚 完整文档："
echo "   查看 公网部署完整指南.md"
echo ""
echo "========================================="
