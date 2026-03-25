AOS.init({ 
    duration: 800, 
    easing: 'ease-out-cubic',
    once: true,
    offset: 50 
});


function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    if (window.innerWidth <= 768) {
        navLinks.classList.toggle('active');
    }
}

function goVerify() {
    const id = document.getElementById('batchId').value.trim();
    if(id) {
        window.location.href = `verify.html?id=${id}`;
    } else {
        alert("请输入包装盒上的批次号");
    }
}

async function submitContact(event) {
    event.preventDefault();
    
    const name = document.getElementById('c_name').value.trim();
    const phone = document.getElementById('c_phone').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const message = document.getElementById('c_msg').value.trim();
    const btn = document.getElementById('submitBtn');

    const originalText = btn.innerText;
    btn.innerText = "发送中...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, phone, email, message })
        });
        
        const result = await res.json();
        if(result.success) {
            alert("信息提交成功！感谢您的关注，青春助农团队将尽快与您联系。");
            document.getElementById('contactForm').reset(); 
        } else {
            alert("抱歉，系统繁忙，请稍后再试。");
        }
    } catch (e) {
        alert("网络连接出错，请检查网络设置。");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}