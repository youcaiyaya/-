// 插排元素
const robot = document.querySelector('.robot');
const robotEyes = document.getElementById('robotEyes');
const robotHands = document.getElementById('robotHands');
const leftPupil = document.querySelector('.left-eye .pupil');
const rightPupil = document.querySelector('.right-eye .pupil');

// 表单元素
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const rememberCheckbox = document.getElementById('remember');

// 默认账号密码（实际项目中应该从服务器验证）
const DEFAULT_USERNAME = '08042';
const DEFAULT_PASSWORD = '08042';

// 插排动画状态
let currentState = 'idle';
let isPasswordFocused = false;

// 眼睛跟随鼠标
document.addEventListener('mousemove', (e) => {
    // 如果正在输入密码，不跟随鼠标
    if (isPasswordFocused) return;
    
    const robotRect = robot.getBoundingClientRect();
    const robotCenterX = robotRect.left + robotRect.width / 2;
    const robotCenterY = robotRect.top + robotRect.height / 2;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // 计算角度
    const deltaX = mouseX - robotCenterX;
    const deltaY = mouseY - robotCenterY;
    
    // 限制移动范围（让眼睛在插孔内移动）
    const maxMove = 4;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const limitedDistance = Math.min(distance, 100);
    
    const moveX = (deltaX / distance) * (limitedDistance / 100) * maxMove;
    const moveY = (deltaY / distance) * (limitedDistance / 100) * maxMove;
    
    // 应用到两个瞳孔
    if (leftPupil && rightPupil) {
        leftPupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
        rightPupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
});

// 用户名输入框获得焦点 - 插排看向输入框
usernameInput.addEventListener('focus', () => {
    robot.classList.remove('covering-eyes', 'happy');
    robot.classList.add('looking-down');
    currentState = 'looking';
    isPasswordFocused = false;
    
    // 眼睛看向输入框
    if (leftPupil && rightPupil) {
        leftPupil.style.transform = 'translate(0, 4px)';
        rightPupil.style.transform = 'translate(0, 4px)';
    }
});

// 用户名输入框失去焦点
usernameInput.addEventListener('blur', () => {
    if (currentState === 'looking') {
        robot.classList.remove('looking-down');
        currentState = 'idle';
        isPasswordFocused = false;
    }
});

// 密码输入框获得焦点 - 插排捂眼睛
passwordInput.addEventListener('focus', () => {
    robot.classList.remove('looking-down', 'happy');
    robot.classList.add('covering-eyes');
    currentState = 'covering';
    isPasswordFocused = true;
});

// 密码输入框失去焦点
passwordInput.addEventListener('blur', () => {
    if (currentState === 'covering') {
        robot.classList.remove('covering-eyes');
        currentState = 'idle';
        isPasswordFocused = false;
    }
});

// 密码显示/隐藏切换
let passwordVisible = false;
passwordToggle.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    passwordToggle.textContent = passwordVisible ? '🙈' : '👁️';
});

// 表单提交
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    // 清除之前的错误消息
    errorMessage.textContent = '';
    
    // 验证输入
    if (!username || !password) {
        showError('请输入账号和密码');
        shakeRobot();
        return;
    }
    
    // 显示加载状态
    const loginButton = loginForm.querySelector('.login-button');
    const buttonText = loginButton.querySelector('.button-text');
    const originalText = buttonText.textContent;
    buttonText.textContent = '登录中...';
    loginButton.disabled = true;
    
    // 模拟登录延迟
    await sleep(800);
    
    // 验证账号密码
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
        // 登录成功
        robot.classList.add('happy');
        buttonText.textContent = '登录成功！';
        
        // 保存登录状态
        if (rememberCheckbox.checked) {
            localStorage.setItem('rememberedUser', username);
        }
        
        // 保存登录凭证（实际项目中应该使用token）
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('username', username);
        
        // 延迟跳转
        await sleep(1000);
        window.location.href = 'index.html';
    } else {
        // 登录失败
        showError('账号或密码错误');
        shakeRobot();
        buttonText.textContent = originalText;
        loginButton.disabled = false;
        
        // 清空密码
        passwordInput.value = '';
        passwordInput.focus();
    }
});

// 显示错误消息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.animation = 'none';
    setTimeout(() => {
        errorMessage.style.animation = 'shake 0.5s ease';
    }, 10);
}

// 机器人摇头动画
function shakeRobot() {
    robot.style.animation = 'none';
    setTimeout(() => {
        robot.style.animation = 'shake 0.5s ease';
    }, 10);
    
    setTimeout(() => {
        robot.style.animation = 'robotBounce 2s ease-in-out infinite';
    }, 500);
}

// 延迟函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 页面加载时检查是否记住了用户
window.addEventListener('DOMContentLoaded', () => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        usernameInput.value = rememberedUser;
        rememberCheckbox.checked = true;
    }
    
    // 检查是否已登录
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        // 已登录，直接跳转
        window.location.href = 'index.html';
    }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter 快速登录
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// 添加输入动画效果
usernameInput.addEventListener('input', () => {
    if (usernameInput.value.length > 0) {
        usernameInput.style.borderColor = '#667eea';
    }
});

passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length > 0) {
        passwordInput.style.borderColor = '#667eea';
    }
});

// 提示信息
console.log('%c🔌 智能插排控制系统', 'font-size: 20px; color: #667eea; font-weight: bold;');
console.log('%c默认账号: admin', 'font-size: 14px; color: #666;');
console.log('%c默认密码: 123456', 'font-size: 14px; color: #666;');
console.log('%c提示: 插排会在你输入时做出反应哦！', 'font-size: 12px; color: #999;');
console.log('%c✨ 试试移动鼠标，插排的眼睛会跟着你！', 'font-size: 12px; color: #667eea;');

// 添加可爱的互动效果
let clickCount = 0;
robot.addEventListener('click', () => {
    clickCount++;
    
    // 点击插排会有可爱的反应
    robot.style.animation = 'none';
    setTimeout(() => {
        robot.style.animation = 'robotBounce 2s ease-in-out infinite';
    }, 10);
    
    // 多次点击有惊喜
    if (clickCount === 5) {
        robot.classList.add('happy');
        setTimeout(() => {
            robot.classList.remove('happy');
        }, 2000);
        clickCount = 0;
    }
});

// 页面加载时的欢迎动画
window.addEventListener('load', () => {
    setTimeout(() => {
        robot.classList.add('happy');
        setTimeout(() => {
            robot.classList.remove('happy');
        }, 1500);
    }, 500);
});
