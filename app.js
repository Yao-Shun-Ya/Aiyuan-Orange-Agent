const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto'); 

const app = express();

const DB_FILE = './data.json';
const CONFIG_FILE = './config.json';
const MESSAGES_FILE = './messages.json';
const UPLOADS_DIR = './uploads';
const SUPER_PASSWORD = 'super999';


if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ admin_pwd: '888888' }));
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}
if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}

const upload = multer({ dest: UPLOADS_DIR + '/' });
app.use(express.static('public'));
app.use(express.json());


const getAdminPwd = () => {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return config.admin_pwd;
    } catch (e) {
        return '888888'; 
    }
};



app.get('/api/verify', (req, res) => {
    const id = req.query.id;
    if (!id || !fs.existsSync(DB_FILE)) {
        return res.json({ success: false });
    }
    
    try {
        const allData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const fruit = allData.find(item => String(item['批次号'] || item.batch_id) === String(id));
        res.json({ success: !!fruit, data: fruit });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/contact', (req, res) => {
    try {
        const msgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        msgs.unshift({ ...req.body, time: new Date().toLocaleString(), isRead: false });
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.get('/api/admin/list', (req, res) => {
    try {
        const allData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        res.json(allData);
    } catch (e) {
        res.json([]);
    }
});

app.get('/api/admin/messages', (req, res) => {
    try {
        const msgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        res.json(msgs);
    } catch (e) {
        res.json([]);
    }
});

app.post('/api/admin/delete-batch', (req, res) => {
    if (req.body.superPwd !== SUPER_PASSWORD) {
        return res.json({ success: false, msg: '权限不足，无法删除' });
    }
    try {
        let allData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const targets = req.body.batchIds || [];
        const filtered = allData.filter(item => !targets.includes(String(item['批次号'] || item.batch_id)));
        fs.writeFileSync(DB_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/delete-messages', (req, res) => {
    if (req.body.superPwd !== SUPER_PASSWORD) {
        return res.json({ success: false, msg: '权限不足，无法删除' });
    }
    try {
        let msgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        const timesToDelete = req.body.messageTimes || [];
        const filtered = msgs.filter(m => !timesToDelete.includes(m.time));
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(filtered, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/admin/change-pwd', (req, res) => {
    if (req.body.oldPwd !== getAdminPwd()) {
        return res.json({ success: false, msg: '原密码校验失败' });
    }
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ admin_pwd: req.body.newPwd }));
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

app.post('/api/upload', upload.single('orangeExcel'), (req, res) => {
    if (req.body.password !== getAdminPwd()) {
        return res.json({ success: false, msg: '安全拦截：密码错误' });
    }
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const processedData = data.map(item => {
            const batchId = item['批次号'] || item.batch_id || 'WL-Unknown';
            const farmer = item['农户'] || item.farmer_name || '合江果农';
            const sugar = item['糖度'] || item.sugar_level || '0';
            const weight = item['单果重'] || item.weight || '0g';
            
            const rawString = `${batchId}-${farmer}-${sugar}-${weight}-${new Date().getTime()}`;
            const realHash = crypto.createHash('sha256').update(rawString).digest('hex');
            
            return { ...item, '区块链Hash': '0x' + realHash };
        });


        fs.writeFileSync(DB_FILE, JSON.stringify(processedData, null, 2));
        

        res.json({ success: true }); 
        
    } catch (e) {
        console.error("上传解析错误：", e);
        res.json({ success: false, msg: '数据解析失败，请检查 Excel 文件格式' });
    }
});


app.post('/api/admin/toggle-read', (req, res) => {
    try {
        let msgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        const target = msgs.find(m => m.time === req.body.time);
        if (target) {
            target.isRead = !target.isRead; 
            fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs, null, 2));
            return res.json({ success: true });
        }
        res.json({ success: false, msg: '找不到该留言' });
    } catch (e) {
        res.json({ success: false });
    }
});



function getIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return '127.0.0.1';
}

const PORT = 3000;
app.listen(PORT, () => {
    const LAN_IP = getIP();
    console.log('\n' + '═'.repeat(60));
    console.log('🍊 爱媛橙代理人 · 数智兴乡系统');
    console.log('═'.repeat(60));
    console.log(`🚀 本地调试地址:  http://localhost:${PORT}`);
    console.log(`📱 手机演示地址:  http://${LAN_IP}:${PORT} (需连同WiFi)`);
    console.log('─'.repeat(60));
    console.log(`🔗 品牌官网:      http://localhost:${PORT}/index.html`);
    console.log(`🔐 管理后台:      http://localhost:${PORT}/admin.html`);
    console.log('─'.repeat(60));
    console.log('🔑 默认后台密码:  888888');
    console.log('🛠️ 超管开发者码:  super999');
    console.log('🎓 团队: 成都银杏酒店管理学院 · 青春助农团队');
    console.log('═'.repeat(60) + '\n');
});