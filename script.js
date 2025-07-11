// DOM読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    // ナビゲーション機能
    initNavigation();
    
    // スキルバーアニメーション
    initSkillBars();
    
    // コンタクトフォーム機能
    initContactForm();
    
    // スムーススクロール
    initSmoothScroll();
    
    // パーティクル背景
    initParticleBackground();
    
    // ヘッダースクロール効果
    initHeaderScroll();
});

// ナビゲーション機能
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });
    
    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // スキルセクションが表示されたときにアニメーション実行
            if (targetId === 'skills') {
                animateSkillBars();
            }
        }
    }
}

// スキルバーアニメーション
function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    skillBars.forEach(bar => {
        bar.style.width = '0%';
    });
}

function animateSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    skillBars.forEach((bar, index) => {
        const targetWidth = bar.getAttribute('data-width');
        
        setTimeout(() => {
            bar.style.width = targetWidth + '%';
        }, index * 200);
    });
}

// コンタクトフォーム機能
function initContactForm() {
    const form = document.querySelector('.contact-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(form);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // 簡単なバリデーション
            if (!name || !email || !message) {
                showNotification('すべてのフィールドを入力してください。', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('有効なメールアドレスを入力してください。', 'error');
                return;
            }
            
            // フォーム送信のシミュレーション
            showNotification('メッセージを送信しました！', 'success');
            form.reset();
        });
    }
}

// メールアドレスの妥当性チェック
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 通知表示機能
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // スタイル設定
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #f44336, #da190b)';
    } else {
        notification.style.background = 'linear-gradient(45deg, #00d4ff, #0099cc)';
    }
    
    document.body.appendChild(notification);
    
    // アニメーション表示
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 3秒後に非表示
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// スムーススクロール
function initSmoothScroll() {
    const ctaButton = document.querySelector('.cta-button');
    
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // セクション切り替え
            const sections = document.querySelectorAll('section');
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    }
}

// パーティクル背景効果
function initParticleBackground() {
    const canvas = document.getElementById('background-canvas');
    if (!canvas) return;
    
    // キャンバスを作成してパーティクル効果を追加
    const particleCanvas = document.createElement('canvas');
    particleCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
    `;
    
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    
    function createParticle() {
        return {
            x: Math.random() * particleCanvas.width,
            y: Math.random() * particleCanvas.height,
            size: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2
        };
    }
    
    function initParticles() {
        particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push(createParticle());
        }
    }
    
    function updateParticles() {
        particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // 画面外に出たら反対側から出現
            if (particle.x < 0) particle.x = particleCanvas.width;
            if (particle.x > particleCanvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = particleCanvas.height;
            if (particle.y > particleCanvas.height) particle.y = 0;
        });
    }
    
    function drawParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        // パーティクル間の線を描画
        particles.forEach((particle, i) => {
            particles.slice(i + 1).forEach(otherParticle => {
                const distance = Math.sqrt(
                    Math.pow(particle.x - otherParticle.x, 2) +
                    Math.pow(particle.y - otherParticle.y, 2)
                );
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - distance / 100)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        });
    }
    
    function animate() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animate);
    }
    
    // 初期化
    resizeCanvas();
    initParticles();
    
    // イベントリスナー
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });
    
    // キャンバスをDOMに追加
    canvas.parentNode.insertBefore(particleCanvas, canvas.nextSibling);
    
    // アニメーション開始
    animate();
}

// ヘッダースクロール効果
function initHeaderScroll() {
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // 下スクロール時は隠す
            header.style.transform = 'translateY(-100%)';
        } else {
            // 上スクロール時は表示
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    });
}

// プロジェクトカードのホバー効果
document.addEventListener('DOMContentLoaded', function() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// タイピングアニメーション効果
function initTypingAnimation() {
    const typingElements = document.querySelectorAll('.typing-text');
    
    typingElements.forEach(element => {
        const text = element.textContent;
        element.textContent = '';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            
            if (i >= text.length) {
                clearInterval(typeInterval);
            }
        }, 100);
    });
}

// ページ読み込み時の初期アニメーション
window.addEventListener('load', function() {
    setTimeout(() => {
        initTypingAnimation();
    }, 500);
});