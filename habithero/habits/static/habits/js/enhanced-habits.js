/**
 * Enhanced Habit Tracker JavaScript Utilities
 * Provides dynamic UI interactions and animations
 */

class HabitTracker {
    constructor() {
        this.initializeEventListeners();
        this.animateStatsOnLoad();
        this.setupTooltips();
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupCSRFToken();
            this.initializeAnimations();
            this.setupProgressBars();
        });
    }

    setupCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (!csrfToken) {
            const token = document.createElement('input');
            token.type = 'hidden';
            token.name = 'csrfmiddlewaretoken';
            token.value = document.querySelector('meta[name="csrf-token"]')?.content || '';
            document.body.appendChild(token);
        }
    }

    animateStatsOnLoad() {
        const statsNumbers = document.querySelectorAll('.stats-number');
        statsNumbers.forEach((stat, index) => {
            const finalValue = parseInt(stat.textContent) || 0;
            stat.textContent = '0';
            
            setTimeout(() => {
                this.animateNumber(stat, 0, finalValue, 1000);
            }, index * 200);
        });
    }

    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        const range = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easeOutCubic(progress);
            const current = Math.floor(start + (range * easedProgress));
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    setupProgressBars() {
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach((bar, index) => {
            const width = bar.style.width || '0%';
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.transition = 'width 1s ease-out';
                bar.style.width = width;
            }, index * 100);
        });
    }

    initializeAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.habit-card, .stats-card').forEach(el => {
            observer.observe(el);
        });
    }

    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(event) {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = event.target.getAttribute('data-tooltip');
        
        document.body.appendChild(tooltip);
        
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        
        requestAnimationFrame(() => {
            tooltip.classList.add('show');
        });
    }

    hideTooltip() {
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 200);
        }
    }
}

// Enhanced habit toggle function
function toggleHabit(habitId, button) {
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
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
        // Update button state with animation
        if (data.completed) {
            button.classList.add('completed');
            button.innerHTML = '<i class="bi bi-check"></i>';
            button.style.animation = 'completionPulse 0.6s ease-out';
        } else {
            button.classList.remove('completed');
            button.innerHTML = '<i class="bi bi-check"></i>';
        }
        
        // Show enhanced toast
        showEnhancedToast(data.message, data.completed ? 'success' : 'info');
        
        // Update streak display with animation
        const streakBadge = button.closest('.card-body').querySelector('.streak-badge');
        if (data.streak > 0 && streakBadge) {
            streakBadge.innerHTML = `🔥 ${data.streak} day${data.streak > 1 ? 's' : ''}`;
            streakBadge.style.animation = 'bounce 0.5s ease-in-out';
        }
        
        // Update stats with smooth transition
        updateStatsWithAnimation();
    })
    .catch(error => {
        console.error('Error:', error);
        button.innerHTML = originalContent;
        showEnhancedToast('An error occurred. Please try again.', 'error');
    })
    .finally(() => {
        button.disabled = false;
    });
}

function showEnhancedToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `enhanced-toast toast-${type}`;
    
    const icon = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    }[type];
    
    toast.innerHTML = `
        <i class="bi ${icon}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateStatsWithAnimation() {
    const statsCards = document.querySelectorAll('.stats-card');
    statsCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'pulse 0.3s ease-in-out';
        }, index * 100);
    });
    
    // Reload page after animation
    setTimeout(() => {
        location.reload();
    }, 1000);
}

function markAllComplete() {
    const completionButtons = document.querySelectorAll('.completion-btn:not(.completed)');
    
    if (completionButtons.length === 0) {
        showEnhancedToast('All habits already completed for today! 🎉', 'success');
        return;
    }
    
    let completed = 0;
    const total = completionButtons.length;
    
    completionButtons.forEach((button, index) => {
        setTimeout(() => {
            const habitId = button.getAttribute('onclick').match(/\d+/)[0];
            toggleHabit(habitId, button);
            completed++;
            
            if (completed === total) {
                setTimeout(() => {
                    showEnhancedToast(`Completed all ${total} habits! Amazing! 🚀`, 'success');
                }, 500);
            }
        }, index * 200);
    });
}

// Initialize the habit tracker
const habitTracker = new HabitTracker();
