let currentPwd = "", isSuper = false, superToken = "";


async function handleUpload(event) {
    event.preventDefault(); 
    const form = event.target;
    const btn = document.getElementById('uploadBtn');
    
    const formData = new FormData(form);
    formData.append('password', currentPwd);

    btn.innerText = "⏳ 加密上链中...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        
        if (result.success) {
            document.getElementById('successModal').classList.add('active');
            form.reset(); 
            loadBatch();  
            refreshDashboard(); 
        } else {
            alert("❌ 上传失败: " + (result.msg || "格式错误"));
        }
    } catch (e) {
        alert("❌ 网络或系统错误，请检查服务器连接。");
    } finally {
        btn.innerText = "一键同步并上链";
        btn.disabled = false;
    }
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
}

function checkLogin() {
    const p = document.getElementById('adminPwd').value;
    if(p) { currentPwd = p; document.getElementById('loginOverlay').style.display='none'; refreshDashboard(); }
}

function switchTab(id, el) {
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'dashboard') refreshDashboard();
    if(id === 'batch') loadBatch();
    if(id === 'messages') loadMessages();
}

function refreshDashboard() {
    fetch('/api/admin/list').then(r => r.json()).then(data => {
        document.getElementById('s-total').innerText = data.length;
        const sugars = data.map(d => parseFloat(d['糖度'] || d.sugar_level || 0));
        const avg = sugars.length ? (sugars.reduce((a,b)=>a+b)/sugars.length).toFixed(1) : 0;
        document.getElementById('s-sugar').innerText = avg + '°';
    });
    fetch('/api/admin/messages').then(r => r.json()).then(data => {
        const unreadCount = data.filter(m => !m.isRead).length;
        document.getElementById('s-msg').innerText = unreadCount;
    });
}

function loadBatch() {
    fetch('/api/admin/list').then(r => r.json()).then(data => {
        document.querySelectorAll('.super-col').forEach(el => el.style.display = isSuper ? 'table-cell' : 'none');
        document.getElementById('batchTools').style.display = isSuper ? 'block' : 'none';
        
        const body = document.getElementById('dataBody');
        body.innerHTML = data.map(item => `
            <tr>
                ${isSuper ? `<td><input type="checkbox" class="row-check" value="${item['批次号']||item.batch_id}"></td>` : ''}
                <td><b>${item['批次号']||item.batch_id}</b></td>
                <td>${item['农户']||item.farmer_name}</td>
                <td>${item['糖度']||item.sugar_level}°</td>
                <td><span style="color:#22c55e">● 已存证</span></td>
            </tr>
        `).join('');
    });
}

function loadMessages() {
    fetch('/api/admin/messages').then(r => r.json()).then(data => {
        document.querySelectorAll('.super-col').forEach(el => el.style.display = isSuper ? 'table-cell' : 'none');
        document.getElementById('msgTools').style.display = isSuper ? 'block' : 'none';

        const body = document.getElementById('msgBody');
        body.innerHTML = data.map(m => {
            
            let actionBtn = "";
            if (isSuper) {
                actionBtn = `<button class="btn btn-danger" style="padding:5px 10px; font-size:12px;" onclick="deleteSingleMsg('${m.time}')">🗑️ 删除</button>`;
            } else {
                const isRead = m.isRead;
                actionBtn = `<button class="btn ${isRead ? 'btn-gray' : 'btn-primary'}" style="padding:5px 10px; font-size:12px;" onclick="toggleRead('${m.time}')">
                                ${isRead ? '👁️ 已读' : '🔴 标为已读'}
                             </button>`;
            }

            return `
            <tr style="${m.isRead && !isSuper ? 'opacity: 0.5;' : ''}">
                ${isSuper ? `<td><input type="checkbox" class="msg-check" value="${m.time}"></td>` : ''}
                <td style="font-size:11px; color:#64748b">${m.time}</td>
                <td><b>${m.name}</b></td>
                <td>${m.phone}</td>
                <td>${m.email || '-'}</td>
                <td style="max-width:300px">${m.message}</td>
                <td>${actionBtn}</td>
            </tr>
            `;
        }).join('');
    });
}

function activateSuper() {
    if(document.getElementById('sCode').value === 'super999') {
        isSuper = true; superToken = 'super999';
        const btn = document.getElementById('sBtn');
        btn.innerText = "✅ 已开启超管特权";
        btn.classList.add('super-active-btn');
        btn.disabled = true;
        document.getElementById('sCode').disabled = true;
        alert('超级管理员模式已锁定，删除功能已解锁！');
        refreshDashboard();
        loadMessages(); 
    } else { alert('授权码错误'); }
}

function toggleAll(type, m) {
    const selector = type === 'data' ? '.row-check' : '.msg-check';
    document.querySelectorAll(selector).forEach(c => c.checked = m.checked);
}

function deleteSelectedData() {
    const ids = Array.from(document.querySelectorAll('.row-check:checked')).map(c => c.value);
    if(ids.length === 0) return alert('请选择项');
    if(confirm(`确定永久物理删除这 ${ids.length} 个批次吗？`)) {
        fetch('/api/admin/delete-batch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ batchIds: ids, superPwd: superToken })
        }).then(() => loadBatch());
    }
}

function deleteSelectedMsgs() {
    const times = Array.from(document.querySelectorAll('.msg-check:checked')).map(c => c.value);
    if(times.length === 0) return alert('请选择项');
    if(confirm(`确定批量删除 ${times.length} 条留言吗？`)) {
        fetch('/api/admin/delete-messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ messageTimes: times, superPwd: superToken })
        }).then(() => { loadMessages(); refreshDashboard(); });
    }
}

function deleteSingleMsg(time) {
    if(confirm('确定删除这条咨询吗？')) {
        fetch('/api/admin/delete-messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ messageTimes: [time], superPwd: superToken })
        }).then(() => { loadMessages(); refreshDashboard(); });
    }
}

function changeP() {
    const oldPwd = document.getElementById('oldP').value, newPwd = document.getElementById('newP').value;
    fetch('/api/admin/change-pwd', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ oldPwd, newPwd })
    }).then(r => r.json()).then(res => {
        if(res.success) { alert('密码已更新，请重新登录'); location.reload(); } else alert('原密码错误');
    });
}


function toggleRead(time) {
    fetch('/api/admin/toggle-read', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ time: time })
    }).then(r => r.json()).then(res => {
        if(res.success) {
            loadMessages(); 
            refreshDashboard(); 
        }
    });
}