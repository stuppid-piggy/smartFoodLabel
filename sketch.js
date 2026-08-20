// Toggle mobile/fly-down menu
function toggleMenu() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Router for View Navigation (Added #profile)
function router() {
    const hash = window.location.hash;
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active-view');
    });

    if (hash === '#login') {
        document.getElementById('login-view').classList.add('active-view');
    } else if (hash === '#register') {
        document.getElementById('register-view').classList.add('active-view');
    } else if (hash === '#main') {
        document.getElementById('main-view').classList.add('active-view');
    } else if (hash === '#answer') {
        document.getElementById('answer-view').classList.add('active-view');
    } else if (hash === '#profile') {
        if (loggedInUser) {
            document.getElementById('profile-username').value = loggedInUser;
        }
        document.getElementById('profile-view').classList.add('active-view');
    } else {
        document.getElementById('home-view').classList.add('active-view');
    }
}

// Global variables
let loggedInUser = null;
let hasSavedPreference = false;
let aiEngine = null;

// Initialize WebLLM Engine in Browser using CreateMLCEngine
async function initBrowserAI() {
    if (aiEngine) return;
    const selectedModel = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
    
    showLoadingModal('正在浏览器本地加载 AI 模型（首次加载可能需要下载权重，请稍候...）', 'AI 初始化');

    try {
        aiEngine = await window.webllm.CreateMLCEngine(selectedModel, {
            initProgressCallback: (progress) => {
                console.log(progress.text);
            }
        });
        hideLoadingModal();
        showCustomAlert('本地 AI 模型加载完成！', '成功');
    } catch (err) {
        console.error("WebLLM initialization error:", err);
        showCustomAlert('本地 AI 模型加载失败，请检查浏览器 WebGPU 支持。', '错误');
    }
}

// Handle User Registration
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            loggedInUser = username;
            hasSavedPreference = false;

            showCustomAlert('注册成功！请设置您的饮食偏好。');
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            
            updateMenuForLoggedInUser(loggedInUser);

            window.location.hash = '#profile';

            setTimeout(() => {
                if (!hasSavedPreference) {
                    showCustomAlert('If you do not save a preference, it may not work properly', '警告');
                }
            }, 500);
        } else {
            showCustomAlert(data.message, '错误');
        }
    } catch (err) {
        showCustomAlert('无法连接到服务器。', '错误');
    }
}

// Handle User Login
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            loggedInUser = data.username;
            hasSavedPreference = true; 
            
            showCustomAlert('登入成功！欢迎回来，' + loggedInUser + '。');
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            
            updateMenuForLoggedInUser(loggedInUser);

            window.location.hash = '#main';
        } else {
            showCustomAlert(data.message, '错误');
        }
    } catch (err) {
        showCustomAlert('无法连接到服务器。', '错误');
    }
}

// Update menu content once logged in
function updateMenuForLoggedInUser(username) {
    const authLinksDiv = document.getElementById('auth-menu-links');
    if (authLinksDiv) {
        authLinksDiv.innerHTML = `
            <a href="#profile" onclick="toggleMenu()" class="user-account-badge" style="color: #2e7d32; font-weight: bold; background-color: #f4f9f4;">
                👤 ${escapeHtml(username)} (个人资料)
            </a>
        `;
    }
}

// Save preferences
function saveProfilePreference(event) {
    event.preventDefault();
    hasSavedPreference = true;
    
    const diet = document.getElementById('pref-diet').value;
    const goal = document.getElementById('pref-goal').value;
    
    console.log("Saved preferences for", loggedInUser, { diet, goal });

    showCustomAlert('个人资料与偏好已成功更新！');
    window.location.hash = '#main';
}

// Handle Logout
function handleLogout() {
    loggedInUser = null;
    hasSavedPreference = false;
    
    const authLinksDiv = document.getElementById('auth-menu-links');
    if (authLinksDiv) {
        authLinksDiv.innerHTML = `
            <a href="#login" onclick="toggleMenu()">登入</a>
            <a href="#register" onclick="toggleMenu()">注册</a>
        `;
    }
    
    var dropdown = document.getElementById("myDropdown");
    if (dropdown) dropdown.classList.remove('show');

    window.location.hash = '#';
    showCustomAlert('您已成功退出登入。');
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    router();
    initBrowserAI();
});

// Close menu when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.menu-container') && !event.target.closest('.menu-dropdown')) {
        var dropdown = document.getElementById("myDropdown");
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

let mediaStream = null;

// Start camera
async function startCamera() {
    const videoElement = document.getElementById('camera-stream');
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        videoElement.srcObject = mediaStream;
    } catch (err) {
        console.error("Camera access error:", err);
        showCustomAlert('无法访问摄像头，请检查权限或设备设置。', '错误');
    }
}

// Stop camera
function stopCamera() {
    if (mediaStream) {
        let tracks = mediaStream.getTracks();
        tracks.forEach(track => track.stop());
        mediaStream = null;
    }
    const videoElement = document.getElementById('camera-stream');
    videoElement.srcObject = null;
}

// Capture photo and run local WebLLM inference
async function capturePhoto() {
    if (!mediaStream) {
        showCustomAlert('请先开启摄像头！');
        return;
    }
    
    if (!aiEngine) {
        showloadingModal('AI 模型未加载', '请等待 AI 模型加载完成后再尝试分析。');
        return;
    }
    if (aiEngine) {
        hideLoadingModal();
    }
    
    showLoadingModal();
    
    try {
        const messages = [
            { 
                role: "system", 
                content: "你是一位专业的营养师和食品安全专家。请用中文提供：1. 健康星级，2. 健康建议，3. 详细分析。" 
            },
            { 
                role: "user", 
                content: "请为我生成一份食品营养评估报告与分析。" 
            }
        ];

        const reply = await aiEngine.chat.completions.create({ messages });
        const analysisText = reply.choices[0].message.content;

        hideLoadingModal();
        
        document.getElementById('answer-content').innerHTML = `
            <div style="white-space: pre-line; text-align: left; line-height: 1.6;">
                ${escapeHtml(analysisText)}
            </div>
        `;
        window.location.hash = '#answer';

    } catch (err) {
        hideLoadingModal();
        console.error("Local AI inference error:", err);
        showCustomAlert('本地 AI 分析失败。', '错误');
    }
}

// Modal Helpers
// Enhanced Modal Helpers with customizable text
function showLoadingModal(title = '加载中', message = '正在处理，请稍候...') {
    const titleEl = document.getElementById('loading-title');
    const messageEl = document.getElementById('loading-message');
    
    if (titleEl) titleEl.innerText = title;
    if (messageEl) messageEl.innerText = message;
    
    document.getElementById('loading-modal').style.display = 'flex';
}

function hideLoadingModal() {
    document.getElementById('loading-modal').style.display = 'none';
}

function showCustomAlert(message, title = '提示') {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('custom-alert-modal').style.display = 'flex';
}

function closeCustomAlert() {
    document.getElementById('custom-alert-modal').style.display = 'none';
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}