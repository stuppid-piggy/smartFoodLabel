function toggleMenu() {
    document.getElementById("myDropdown").classList.toggle("show");
}

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
            const prefs = JSON.parse(localStorage.getItem('prefs_' + loggedInUser) || '{}');
            document.getElementById('pref-diet').value = prefs.diet || '';
            document.getElementById('pref-goal').value = prefs.goal || '';
        }
        document.getElementById('profile-view').classList.add('active-view');
    } else {
        document.getElementById('home-view').classList.add('active-view');
    }
}

let loggedInUser = localStorage.getItem('currentUser') || null;

if (loggedInUser) {
    updateMenuForLoggedInUser(loggedInUser);
}

function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    let users = JSON.parse(localStorage.getItem('app_users') || '{}');

    if (users[username]) {
        showCustomAlert('账号已存在', '错误');
        return;
    }

    users[username] = { password };
    localStorage.setItem('app_users', JSON.stringify(users));
    
    loggedInUser = username;
    localStorage.setItem('currentUser', username);

    showCustomAlert('注册成功！请设置您的饮食偏好。');
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    
    updateMenuForLoggedInUser(loggedInUser);
    window.location.hash = '#profile';
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    let users = JSON.parse(localStorage.getItem('app_users') || '{}');

    if (!users[username] || users[username].password !== password) {
        showCustomAlert('账号或密码错误', '错误');
        return;
    }

    loggedInUser = username;
    localStorage.setItem('currentUser', username);
    
    showCustomAlert('登入成功！欢迎回来，' + loggedInUser + '。');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    updateMenuForLoggedInUser(loggedInUser);
    window.location.hash = '#main';
}

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

function saveProfilePreference(event) {
    event.preventDefault();
    if (!loggedInUser) return;
    
    const diet = document.getElementById('pref-diet').value;
    const goal = document.getElementById('pref-goal').value;
    
    localStorage.setItem('prefs_' + loggedInUser, JSON.stringify({ diet, goal }));

    showCustomAlert('个人资料与偏好已成功更新！');
    window.location.hash = '#main';
}

function handleLogout() {
    loggedInUser = null;
    localStorage.removeItem('currentUser');
    
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
});

window.onclick = function(event) {
    if (!event.target.closest('.menu-container') && !event.target.closest('.menu-dropdown')) {
        var dropdown = document.getElementById("myDropdown");
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

let mediaStream = null;

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

function stopCamera() {
    if (mediaStream) {
        let tracks = mediaStream.getTracks();
        tracks.forEach(track => track.stop());
        mediaStream = null;
    }
    const videoElement = document.getElementById('camera-stream');
    videoElement.srcObject = null;
}

async function capturePhoto() {
    const videoElement = document.getElementById('camera-stream');
    if (!mediaStream || !videoElement.srcObject) {
        showCustomAlert('请先开启摄像头！', '错误');
        return;
    }

    showLoadingModal('正在分析', '正在分析食物成分...');

    try {
        const canvas = document.getElementById('snapshot-canvas');
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const base64Image = canvas.toDataURL('image/jpeg');
        const apiKey = "sk-f3f19798e4d246b98b1678b1a40e7f7d";

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-v4-flash-vision-exp',
                messages: [
                    {
                        role: 'system',
                        content: `你是一位专业的营养师和食品安全专家。请客观地根据该用户的专属偏好：${document.getElementById('pref-diet').value}和${document.getElementById('pref-goal').value}来分析这张食物标签或图片（若食物不符合其目标或忌口需降低星级），重点评估其成分、营养优缺点和整体健康度。总字数严格控制在300字以上，500字以内，内容包含：1. 健康星级(如⭐⭐⭐⭐☆）必须用表情符号来表达，2. 核心成分与健康简析。绝对不要在回答末尾提出任何反问或追问，也不要给出任何专业术语、数字，要让任何人看懂。`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '请分析这款食物的成分与营养信息。' },
                            { type: 'image_url', image_url: { url: base64Image } }
                        ]
                    }
                ],
                stream: false
            })
        });

        const data = await response.json();
        hideLoadingModal();

        if (data.error) {
            showCustomAlert('DeepSeek 错误: ' + data.error.message, '错误');
            return;
        }

        const analysisText = data.choices[0].message.content;

        let safeText = escapeHtml(analysisText);
        
        const enlargedStarsText = analysisText.replace(/([⭐☆]+)/g, '<span style="font-size: 300%; vertical-align: middle;">$1</span>');
        
        const finalFormatted = escapeHtml(analysisText).replace(/([⭐☆]+)/g, '<span style="font-size: 300%; vertical-align: middle;">$1</span>');

        document.getElementById('answer-content').innerHTML = `
            <div style="white-space: pre-line; text-align: left; line-height: 1.8;">
                ${finalFormatted}
            </div>
        `;
        window.location.hash = '#answer';

    } catch (err) {
        hideLoadingModal();
        console.error("DeepSeek API error:", err);
        showCustomAlert('请求失败，请检查网络或 API Key 是否正确。', '错误');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showCustomAlert('请选择有效的图片文件！', '错误');
        return;
    }

    showLoadingModal('正在分析', 'DeepSeek 正在分析上传的照片...');

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        const apiKey = "sk-f3f19798e4d246b98b1678b1a40e7f7d";

        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-v4-flash-vision-exp',
                    messages: [
                        {
                            role: 'system',
                            content: `你是一位专业的营养师和食品安全专家。请客观地根据该用户的专属偏好：${document.getElementById('pref-diet') ? document.getElementById('pref-diet').value : '无'}和${document.getElementById('pref-goal') ? document.getElementById('pref-goal').value : '无'}来分析这张食物标签或图片（若食物不符合其目标或忌口需降低星级），重点评估其成分、营养优缺点和整体健康度。总字数严格控制在300字以上，500字以内，内容包含：1. 健康星级(如⭐⭐⭐⭐☆）必须用表情符号来表达，2. 核心成分与健康简析。绝对不要在回答末尾提出任何反问或追问，也不要给出任何专业术语、数字，要让任何人看懂。`
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: '请分析这款食物的成分与营养信息。' },
                                { type: 'image_url', image_url: { url: base64Image } }
                            ]
                        }
                    ],
                    stream: false
                })
            });

            const data = await response.json();
            hideLoadingModal();

            if (data.error) {
                showCustomAlert('DeepSeek 错误: ' + data.error.message, '错误');
                return;
            }

            const analysisText = data.choices[0].message.content;
            const finalFormatted = escapeHtml(analysisText).replace(/([⭐☆]+)/g, '<span style="font-size: 300%; vertical-align: middle;">$1</span>');
            
            document.getElementById('answer-content').innerHTML = `
                <div style="white-space: pre-line; text-align: left; line-height: 1.8;">
                    ${finalFormatted}
                </div>
            `;
            window.location.hash = '#answer';

        } catch (err) {
            hideLoadingModal();
            console.error("DeepSeek API error:", err);
            showCustomAlert('请求失败，请检查网络或 API Key 是否正确。', '错误');
        }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
}

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