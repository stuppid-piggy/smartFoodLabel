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
        showCustomAlert('賬號已存在', '錯誤');
        return;
    }

    users[username] = { password };
    localStorage.setItem('app_users', JSON.stringify(users));
    
    loggedInUser = username;
    localStorage.setItem('currentUser', username);

    showCustomAlert('注冊成功！請設置您的飲食偏好。');
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
        showCustomAlert('賬號或密碼錯誤', '錯誤');
        return;
    }

    loggedInUser = username;
    localStorage.setItem('currentUser', username);
    
    showCustomAlert('登入成功！歡迎回來，' + loggedInUser + '。');
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
                👤 ${escapeHtml(username)} (個人資料)
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

    showCustomAlert('個人資料與偏好已成功更新！');
    window.location.hash = '#main';
}

function handleLogout() {
    loggedInUser = null;
    localStorage.removeItem('currentUser');
    
    const authLinksDiv = document.getElementById('auth-menu-links');
    if (authLinksDiv) {
        authLinksDiv.innerHTML = `
            <a href="#login" onclick="toggleMenu()">登入</a>
            <a href="#register" onclick="toggleMenu()">注冊</a>
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
        showCustomAlert('無法訪問攝像頭，請檢查權限或設備設置。', '錯誤');
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
        showCustomAlert('請先開啟攝像頭！', '錯誤');
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
        const apiKey = "";

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
                        content: `你是一位專業的營養師和食品安全專家。請客觀地根據該用戶的專屬偏好：${document.getElementById('pref-diet').value}和${document.getElementById('pref-goal').value}來分析這張食物標簽或圖片（若食物不符合其目標或忌口需降低星級），重點評估其成分、營養優缺點和整體健康度。總字數嚴格控制在300字以上，500字以內，內容包含：1. 健康星級(如⭐⭐⭐⭐☆）必須用表情符號來表達，2. 核心成分與健康簡析。絕對不要在回答末尾提出任何反問或追問，也不要給出任何專業術語、數字，要讓任何人看懂。`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '請分析這款食物的成分與營養信息。' },
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
            showCustomAlert('DeepSeek 錯誤: ' + data.error.message, '錯誤');
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
        showCustomAlert('請求失敗，請檢查網絡或 API Key 是否正確。', '錯誤');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showCustomAlert('請選擇有效的圖片文件！', '錯誤');
        return;
    }

    showLoadingModal('正在分析', 'DeepSeek 正在分析上傳的照片...');
    let langPromptInstruction = "";
    if (currentLang === 'tc') {
        langPromptInstruction = "請用繁體中文回答。";
    } else if (currentLang === 'sc') {
        langPromptInstruction = "请用简体中文回答。";
    } else {
        langPromptInstruction = "Please reply in English.";
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        const apiKey = "";

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
                            content: `你是一位專業的營養師和食品安全專家。請客觀地根據該用戶的專屬偏好：${document.getElementById('pref-diet') ? document.getElementById('pref-diet').value : '無'}和${document.getElementById('pref-goal') ? document.getElementById('pref-goal').value : '無'}來分析這張食物標簽或圖片（若食物不符合其目標或忌口需降低星級），重點評估其成分、營養優缺點和整體健康度。總字數嚴格控制在300字以上，500字以內，內容包含：1. 健康星級(如⭐⭐⭐⭐☆）必須用表情符號來表達，2. 核心成分與健康簡析。絕對不要在回答末尾提出任何反問或追問，也不要給出任何專業術語、數字，要讓任何人看懂。${langPromptInstruction}`
                        },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: '請分析這款食物的成分與營養信息。' },
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
                showCustomAlert('DeepSeek 錯誤: ' + data.error.message, '錯誤');
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
            showCustomAlert('請求失敗，請檢查網絡或 API Key 是否正確。', '錯誤');
        }
    };

    reader.readAsDataURL(file);
    event.target.value = '';
}

function showLoadingModal(title = '加載中', message = '正在處理，請稍候...') {
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

const translations = {
    tc: {
        homeTitle: "智能食物標簽 - 你的健康助手",
        homeDesc: "通過拍照識別食物成分表，快速了解食物的營養信息和健康建議。",
        ctaBtn: "現在立即使用",
        login: "登入",
        register: "注冊",
        loginTitle: "用戶登入",
        username: "賬號",
        password: "密碼",
        loginBtn: "立即登入",
        registerTitle: "新用戶注冊",
        setAccount: "設置賬號",
        setPassword: "設置密碼",
        registerBtn: "立即注冊",
        scannerTitle: "食物標簽掃描儀",
        scannerDesc: "請允許瀏覽器使用您的攝像頭以掃描食物成分表。",
        startCam: "開啟攝像頭",
        capturePhoto: "拍照識別",
        stopCam: "關閉攝像頭",
        uploadPhoto: "📁 上傳本地照片",
        answerTitle: "食物分析結果",
        backHome: "返回首頁",
        backMain: "返回主界面",
        profileTitle: "👤 個人資料與偏好設置",
        currentAccount: "當前賬號",
        dietPref: "飲食習慣/忌口",
        dietPlaceholder: "例如：素食、低糖、無堅果",
        healthGoal: "健康目標",
        goalPlaceholder: "例如：減脂、增肌、控糖",
        saveChanges: "保存修改",
        logout: "退出登入",
        backScanner: "返回掃描儀",
        profileBadgeSuffix: " (個人資料)"
    },
    sc: {
        homeTitle: "智能食物标签 - 你的健康助手",
        homeDesc: "通过拍照识别食物成分表，快速了解食物的营养信息和健康建议。",
        ctaBtn: "现在立即使用",
        login: "登录",
        register: "注册",
        loginTitle: "用户登录",
        username: "账号",
        password: "密码",
        loginBtn: "立即登录",
        registerTitle: "新用户注册",
        setAccount: "设置账号",
        setPassword: "设置密码",
        registerBtn: "立即注册",
        scannerTitle: "食物标签扫描仪",
        scannerDesc: "请允许浏览器使用您的摄像头以扫描食物成分表。",
        startCam: "开启摄像头",
        capturePhoto: "拍照识别",
        stopCam: "关闭摄像头",
        uploadPhoto: "📁 上传本地照片",
        answerTitle: "食物分析结果",
        backHome: "返回首页",
        backMain: "返回主界面",
        profileTitle: "👤 个人资料与偏好设置",
        currentAccount: "当前账号",
        dietPref: "饮食习惯/忌口",
        dietPlaceholder: "例如：素食、低糖、无坚果",
        healthGoal: "健康目标",
        goalPlaceholder: "例如：减脂、增肌、控糖",
        saveChanges: "保存修改",
        logout: "退出登录",
        backScanner: "返回扫描仪",
        profileBadgeSuffix: " (个人资料)"
    },
    en: {
        homeTitle: "Smart Food Label - Your Health Assistant",
        homeDesc: "Scan food ingredient labels instantly to get nutritional info and health tips.",
        ctaBtn: "Get Started Now",
        login: "Log In",
        register: "Register",
        loginTitle: "User Login",
        username: "Username",
        password: "Password",
        loginBtn: "Log In",
        registerTitle: "User Registration",
        setAccount: "Set Username",
        setPassword: "Set Password",
        registerBtn: "Register",
        scannerTitle: "Food Label Scanner",
        scannerDesc: "Please allow camera access to scan food ingredient labels.",
        startCam: "Start Camera",
        capturePhoto: "Capture & Scan",
        stopCam: "Stop Camera",
        uploadPhoto: "📁 Upload Photo",
        answerTitle: "Food Analysis Result",
        backHome: "Back to Home",
        backMain: "Back to Main",
        profileTitle: "👤 Profile & Preferences",
        currentAccount: "Current Username",
        dietPref: "Dietary Habits / Allergies",
        dietPlaceholder: "e.g., Vegetarian, Low Sugar, Nut-free",
        healthGoal: "Health Goals",
        goalPlaceholder: "e.g., Fat loss, Muscle gain, Sugar control",
        saveChanges: "Save Changes",
        logout: "Log Out",
        backScanner: "Back to Scanner",
        profileBadgeSuffix: " (Profile)"
    }
};

let currentLang = localStorage.getItem('app_lang') || 'tc';

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyTranslations();
}

function applyTranslations() {
    const t = translations[currentLang];
    if (!t) return;

    const selector = document.getElementById('lang-selector');
    if (selector) selector.value = currentLang;

    updateTextIfExists('home-view', 'h1', t.homeTitle);
    updateTextIfExists('home-view', 'p', t.homeDesc);
    updateTextIfExists('home-view', '.cta-btn', t.ctaBtn);

    const authLinksDiv = document.getElementById('auth-menu-links');
    if (authLinksDiv && !loggedInUser) {
        authLinksDiv.innerHTML = `
            <a href="#login" onclick="toggleMenu()">${t.login}</a>
            <a href="#register" onclick="toggleMenu()">${t.register}</a>
        `;
    } else if (authLinksDiv && loggedInUser) {
        authLinksDiv.innerHTML = `
            <a href="#profile" onclick="toggleMenu()" class="user-account-badge" style="color: #2e7d32; font-weight: bold; background-color: #f4f9f4;">
                👤 ${escapeHtml(loggedInUser)}${t.profileBadgeSuffix}
            </a>
        `;
    }

    updateTextIfExists('login-view', 'h2', t.loginTitle);
    updateInputLabelAndPlaceholder('login-view', 0, t.username, t.username);
    updateInputLabelAndPlaceholder('login-view', 1, t.password, t.password);
    updateTextIfExists('login-view', 'button[type="submit"]', t.loginBtn);
    const loginBack = document.querySelector('#login-view p a');
    if (loginBack) loginBack.innerHTML = `← ${t.backHome}`;

    updateTextIfExists('register-view', 'h2', t.registerTitle);
    updateInputLabelAndPlaceholder('register-view', 0, t.setAccount, t.setAccount);
    updateInputLabelAndPlaceholder('register-view', 1, t.setPassword, t.setPassword);
    updateTextIfExists('register-view', 'button[type="submit"]', t.registerBtn);
    const regBack = document.querySelector('#register-view p a');
    if (regBack) regBack.innerHTML = `← ${t.backHome}`;

    updateTextIfExists('main-view', 'h2', t.scannerTitle);
    updateTextIfExists('main-view', 'p', t.scannerDesc);
    const mainBack = document.querySelector('#main-view p a');
    if (mainBack) mainBack.innerHTML = `← ${t.backHome}`;
    
    const camButtons = document.querySelectorAll('#main-view .camera-controls button');
    if (camButtons.length >= 3) {
        camButtons[0].innerText = t.startCam;
        camButtons[1].innerText = t.capturePhoto;
        camButtons[2].innerText = t.stopCam;
    }
    const uploadLabel = document.querySelector('label[for="upload-photo-input"]');
    if (uploadLabel) uploadLabel.innerText = t.uploadPhoto;

    updateTextIfExists('answer-view', 'h2', t.answerTitle);
    const backMainBtn = document.querySelector('#answer-view a[href="#main"]');
    if (backMainBtn) backMainBtn.innerText = t.backMain;

    updateTextIfExists('profile-view', 'h2', t.profileTitle);
    updateInputLabelAndPlaceholder('profile-view', 0, t.currentAccount, '');
    updateInputLabelAndPlaceholder('profile-view', 1, t.dietPref, t.dietPlaceholder);
    updateInputLabelAndPlaceholder('profile-view', 2, t.healthGoal, t.goalPlaceholder);
    
    const profileFormButtons = document.querySelectorAll('#profile-view button');
    if (profileFormButtons.length >= 3) {
        profileFormButtons[0].innerText = t.saveChanges;
        profileFormButtons[1].innerText = t.logout;
        profileFormButtons[2].innerText = t.backScanner;
    }
}

function updateTextIfExists(containerId, selector, text) {
    const container = document.getElementById(containerId);
    if (container) {
        const el = container.querySelector(selector);
        if (el) el.innerText = text;
    }
}

function updateInputLabelAndPlaceholder(containerId, groupIndex, labelText, placeholderText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const groups = container.querySelectorAll('.input-group');
    if (groups[groupIndex]) {
        const label = groups[groupIndex].querySelector('label');
        const input = groups[groupIndex].querySelector('input');
        if (label && labelText) label.innerText = labelText;
        if (input && placeholderText) input.placeholder = placeholderText;
    }
}

window.addEventListener('load', () => {
    applyTranslations();
    router();
});