// 检查登录状态
function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('username');
        window.location.href = 'login.html';
    }
}

// 切换IP配置面板
function toggleIpConfig() {
    const panel = document.getElementById('ipConfigPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        panel.classList.add('show');
        panel.classList.remove('hide');
    } else {
        panel.classList.add('hide');
        panel.classList.remove('show');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
}

// 跳转到电量使用记录页面
function goToEnergyHistory() {
    window.location.href = 'energy-history.html';
}

// 页面加载时检查登录
if (!checkLogin()) {
    // 未登录，会自动跳转到登录页
}

// ESP32 IP地址配置
let ESP32_IP = localStorage.getItem('esp32_ip') || '10.212.215.31';

// 更新输入框显示
document.getElementById('esp32IpInput').value = ESP32_IP;

// 保存IP配置
function saveIpConfig() {
    const newIp = document.getElementById('esp32IpInput').value.trim();
    if (newIp) {
        ESP32_IP = newIp;
        localStorage.setItem('esp32_ip', ESP32_IP);
        alert('✅ IP地址已保存：' + ESP32_IP + '\n\n页面将刷新以应用新配置');
        location.reload();
    } else {
        alert('❌ 请输入有效的IP地址');
    }
}

// 获取完整URL（通过Node.js代理）
function getUrl(path) {
    // 使用相对路径，由Node.js服务器代理到ESP32
    return '/api' + path;
}

// DOM元素
const sw = document.getElementById('sw1');
const status = document.getElementById('status1');
const outlet = document.getElementById('outlet1');
const timeEl = document.getElementById('time');
const ipEl = document.getElementById('ipInfo');
const connectionStatus = document.getElementById('connectionStatus');
const temp1El = document.getElementById('temp1');
const temp2El = document.getElementById('temp2');
const badge1El = document.getElementById('badge1');
const badge2El = document.getElementById('badge2');
const voltageEl = document.getElementById('voltage');
const currentEl = document.getElementById('current');
const powerEl = document.getElementById('power');
const energyEl = document.getElementById('energy');

// 状态变量
let lastTempWarning = 0;
let configLoaded = false;
let isConnected = false;

// 数据存储键名（与energy-history.js保持一致）
const STORAGE_KEY = 'energy_history_data';

// 保存数据到本地存储
function saveEnergyData(data) {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const history = stored ? JSON.parse(stored) : [];
        const now = new Date();
        
        // 添加新数据点
        history.push({
            timestamp: now.getTime(),
            date: now.toLocaleDateString('zh-CN'),
            time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            voltage: data.voltage,
            current: data.current,
            power: data.power,
            energy: data.energy,
            temp1: data.temp1,
            temp2: data.temp2
        });
        
        // 只保留最近30天的数据
        const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        const filtered = history.filter(item => item.timestamp > thirtyDaysAgo);
        
        // 保存到localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        
        console.log('💾 数据已保存，当前记录数:', filtered.length);
    } catch (error) {
        console.error('❌ 保存数据失败:', error);
    }
}

// 开关控制
sw.addEventListener('change', async function() {
    const on = this.checked;
    try {
        const r = await fetch(getUrl('/control?state=' + (on ? '1' : '0')));
        const d = await r.json();
        if (d.success) {
            status.textContent = on ? '已开启' : '已关闭';
            outlet.classList.toggle('active', on);
            updateTime();
        } else {
            alert('控制失败');
            this.checked = !on;
        }
    } catch (e) {
        console.error('控制错误:', e);
        alert('网络错误：' + e.message + '\n\n请检查：\n1. ESP32是否在线\n2. IP地址是否正确\n3. Node.js服务器是否运行');
        this.checked = !on;
    }
});

// 更新时间显示
function updateTime() {
    const n = new Date();
    timeEl.textContent = n.getHours().toString().padStart(2, '0') + ':' + 
                         n.getMinutes().toString().padStart(2, '0') + ':' + 
                         n.getSeconds().toString().padStart(2, '0');
}

// 更新温度显示
function updateTemp(el, badgeEl, temp, warn, crit) {
    el.textContent = temp.toFixed(1) + '°C';
    el.className = 'temp-value ';
    badgeEl.className = 'temp-badge ';
    
    if (temp >= crit) {
        el.className += 'critical';
        badgeEl.className += 'critical';
        badgeEl.textContent = '危险';
    } else if (temp >= warn) {
        el.className += 'warning';
        badgeEl.className += 'warning';
        badgeEl.textContent = '警告';
    } else {
        el.className += 'normal';
        badgeEl.className += 'normal';
        badgeEl.textContent = '正常';
    }
}

// 温度报警检查
function checkTempAlert(t1, t2, warn, crit) {
    const now = Date.now();
    if ((t1 >= crit || t2 >= crit) && now - lastTempWarning > 30000) {
        alert('⚠️ 危险！温度过高！\n传感器1: ' + t1.toFixed(1) + '°C\n传感器2: ' + t2.toFixed(1) + '°C\n\n请立即检查设备！');
        lastTempWarning = now;
    } else if ((t1 >= warn || t2 >= warn) && now - lastTempWarning > 60000) {
        alert('⚠️ 警告：温度偏高\n传感器1: ' + t1.toFixed(1) + '°C\n传感器2: ' + t2.toFixed(1) + '°C');
        lastTempWarning = now;
    }
}

// 获取设备状态
async function getStatus() {
    try {
        const r = await fetch(getUrl('/status'));
        const d = await r.json();
        
        // 更新连接状态
        if (!isConnected) {
            isConnected = true;
            connectionStatus.textContent = '在线';
            connectionStatus.style.color = '#4ade80';
            console.log('✅ 已连接到ESP32');
        }
        
        // 保存数据到历史记录
        saveEnergyData(d);
        
        // 更新开关状态
        sw.checked = d.relay_state;
        status.textContent = d.relay_state ? '已开启' : '已关闭';
        outlet.classList.toggle('active', d.relay_state);
        
        // 更新设备信息
        ipEl.textContent = d.ip || ESP32_IP;
        
        // 更新电能数据
        voltageEl.textContent = d.voltage.toFixed(1) + 'V';
        currentEl.textContent = d.current.toFixed(3) + 'A';
        powerEl.textContent = d.power.toFixed(1) + 'W';
        energyEl.textContent = (d.energy * 1000).toFixed(1) + 'Wh';
        
        // 更新温度数据
        updateTemp(temp1El, badge1El, d.temp1, d.temp_warning, d.temp_critical);
        updateTemp(temp2El, badge2El, d.temp2, d.temp_warning, d.temp_critical);
        checkTempAlert(d.temp1, d.temp2, d.temp_warning, d.temp_critical);
        
        // 加载配置（只加载一次）
        if (!configLoaded && d.energy_saving_enabled !== undefined) {
            const energyToggle = document.getElementById('energySavingToggle');
            const timerToggle = document.getElementById('timerToggle');
            const safetyToggle = document.getElementById('safetyToggle');
            
            // 设置开关状态
            energyToggle.checked = d.energy_saving_enabled;
            timerToggle.checked = d.timer_enabled;
            safetyToggle.checked = d.safety_mode_enabled;
            
            // 设置其他配置值
            document.getElementById('powerThreshold').value = d.power_threshold;
            document.getElementById('lowPowerDuration').value = d.low_power_duration;
            document.getElementById('timerHour').value = d.timer_hour;
            document.getElementById('timerMinute').value = d.timer_minute;
            document.getElementById('timerAction').value = d.timer_action ? 'on' : 'off';
            document.getElementById('safetyLimit').value = d.safety_power_limit;
            
            configLoaded = true;
            console.log('✅ 配置已加载:', {
                energySaving: d.energy_saving_enabled,
                timer: d.timer_enabled,
                safety: d.safety_mode_enabled
            });
        }
        
        updateTime();
    } catch (e) {
        // 更新连接状态
        if (isConnected) {
            isConnected = false;
            connectionStatus.textContent = '离线';
            connectionStatus.style.color = '#ef4444';
            console.error('❌ 连接失败:', e);
        }
    }
}

// 保存节能配置
async function saveEnergyConfig() {
    const enabled = document.getElementById('energySavingToggle').checked;
    const threshold = document.getElementById('powerThreshold').value;
    const duration = document.getElementById('lowPowerDuration').value;
    const params = 'energy_saving=' + enabled + '&threshold=' + threshold + '&duration=' + duration;
    
    try {
        const r = await fetch(getUrl('/config'), {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        });
        const d = await r.json();
        if (d.status === 'ok') {
            alert('✅ 配置已保存！\n\n节能模式：' + (enabled ? '开启' : '关闭') + 
                  '\n功率阈值：' + threshold + 'W\n持续时间：' + duration + '秒');
        } else {
            alert('❌ 保存失败');
        }
    } catch (e) {
        alert('❌ 网络错误：' + e.message);
    }
}

// 保存定时配置
async function saveTimerConfig() {
    const enabled = document.getElementById('timerToggle').checked;
    const hour = document.getElementById('timerHour').value;
    const minute = document.getElementById('timerMinute').value;
    const action = document.getElementById('timerAction').value;
    const params = 'timer_enabled=' + enabled + '&timer_hour=' + hour + '&timer_minute=' + minute + '&timer_action=' + action;
    
    try {
        const r = await fetch(getUrl('/config'), {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        });
        const d = await r.json();
        if (d.status === 'ok') {
            alert('✅ 定时已设置！\n\n时间：' + hour.padStart(2, '0') + ':' + minute.padStart(2, '0') + 
                  '\n动作：' + (action === 'on' ? '开启' : '关闭') + 
                  '\n状态：' + (enabled ? '已启用' : '已禁用'));
        } else {
            alert('❌ 保存失败');
        }
    } catch (e) {
        alert('❌ 网络错误：' + e.message);
    }
}

// 保存安全配置
async function saveSafetyConfig() {
    const enabled = document.getElementById('safetyToggle').checked;
    const limit = document.getElementById('safetyLimit').value;
    const params = 'safety_mode=' + enabled + '&safety_limit=' + limit;
    
    try {
        const r = await fetch(getUrl('/config'), {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: params
        });
        const d = await r.json();
        if (d.status === 'ok') {
            alert('✅ 安全模式已配置！\n\n过载保护：' + (enabled ? '开启' : '关闭') + 
                  '\n功率上限：' + limit + 'W');
        } else {
            alert('❌ 保存失败');
        }
    } catch (e) {
        alert('❌ 网络错误：' + e.message);
    }
}

// 每2秒更新一次状态
setInterval(getStatus, 2000);

// 页面加载时立即获取状态
window.addEventListener('load', () => {
    console.log('🚀 智能插排控制面板已加载');
    console.log('📡 ESP32 IP:', ESP32_IP);
    getStatus();
    updateTime();
});
