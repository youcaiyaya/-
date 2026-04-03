// PM2 配置文件
// 使用方法: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'smart-power-control',
    script: './server.js',
    
    // 实例数量
    instances: 1,
    
    // 自动重启
    autorestart: true,
    
    // 监听文件变化（开发模式）
    watch: false,
    
    // 最大内存限制
    max_memory_restart: '200M',
    
    // 环境变量
    env: {
      NODE_ENV: 'production',
      ESP32_IP: '10.212.215.31',
      PORT: 3000
    },
    
    // 开发环境变量
    env_development: {
      NODE_ENV: 'development',
      ESP32_IP: '10.212.215.31',
      PORT: 3000,
      watch: true
    },
    
    // 日志配置
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 合并日志
    merge_logs: true,
    
    // 时间戳
    time: true
  }]
};
