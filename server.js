const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Serves index.html, style.css, sketch.js

const USERS_FILE = path.join(__dirname, 'users.json');

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}

// Register Endpoint
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    let users = JSON.parse(fs.readFileSync(USERS_FILE));

    if (users[username]) {
        return res.status(400).json({ success: false, message: '账号已存在' });
    }

    users[username] = { password, createdAt: new Date().toISOString() };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ success: true, message: '注册成功' });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let users = JSON.parse(fs.readFileSync(USERS_FILE));

    if (!users[username] || users[username].password !== password) {
        return res.status(400).json({ success: false, message: '账号或密码错误' });
    }

    res.json({ success: true, message: '登入成功', username });
});

// Food Label Analysis Endpoint using Doubao API
app.post('/api/analyze-label', async (req, res) => {
    const { image } = req.body; // Base64 image from frontend

    if (!image) {
        return res.status(400).json({ success: false, message: '未检测到图片数据' });
    }

    try {
        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-Ip1a5s1pQWYsygavQBMocT7iT72dtN82HEU6v9FSrGl3Dy1H' // Replace with your full Doubao API key
            },
            body: JSON.stringify({
                model: 'doubao-seedream-5-0-260128', // Your Doubao model/endpoint identifier
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的营养师和食品安全专家。请分析用户提供的食品标签图片，并以中文回答。提供：1. 健康星级（如 ⭐⭐⭐⭐☆），2. 健康建议（关注钠、糖、配料等），3. 详细分析。'
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '请分析这张食品标签或包装成分表：' },
                            { type: 'image_url', image_url: { url: image } }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ success: false, message: data.error.message });
        }

        const analysisText = data.choices[0].message.content;
        res.json({ success: true, analysis: analysisText });

    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ success: false, message: '服务器请求豆包AI接口失败' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});