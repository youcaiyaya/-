// 检查登录状态
function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 页面加载时检查登录
if (!checkLogin()) {
    // 未登录，会自动跳转到登录页
}

// 返回主页
function goBack() {
    window.location.href = 'index.html';
}

// ESP32 IP地址
const ESP32_IP = localStorage.getItem('esp32_ip') || '10.212.215.31';
document.getElementById('deviceIp').textContent = ESP32_IP;

// 获取完整URL（通过Node.js代理）
function getUrl(path) {
    return '/api' + path;
}

// 图表实例
let energyChart = null;
let currentTimeRange = 'day';
let currentChartType = 'line';

// 数据存储键名
const STORAGE_KEY = 'energy_history_data';
const LAST_UPDATE_KEY = 'energy_last_update';

// 获取存储的历史数据
function getStoredData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('解析存储数据失败:', e);
            return [];
        }
    }
    return [];
}

// 保存数据到本地存储
function saveDataPoint(data) {
    const history = getStoredData();
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
    localStorage.setItem(LAST_UPDATE_KEY, now.getTime().toString());
    
    console.log('✅ 数据已保存，当前记录数:', filtered.length);
}

// 从ESP32获取实时数据
async function fetchRealTimeData() {
    try {
        const response = await fetch(getUrl('/status'));
        const data = await response.json();
        
        // 保存数据点
        saveDataPoint(data);
        
        return data;
    } catch (error) {
        console.error('❌ 获取数据失败:', error);
        return null;
    }
}

// 处理历史数据用于图表显示
function processDataForChart(range) {
    const history = getStoredData();
    const now = new Date();
    
    if (history.length === 0) {
        return { labels: [], data: [] };
    }
    
    let labels = [];
    let data = [];
    
    if (range === 'day') {
        // 今日数据：按小时分组
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayData = history.filter(item => item.timestamp >= todayStart);
        
        // 创建24小时的数据桶
        const hourlyData = new Array(24).fill(0);
        const hourlyCounts = new Array(24).fill(0);
        
        todayData.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            hourlyData[hour] += item.energy * 1000; // 转换为Wh
            hourlyCounts[hour]++;
        });
        
        // 生成标签和数据（每4小时一个点）
        for (let i = 0; i < 24; i += 4) {
            labels.push(i.toString().padStart(2, '0') + ':00');
            const avgEnergy = hourlyCounts[i] > 0 ? hourlyData[i] / hourlyCounts[i] : 0;
            data.push(avgEnergy);
        }
        labels.push('23:59');
        const lastAvg = hourlyCounts[23] > 0 ? hourlyData[23] / hourlyCounts[23] : 0;
        data.push(lastAvg);
        
    } else if (range === 'week') {
        // 本周数据：按天分组
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        const weekData = history.filter(item => item.timestamp >= weekStart);
        
        const dailyData = {};
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        weekData.forEach(item => {
            const date = new Date(item.timestamp);
            const dayKey = date.toLocaleDateString('zh-CN');
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = { total: 0, count: 0, dayOfWeek: date.getDay() };
            }
            dailyData[dayKey].total += item.energy * 1000;
            dailyData[dayKey].count++;
        });
        
        // 生成最近7天的数据
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayKey = date.toLocaleDateString('zh-CN');
            const dayOfWeek = date.getDay();
            
            labels.push(weekDays[dayOfWeek]);
            if (dailyData[dayKey]) {
                data.push(dailyData[dayKey].total / dailyData[dayKey].count);
            } else {
                data.push(0);
            }
        }
        
    } else if (range === 'month') {
        // 本月数据：按日期分组
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthData = history.filter(item => item.timestamp >= monthStart);
        
        const dailyData = {};
        
        monthData.forEach(item => {
            const date = new Date(item.timestamp);
            const dayKey = date.getDate();
            if (!dailyData[dayKey]) {
                dailyData[dayKey] = { total: 0, count: 0 };
            }
            dailyData[dayKey].total += item.energy * 1000;
            dailyData[dayKey].count++;
        });
        
        // 生成本月的数据（每5天一个点）
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 5) {
            labels.push(day + '日');
            if (dailyData[day]) {
                data.push(dailyData[day].total / dailyData[day].count);
            } else {
                data.push(0);
            }
        }
        // 添加最后一天
        if (daysInMonth % 5 !== 0) {
            labels.push(daysInMonth + '日');
            if (dailyData[daysInMonth]) {
                data.push(dailyData[daysInMonth].total / dailyData[daysInMonth].count);
            } else {
                data.push(0);
            }
        }
    }
    
    return { labels, data };
}

// 初始化图表
function initChart() {
    const ctx = document.getElementById('energyChart').getContext('2d');
    const chartData = processDataForChart(currentTimeRange);
    
    // 销毁旧图表
    if (energyChart) {
        energyChart.destroy();
    }
    
    // 创建新图表
    energyChart = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: chartData.labels,
            datasets: [{
                label: '用电量 (Wh)',
                data: chartData.data,
                backgroundColor: currentChartType === 'bar' 
                    ? 'rgba(102, 126, 234, 0.6)'
                    : 'rgba(102, 126, 234, 0.1)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(102, 126, 234, 1)',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#667eea',
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(102, 126, 234, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '用电量: ' + context.parsed.y.toFixed(2) + ' Wh';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(102, 126, 234, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#999',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value.toFixed(1) + ' Wh';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#999',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// 切换时间范围
function changeTimeRange(range) {
    currentTimeRange = range;
    
    // 更新按钮状态
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === range) {
            btn.classList.add('active');
        }
    });
    
    // 重新初始化图表
    initChart();
    
    // 更新统计数据
    updateStats();
    
    // 更新记录列表
    updateRecords();
}

// 切换图表类型
function changeChartType(type) {
    currentChartType = type;
    
    // 更新按钮状态
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });
    
    // 重新初始化图表
    initChart();
}

// 更新统计数据
function updateStats() {
    const history = getStoredData();
    const now = new Date();
    
    if (history.length === 0) {
        document.getElementById('todayEnergy').textContent = '0.0';
        document.getElementById('weekEnergy').textContent = '0.00';
        document.getElementById('monthEnergy').textContent = '0.00';
        document.getElementById('totalCost').textContent = '0.00';
        return;
    }
    
    // 今日数据
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayData = history.filter(item => item.timestamp >= todayStart);
    const todayEnergy = todayData.reduce((sum, item) => sum + item.energy * 1000, 0);
    
    // 本周数据
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const weekData = history.filter(item => item.timestamp >= weekStart);
    const weekEnergy = weekData.reduce((sum, item) => sum + item.energy * 1000, 0);
    
    // 本月数据
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthData = history.filter(item => item.timestamp >= monthStart);
    const monthEnergy = monthData.reduce((sum, item) => sum + item.energy * 1000, 0);
    
    // 计算费用（使用自定义电价）
    const price = getElectricityPrice();
    const totalCost = (monthEnergy / 1000) * price;
    
    // 更新显示
    document.getElementById('todayEnergy').textContent = todayEnergy.toFixed(1);
    document.getElementById('weekEnergy').textContent = (weekEnergy / 1000).toFixed(2);
    document.getElementById('monthEnergy').textContent = (monthEnergy / 1000).toFixed(2);
    document.getElementById('totalCost').textContent = totalCost.toFixed(2);
    
    console.log('📊 统计数据已更新:', {
        today: todayEnergy.toFixed(1) + 'Wh',
        week: (weekEnergy / 1000).toFixed(2) + 'kWh',
        month: (monthEnergy / 1000).toFixed(2) + 'kWh',
        cost: totalCost.toFixed(2) + '元'
    });
}

// 更新记录列表
function updateRecords() {
    const recordsList = document.getElementById('recordsList');
    recordsList.innerHTML = '';
    
    const history = getStoredData();
    
    if (history.length === 0) {
        recordsList.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无数据记录</div>';
        return;
    }
    
    // 根据时间范围筛选记录
    const now = new Date();
    let filteredRecords = [];
    
    if (currentTimeRange === 'day') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        filteredRecords = history.filter(item => item.timestamp >= todayStart);
    } else if (currentTimeRange === 'week') {
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        filteredRecords = history.filter(item => item.timestamp >= weekStart);
    } else {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        filteredRecords = history.filter(item => item.timestamp >= monthStart);
    }
    
    // 按时间倒序排列，只显示最近20条
    filteredRecords.sort((a, b) => b.timestamp - a.timestamp);
    const displayRecords = filteredRecords.slice(0, 20);
    
    const icons = ['⚡', '💡', '🔋', '⚙️', '🔌'];
    
    displayRecords.forEach((record, index) => {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        
        // 计算使用时长（假设每条记录间隔5分钟）
        const duration = '5分钟';
        
        recordItem.innerHTML = `
            <div class="record-time">
                <div class="record-icon">${icons[index % icons.length]}</div>
                <div class="record-datetime">
                    <div class="record-date">${record.date}</div>
                    <div class="record-time-text">${record.time}</div>
                </div>
            </div>
            <div class="record-data">
                <div class="record-value">
                    <div class="record-value-number">${(record.energy * 1000).toFixed(2)}</div>
                    <div class="record-value-label">用电量(Wh)</div>
                </div>
                <div class="record-value">
                    <div class="record-value-number">${record.power.toFixed(1)}</div>
                    <div class="record-value-label">功率(W)</div>
                </div>
                <div class="record-value">
                    <div class="record-value-number">${record.voltage.toFixed(1)}V</div>
                    <div class="record-value-label">电压</div>
                </div>
                <div class="record-value">
                    <div class="record-value-number">${record.current.toFixed(3)}A</div>
                    <div class="record-value-label">电流</div>
                </div>
            </div>
        `;
        recordsList.appendChild(recordItem);
    });
    
    console.log('📋 记录列表已更新，显示', displayRecords.length, '条记录');
}

// 生成模拟记录（已删除，不再需要）

// 页面加载时初始化
window.addEventListener('load', async () => {
    console.log('📊 电量使用记录页面已加载');
    console.log('📡 ESP32 IP:', ESP32_IP);
    
    // 先从ESP32获取最新数据
    console.log('🔄 正在获取最新数据...');
    await fetchRealTimeData();
    
    // 初始化图表
    initChart();
    
    // 更新统计数据
    updateStats();
    
    // 更新记录列表
    updateRecords();
    
    console.log('✅ 页面初始化完成');
});

// 定期更新数据（每5分钟从ESP32获取一次新数据）
setInterval(async () => {
    console.log('🔄 定时更新数据...');
    await fetchRealTimeData();
    updateStats();
    updateRecords();
    initChart(); // 重新绘制图表
}, 5 * 60 * 1000); // 5分钟

// 每30秒刷新显示（不获取新数据，只更新显示）
setInterval(() => {
    updateStats();
    updateRecords();
}, 30000);

// ========== 电价设置功能 ==========

// 获取电价设置
function getElectricityPrice() {
    const stored = localStorage.getItem('electricity_price');
    return stored ? parseFloat(stored) : 0.6; // 默认0.6元/kWh
}

// 切换设置面板
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        // 加载当前电价
        document.getElementById('electricityPrice').value = getElectricityPrice();
    } else {
        panel.style.display = 'none';
    }
}

// 保存设置
function saveSettings() {
    const priceInput = document.getElementById('electricityPrice');
    const price = parseFloat(priceInput.value);
    
    if (isNaN(price) || price < 0 || price > 10) {
        alert('❌ 请输入有效的电价（0-10元/kWh）');
        return;
    }
    
    // 保存到localStorage
    localStorage.setItem('electricity_price', price.toString());
    
    // 更新底部提示
    document.querySelector('.footer-info p:first-child').textContent = 
        `💡 电价按${price}元/kWh计算`;
    
    // 重新计算统计数据
    updateStats();
    
    // 显示成功提示
    alert(`✅ 电价已更新为 ${price} 元/kWh`);
    
    console.log('💾 电价设置已保存:', price);
}

// 页面加载时应用电价设置
window.addEventListener('load', () => {
    const price = getElectricityPrice();
    document.querySelector('.footer-info p:first-child').textContent = 
        `💡 电价按${price}元/kWh计算`;
});

// ========== AI智能助手功能 ==========

let aiExpanded = false;

// 切换AI助手
function toggleAI() {
    const content = document.getElementById('aiContent');
    const btn = document.getElementById('aiToggleBtn');
    
    aiExpanded = !aiExpanded;
    
    if (aiExpanded) {
        content.style.display = 'block';
        btn.textContent = '收起';
        // 生成智能分析
        generateAIInsights();
    } else {
        content.style.display = 'none';
        btn.textContent = '展开';
    }
}

// 生成AI智能分析
function generateAIInsights() {
    const insightsDiv = document.getElementById('aiInsights');
    const history = getStoredData();
    
    if (history.length === 0) {
        insightsDiv.innerHTML = '<div class="insight-loading">📊 暂无数据，无法生成分析</div>';
        return;
    }
    
    const now = new Date();
    
    // 计算今日和昨日数据
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    
    const todayData = history.filter(item => item.timestamp >= todayStart);
    const yesterdayData = history.filter(item => 
        item.timestamp >= yesterdayStart && item.timestamp < todayStart
    );
    
    const todayEnergy = todayData.reduce((sum, item) => sum + item.energy * 1000, 0);
    const yesterdayEnergy = yesterdayData.reduce((sum, item) => sum + item.energy * 1000, 0);
    
    // 计算本周数据
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const weekData = history.filter(item => item.timestamp >= weekStart);
    const weekEnergy = weekData.reduce((sum, item) => sum + item.energy * 1000, 0);
    const avgDailyEnergy = weekEnergy / 7;
    
    // 计算平均功率
    const avgPower = todayData.length > 0 
        ? todayData.reduce((sum, item) => sum + item.power, 0) / todayData.length 
        : 0;
    
    // 找出用电高峰时段
    const hourlyPower = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    todayData.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        hourlyPower[hour] += item.power;
        hourlyCounts[hour]++;
    });
    
    let peakHour = 0;
    let peakPower = 0;
    for (let i = 0; i < 24; i++) {
        if (hourlyCounts[i] > 0) {
            const avgHourPower = hourlyPower[i] / hourlyCounts[i];
            if (avgHourPower > peakPower) {
                peakPower = avgHourPower;
                peakHour = i;
            }
        }
    }
    
    // 生成分析结果
    let insights = [];
    
    // 1. 用电趋势分析
    if (yesterdayEnergy > 0) {
        const change = ((todayEnergy - yesterdayEnergy) / yesterdayEnergy * 100).toFixed(1);
        if (Math.abs(change) < 5) {
            insights.push({
                icon: '📊',
                text: `用电趋势<span class="insight-highlight">稳定</span>，今日用电与昨日基本持平（${change > 0 ? '+' : ''}${change}%）`
            });
        } else if (change > 0) {
            insights.push({
                icon: '📈',
                text: `用电量<span class="insight-highlight">上升</span>，今日比昨日增加<span class="insight-highlight">${change}%</span>，请注意节能`
            });
        } else {
            insights.push({
                icon: '📉',
                text: `用电量<span class="insight-highlight">下降</span>，今日比昨日减少<span class="insight-highlight">${Math.abs(change)}%</span>，节能效果显著！`
            });
        }
    }
    
    // 2. 用电高峰分析
    if (peakPower > 0) {
        insights.push({
            icon: '⏰',
            text: `用电高峰在<span class="insight-highlight">${peakHour}:00-${peakHour+1}:00</span>，平均功率<span class="insight-highlight">${peakPower.toFixed(1)}W</span>`
        });
    }
    
    // 3. 节能建议
    if (avgPower > 100) {
        insights.push({
            icon: '💡',
            text: `当前平均功率<span class="insight-highlight">${avgPower.toFixed(1)}W</span>，建议关闭不必要的电器以节省电费`
        });
    } else if (avgPower > 50) {
        insights.push({
            icon: '✅',
            text: `当前平均功率<span class="insight-highlight">${avgPower.toFixed(1)}W</span>，用电较为合理`
        });
    } else {
        insights.push({
            icon: '🌟',
            text: `当前平均功率<span class="insight-highlight">${avgPower.toFixed(1)}W</span>，节能表现优秀！`
        });
    }
    
    // 4. 费用预测
    const price = getElectricityPrice();
    const predictedMonthCost = (avgDailyEnergy * 30 / 1000) * price;
    insights.push({
        icon: '💰',
        text: `按当前用电水平，预计本月电费约<span class="insight-highlight">${predictedMonthCost.toFixed(2)}元</span>`
    });
    
    // 5. 温度监测
    if (todayData.length > 0) {
        const latestData = todayData[todayData.length - 1];
        const maxTemp = Math.max(latestData.temp1, latestData.temp2);
        if (maxTemp > 60) {
            insights.push({
                icon: '🔥',
                text: `<span class="insight-highlight">温度警告</span>：当前温度${maxTemp.toFixed(1)}°C，请注意散热！`
            });
        } else if (maxTemp > 45) {
            insights.push({
                icon: '🌡️',
                text: `温度正常：当前${maxTemp.toFixed(1)}°C，设备运行良好`
            });
        }
    }
    
    // 渲染分析结果
    insightsDiv.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-text">${insight.text}</span>
        </div>
    `).join('');
    
    console.log('🤖 AI分析已生成，共', insights.length, '条建议');
}

// 发送AI消息
async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // 添加用户消息
    const messagesDiv = document.getElementById('aiChatMessages');
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.innerHTML = `
        <div class="user-avatar">👤</div>
        <div class="user-text">${message}</div>
    `;
    messagesDiv.appendChild(userMsg);
    
    // 清空输入框
    input.value = '';
    
    // 滚动到底部
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 添加加载提示
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message';
    loadingMsg.id = 'loadingMsg';
    loadingMsg.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-text">正在思考中...</div>
    `;
    messagesDiv.appendChild(loadingMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 调用DeepSeek API获取回复
    try {
        const aiResponse = await getAIResponse(message);
        
        // 移除加载提示
        loadingMsg.remove();
        
        // 添加AI回复
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message';
        aiMsg.innerHTML = `
            <div class="ai-avatar">🤖</div>
            <div class="ai-text">${aiResponse}</div>
        `;
        messagesDiv.appendChild(aiMsg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('发送消息失败:', error);
        loadingMsg.querySelector('.ai-text').textContent = '抱歉，AI暂时无法回复，请稍后再试。';
    }
}

// 处理回车键
function handleAIEnter(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-fe85940779074f558d36263e583f5149';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 获取用电数据上下文
function getEnergyContext() {
    const history = getStoredData();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    const todayData = history.filter(item => item.timestamp >= todayStart);
    const yesterdayData = history.filter(item => item.timestamp >= yesterdayStart && item.timestamp < todayStart);
    const weekData = history.filter(item => item.timestamp >= weekStart);
    const monthData = history.filter(item => item.timestamp >= monthStart);
    
    const todayEnergy = todayData.reduce((sum, item) => sum + item.energy * 1000, 0);
    const yesterdayEnergy = yesterdayData.reduce((sum, item) => sum + item.energy * 1000, 0);
    const weekEnergy = weekData.reduce((sum, item) => sum + item.energy * 1000, 0);
    const monthEnergy = monthData.reduce((sum, item) => sum + item.energy * 1000, 0);
    
    const avgPower = todayData.length > 0 
        ? todayData.reduce((sum, item) => sum + item.power, 0) / todayData.length 
        : 0;
    
    const price = getElectricityPrice();
    
    // 获取最新温度
    let currentTemp = 0;
    if (todayData.length > 0) {
        const latest = todayData[todayData.length - 1];
        currentTemp = Math.max(latest.temp1, latest.temp2);
    }
    
    // 计算用电高峰
    const hourlyPower = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    todayData.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        hourlyPower[hour] += item.power;
        hourlyCounts[hour]++;
    });
    
    let peakHour = 0;
    let peakPower = 0;
    for (let i = 0; i < 24; i++) {
        if (hourlyCounts[i] > 0) {
            const avgHourPower = hourlyPower[i] / hourlyCounts[i];
            if (avgHourPower > peakPower) {
                peakPower = avgHourPower;
                peakHour = i;
            }
        }
    }
    
    return {
        todayEnergy: todayEnergy.toFixed(1),
        yesterdayEnergy: yesterdayEnergy.toFixed(1),
        weekEnergy: (weekEnergy / 1000).toFixed(2),
        monthEnergy: (monthEnergy / 1000).toFixed(2),
        avgPower: avgPower.toFixed(1),
        currentTemp: currentTemp.toFixed(1),
        peakHour: peakHour,
        peakPower: peakPower.toFixed(1),
        price: price,
        predictedCost: ((weekEnergy * 30 / 7 / 1000) * price).toFixed(2),
        dataPoints: history.length
    };
}

// 调用DeepSeek API获取AI回复
async function getAIResponse(message) {
    const context = getEnergyContext();
    
    // 构建系统提示词
    const systemPrompt = `你是一个智能用电助手，帮助用户分析用电情况、提供节能建议。

当前用电数据：
- 今日用电量：${context.todayEnergy}Wh
- 昨日用电量：${context.yesterdayEnergy}Wh
- 本周用电量：${context.weekEnergy}kWh
- 本月用电量：${context.monthEnergy}kWh
- 当前平均功率：${context.avgPower}W
- 当前温度：${context.currentTemp}°C
- 用电高峰时段：${context.peakHour}:00-${context.peakHour+1}:00（平均${context.peakPower}W）
- 电价：${context.price}元/kWh
- 预计本月电费：${context.predictedCost}元
- 历史数据点数：${context.dataPoints}条

请根据以上数据回答用户问题，提供专业、实用的建议。回答要简洁明了，使用emoji图标增强可读性。`;

    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }

        const data = await response.json();
        const aiReply = data.choices[0].message.content;
        
        console.log('🤖 DeepSeek AI回复:', aiReply);
        return aiReply;
        
    } catch (error) {
        console.error('❌ DeepSeek API调用失败:', error);
        
        // 降级到本地回复
        return getFallbackResponse(message, context);
    }
}

// 降级回复（当API调用失败时使用）
function getFallbackResponse(message, context) {
    const msg = message.toLowerCase();
    
    if (msg.includes('趋势') || msg.includes('情况')) {
        const change = ((parseFloat(context.todayEnergy) - parseFloat(context.yesterdayEnergy)) / parseFloat(context.yesterdayEnergy) * 100).toFixed(1);
        if (Math.abs(change) < 5) {
            return `📊 用电趋势稳定，今日用电（${context.todayEnergy}Wh）与昨日基本持平（${change > 0 ? '+' : ''}${change}%）`;
        } else if (change > 0) {
            return `📈 用电量上升，今日（${context.todayEnergy}Wh）比昨日增加${change}%，建议关注用电设备`;
        } else {
            return `📉 用电量下降，今日（${context.todayEnergy}Wh）比昨日减少${Math.abs(change)}%，节能效果显著！`;
        }
    }
    
    if (msg.includes('节能') || msg.includes('省电')) {
        return `💡 节能建议：<br>1. 不使用时及时关闭电器<br>2. 避免在用电高峰时段使用大功率电器<br>3. 定期检查设备是否有异常耗电<br>4. 使用节能模式的电器`;
    }
    
    if (msg.includes('异常') || msg.includes('问题')) {
        if (parseFloat(context.avgPower) > 150) {
            return `⚠️ 检测到功率偏高（平均${context.avgPower}W），建议检查是否有大功率设备持续运行`;
        } else {
            return `✅ 未检测到明显异常，设备运行正常。当前平均功率${context.avgPower}W`;
        }
    }
    
    if (msg.includes('费用') || msg.includes('电费')) {
        return `💰 按当前用电水平，预计本月电费约${context.predictedCost}元（电价${context.price}元/kWh）`;
    }
    
    if (msg.includes('温度') || msg.includes('发热')) {
        if (parseFloat(context.currentTemp) > 60) {
            return `🔥 当前温度${context.currentTemp}°C，温度偏高！建议检查散热`;
        } else {
            return `🌡️ 当前温度${context.currentTemp}°C，温度正常，设备运行良好`;
        }
    }
    
    return `🤖 我可以帮您分析用电趋势、提供节能建议、检测异常情况、预测电费等。试试问我具体问题吧！`;
}
