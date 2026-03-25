tsParticles.load("tsparticles", {
    fpsLimit: 60,
    particles: {
        number: { value: 60, density: { enable: true, value_area: 800 } },
        color: { value: ["#ffffff", "#fed7aa", "#ea580c"] },
        shape: { type: "circle" },
        opacity: { value: { min: 0.1, max: 0.5 }, animation: { enable: true, speed: 1 } },
        size: { value: { min: 1, max: 3 }, animation: { enable: true, speed: 1 } },
        move: { enable: true, speed: 1.5, direction: "top", random: true, straight: false, outModes: "out" }
    },
    detectRetina: true
});


const certCard = document.getElementById('certCard');
VanillaTilt.init(certCard, {
    max: 10,
    speed: 400,
    glare: true,
    "max-glare": 0.2,
    gyroscope: true 
});


certCard.addEventListener("tiltChange", () => certCard.classList.add('tilt-active'));
certCard.addEventListener("mouseleave", () => certCard.classList.remove('tilt-active'));
certCard.addEventListener("touchend", () => certCard.classList.remove('tilt-active'));


const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (id) {
    setTimeout(() => {
        fetch(`/api/verify?id=${id}`)
            .then(res => res.json())
            .then(res => {
                document.getElementById('statusScreen').style.display = 'none';
                
                if (res.success && res.data) {
                    const d = res.data;
                    certCard.style.display = 'block';
                    
                    document.getElementById('res_id').innerText = d['批次号'] || d.batch_id || "无";
                    document.getElementById('res_farmer').innerText = d['农户'] || d.farmer_name || "未知";
                    document.getElementById('res_hash').innerText = d['区块链Hash'] || d.blockchain_hash || "未存证";

                    const weightStr = String(d['单果重'] || d.weight || "0g");
                    const weightNum = weightStr.replace(/[^0-9]/g, '');
                    const weightUnit = weightStr.replace(/[0-9]/g, '');
                    document.getElementById('res_weight_val').innerText = weightNum;
                    document.getElementById('res_weight_unit').innerText = weightUnit;

                    const sugar = parseFloat(d['糖度'] || d.sugar_level || 0);
                    document.getElementById('res_sugar').innerText = sugar.toFixed(1);
                    
                    let sugarPercent = ((sugar - 10) / (16 - 10)) * 100;
                    if (sugarPercent < 5) sugarPercent = 5;
                    if (sugarPercent > 100) sugarPercent = 100;
                    
                    setTimeout(() => {
                        document.getElementById('sugarBar').style.width = sugarPercent + '%';
                    }, 100);

                } else {
                    document.getElementById('statusText').innerText = "❌ 验证失败：未找到档案";
                    document.getElementById('statusText').style.color = "#dc2626";
                    document.getElementById('statusScreen').querySelector('.loader').style.display = 'none';
                }
            })
            .catch(() => {
                document.getElementById('statusText').innerText = "❌ 网络异常，请稍后再试";
                document.getElementById('statusScreen').querySelector('.loader').style.display = 'none';
            });
    }, 1200);
} else {
    document.getElementById('statusText').innerText = "🍊 请扫描包装盒上的助农溯源码";
    document.getElementById('statusScreen').querySelector('.loader').style.display = 'none';
}