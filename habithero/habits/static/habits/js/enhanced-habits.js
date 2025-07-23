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

    // Get CSRF token
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                      document.querySelector('meta[name="csrf-token"]')?.content;
    
    if (!csrfToken) {
        showToast('CSRF token not found. Please refresh the page.', 'error');
        button.innerHTML = originalContent;
        button.disabled = false;
        return;
    }

    fetch(`/toggle/${habitId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Update button state
        if (data.completed) {
            button.classList.add('completed');
            button.innerHTML = '<i class="bi bi-check"></i>';
            button.style.animation = 'completionPulse 0.6s ease-out';
        } else {
            button.classList.remove('completed');
            button.innerHTML = '<i class="bi bi-check"></i>';
        }
        
        // Show toast notification
        showToast(data.message, data.completed ? 'success' : 'info');
        
        // Update streak display
        const streakBadge = button.closest('.card-body').querySelector('.streak-badge');
        if (data.streak > 0 && streakBadge) {
            streakBadge.innerHTML = `🔥 ${data.streak} day${data.streak > 1 ? 's' : ''}`;
            streakBadge.style.animation = 'bounce 0.5s ease-in-out';
        }
        
        // Update stats after a short delay (don't reload page)
        setTimeout(() => {
            updateStatsDisplay();
        }, 500);
    })
    .catch(error => {
        console.error('Error toggling habit:', error);
        button.innerHTML = originalContent;
        showToast('Failed to update habit. Please try again.', 'error');
    })
    .finally(() => {
        button.disabled = false;
    });
}

// Simple toast notification function
function showToast(message, type = 'success') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    const iconClass = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-triangle-fill', 
        info: 'bi-info-circle-fill'
    }[type] || 'bi-info-circle-fill';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="bi ${iconClass}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    // Add styles dynamically
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Update stats display without reloading
function updateStatsDisplay() {
    const statsNumbers = document.querySelectorAll('.stats-number');
    statsNumbers.forEach(stat => {
        stat.style.animation = 'pulse 0.3s ease-in-out';
    });
}

// Enhanced toast function (keeping for compatibility)
function showEnhancedToast(message, type = 'success') {
    showToast(message, type);
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
