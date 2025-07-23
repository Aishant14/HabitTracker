/**
 * HabitHero JavaScript Utilities
 * Reduces HTML by handling dynamic functionality
 */

class HabitUtils {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAnimations();
        this.createCSRFToken();
    }

    setupEventListeners() {
        // Habit completion buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.completion-btn')) {
                const button = e.target.closest('.completion-btn');
                const habitId = button.dataset.habitId;
                this.toggleHabit(habitId, button);
            }
        });

        // Mark all complete button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="mark-all-complete"]')) {
                this.markAllComplete();
            }
        });

        // Stats card animations
        this.animateStatsCards();
    }

    async toggleHabit(habitId, button) {
        try {
            const response = await fetch(`/toggle/${habitId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();
            
            // Update button state
            button.classList.toggle('completed', data.completed);
            
            // Update streak display
            this.updateStreakDisplay(button, data.streak);
            
            // Show notification
            this.showToast(data.message);
            
            // Update stats
            this.updateStats();
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('An error occurred. Please try again.', 'error');
        }
    }

    updateStreakDisplay(button, streak) {
        const card = button.closest('.habit-card');
        const streakBadge = card.querySelector('.streak-badge');
        
        if (streak > 0) {
            if (streakBadge) {
                streakBadge.innerHTML = `🔥 ${streak} day${streak > 1 ? 's' : ''}`;
            } else {
                // Create streak badge if it doesn't exist
                const title = card.querySelector('h6');
                const badge = document.createElement('span');
                badge.className = 'streak-badge';
                badge.innerHTML = `🔥 ${streak} day${streak > 1 ? 's' : ''}`;
                title.parentNode.appendChild(badge);
            }
        }
    }

    showToast(message, type = 'success') {
        // Create toast dynamically instead of having HTML
        const toastContainer = this.getOrCreateToastContainer();
        const toast = this.createToast(message, type);
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        
        const iconClass = type === 'error' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-success';
        
        toast.innerHTML = `
            <div class="toast-header">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">HabitHero</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        return toast;
    }

    getOrCreateToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }
        return container;
    }

    markAllComplete() {
        const incompleteButtons = document.querySelectorAll('.completion-btn:not(.completed)');
        
        if (incompleteButtons.length === 0) {
            this.showToast('All habits already completed for today! 🎉');
            return;
        }
        
        incompleteButtons.forEach(button => {
            const habitId = button.dataset.habitId;
            this.toggleHabit(habitId, button);
        });
    }

    updateStats() {
        // Refresh stats after a short delay
        setTimeout(() => {
            location.reload();
        }, 1000);
    }

    animateStatsCards() {
        const statsCards = document.querySelectorAll('[data-animate="true"]');
        
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'slideInUp 0.6s ease-out';
                }
            });
        });

        statsCards.forEach(card => observer.observe(card));
    }

    setupAnimations() {
        // Add CSS animations dynamically
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .habit-card {
                transition: all 0.3s ease;
            }
            
            .completion-btn {
                transition: all 0.3s ease;
            }
            
            .completion-btn:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);
    }

    createCSRFToken() {
        if (!document.querySelector('[name=csrfmiddlewaretoken]')) {
            const csrfToken = document.createElement('input');
            csrfToken.type = 'hidden';
            csrfToken.name = 'csrfmiddlewaretoken';
            csrfToken.value = this.getCSRFFromCookie();
            document.body.appendChild(csrfToken);
        }
    }

    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : this.getCSRFFromCookie();
    }

    getCSRFFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.habitUtils = new HabitUtils();
});

// Utility functions for templates
window.HabitHelpers = {
    // Create stats card programmatically
    createStatsCard(icon, value, label, iconColor = 'text-primary') {
        return `
            <div class="col-md-3">
                <div class="stats-card" data-animate="true">
                    <i class="bi ${icon} display-4 mb-3 ${iconColor}"></i>
                    <div class="stats-number">${value}</div>
                    <p class="mb-0">${label}</p>
                </div>
            </div>
        `;
    },

    // Create action buttons programmatically
    createActionButton(url, icon, text, className = 'btn-primary') {
        return `
            <a href="${url}" class="btn ${className}">
                <i class="bi ${icon} me-2"></i>${text}
            </a>
        `;
    }
};
