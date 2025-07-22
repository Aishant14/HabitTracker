// HabitHero Enhanced JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeEnhancements();
    setupNotifications();
    addKeyboardShortcuts();
});

function initializeEnhancements() {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Add loading animations
    animateOnScroll();
    
    // Initialize tooltips
    initializeTooltips();
    
    // Add particle effect
    createParticleEffect();
}

function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
            }
        });
    });
    
    // Observe all cards and stats
    document.querySelectorAll('.card, .stats-card').forEach(el => {
        observer.observe(el);
    });
}

function initializeTooltips() {
    // Add tooltips to buttons
    const tooltips = {
        '.completion-btn': 'Click to mark habit as complete',
        '.btn-primary': 'Primary action button',
        '.streak-badge': 'Current streak count'
    };
    
    Object.entries(tooltips).forEach(([selector, text]) => {
        document.querySelectorAll(selector).forEach(el => {
            el.setAttribute('title', text);
        });
    });
}

function createParticleEffect() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    canvas.style.opacity = '0.1';
    
    document.body.appendChild(canvas);
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const particles = [];
    
    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: canvas.height + 10,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -Math.random() * 2 - 0.5,
            radius: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.5
        };
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add new particles occasionally
        if (Math.random() < 0.02) {
            particles.push(createParticle());
        }
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= 0.005;
            
            if (p.y < -10 || p.opacity <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

function setupNotifications() {
    // Enhanced notification system
    window.showNotification = function(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease',
            zIndex: '1000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    };
}

function addKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + N for new habit
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            const addButton = document.querySelector('a[href*="add_habit"]');
            if (addButton) addButton.click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            });
        }
    });
}

// Enhanced habit toggle function
function toggleHabitEnhanced(habitId, button) {
    // Add loading state
    button.classList.add('loading');
    button.disabled = true;
    
    fetch(`/toggle/${habitId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest',
        },
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading state
        button.classList.remove('loading');
        button.disabled = false;
        
        // Update button state with animation
        if (data.completed) {
            button.classList.add('completed');
            showCelebration(button);
        } else {
            button.classList.remove('completed');
        }
        
        // Show notification
        showNotification(data.message);
        
        // Update streak with animation
        updateStreakDisplay(button, data.streak);
        
        // Confetti effect for milestones
        if (data.streak && data.streak % 7 === 0) {
            createConfetti();
        }
    })
    .catch(error => {
        button.classList.remove('loading');
        button.disabled = false;
        showNotification('An error occurred. Please try again.', 'error');
    });
}

function showCelebration(button) {
    // Create celebration animation
    const celebration = document.createElement('div');
    celebration.innerHTML = '🎉';
    celebration.style.cssText = `
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 24px;
        pointer-events: none;
        animation: celebrationPop 0.8s ease-out forwards;
        z-index: 10;
    `;
    
    button.parentElement.style.position = 'relative';
    button.parentElement.appendChild(celebration);
    
    setTimeout(() => celebration.remove(), 800);
}

function updateStreakDisplay(button, streak) {
    const streakBadge = button.closest('.card-body').querySelector('.streak-badge');
    if (streak > 0 && streakBadge) {
        streakBadge.innerHTML = `🔥 ${streak} day${streak > 1 ? 's' : ''}`;
        streakBadge.style.transform = 'scale(1.1)';
        setTimeout(() => {
            streakBadge.style.transform = 'scale(1)';
        }, 200);
    }
}

function createConfetti() {
    // Simple confetti effect
    for (let i = 0; i < 50; i++) {
        createConfettiPiece();
    }
}

function createConfettiPiece() {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
        position: fixed;
        width: 8px;
        height: 8px;
        background: hsl(${Math.random() * 360}, 70%, 60%);
        top: -10px;
        left: ${Math.random() * window.innerWidth}px;
        animation: confettiFall ${Math.random() * 2 + 3}s linear forwards;
        z-index: 1000;
        pointer-events: none;
    `;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrationPop {
        0% { transform: translateX(-50%) scale(0) rotate(0deg); opacity: 0; }
        50% { transform: translateX(-50%) scale(1.2) rotate(180deg); opacity: 1; }
        100% { transform: translateX(-50%) scale(0) rotate(360deg); opacity: 0; }
    }
    
    @keyframes confettiFall {
        0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    
    @keyframes animate-fadeIn {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fadeIn {
        animation: animate-fadeIn 0.6s ease-out forwards;
    }
    
    .completion-btn.loading {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .completion-btn.loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
