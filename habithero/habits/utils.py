"""
Utility functions for habit tracking calculations and analytics
"""
from datetime import date, timedelta
from django.db.models import Count, Q
from .models import Habit, HabitCompletion, UserBadge, Badge


class HabitAnalytics:
    """Class to handle habit analytics and calculations"""
    
    def __init__(self, user):
        self.user = user
        self.today = date.today()
    
    def get_completion_rate(self, habit, days=30):
        """Calculate completion rate for a habit over specified days"""
        start_date = self.today - timedelta(days=days)
        total_days = days
        completed_days = HabitCompletion.objects.filter(
            habit=habit,
            date__gte=start_date,
            date__lte=self.today
        ).count()
        return round((completed_days / total_days) * 100, 1)
    
    def get_longest_streak(self, habit):
        """Calculate the longest streak for a habit"""
        completions = HabitCompletion.objects.filter(
            habit=habit
        ).order_by('date').values_list('date', flat=True)
        
        if not completions:
            return 0
        
        max_streak = current_streak = 1
        prev_date = list(completions)[0]
        
        for completion_date in list(completions)[1:]:
            if completion_date == prev_date + timedelta(days=1):
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1
            prev_date = completion_date
        
        return max_streak
    
    def get_weekly_summary(self):
        """Get weekly completion summary"""
        week_ago = self.today - timedelta(days=7)
        habits = Habit.objects.filter(user=self.user, is_active=True)
        
        summary = []
        for habit in habits:
            completions = HabitCompletion.objects.filter(
                habit=habit,
                date__gte=week_ago,
                date__lte=self.today
            ).count()
            
            summary.append({
                'habit': habit,
                'completions': completions,
                'completion_rate': round((completions / 7) * 100, 1),
                'current_streak': habit.current_streak,
                'longest_streak': self.get_longest_streak(habit)
            })
        
        return summary
    
    def get_dashboard_stats(self):
        """Get comprehensive dashboard statistics"""
        habits = Habit.objects.filter(user=self.user, is_active=True)
        today_completions = HabitCompletion.objects.filter(
            habit__user=self.user,
            date=self.today
        ).values_list('habit_id', flat=True)
        
        user_badges = UserBadge.objects.filter(user=self.user)
        total_streaks = sum(habit.current_streak for habit in habits)
        
        # Calculate additional metrics
        total_completions = HabitCompletion.objects.filter(
            habit__user=self.user
        ).count()
        
        avg_completion_rate = sum(
            self.get_completion_rate(habit) for habit in habits
        ) / len(habits) if habits else 0
        
        return {
            'active_habits': habits.count(),
            'today_completions': len(today_completions),
            'total_badges': user_badges.count(),
            'total_streaks': total_streaks,
            'total_completions': total_completions,
            'avg_completion_rate': round(avg_completion_rate, 1),
            'habits': habits,
            'today_completions_list': list(today_completions),
            'user_badges': user_badges.select_related('badge', 'habit')
        }


class BadgeManager:
    """Manages badge awarding logic"""
    
    STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]
    COMPLETION_MILESTONES = [10, 25, 50, 100, 250, 500, 1000]
    
    def __init__(self, user):
        self.user = user
    
    def check_streak_badges(self, habit):
        """Check and award streak-based badges"""
        current_streak = habit.current_streak
        badges_awarded = []
        
        for milestone in self.STREAK_MILESTONES:
            if current_streak >= milestone:
                badge, created = Badge.objects.get_or_create(
                    requirement_days=milestone,
                    badge_type='streak',
                    defaults={
                        'name': f'{milestone} Day Streak',
                        'description': f'Completed a habit for {milestone} consecutive days!',
                        'icon': self._get_streak_icon(milestone)
                    }
                )
                
                user_badge, badge_created = UserBadge.objects.get_or_create(
                    user=self.user,
                    badge=badge,
                    habit=habit
                )
                
                if badge_created:
                    badges_awarded.append(badge)
        
        return badges_awarded
    
    def check_completion_badges(self):
        """Check and award completion-based badges"""
        total_completions = HabitCompletion.objects.filter(
            habit__user=self.user
        ).count()
        
        badges_awarded = []
        
        for milestone in self.COMPLETION_MILESTONES:
            if total_completions >= milestone:
                badge, created = Badge.objects.get_or_create(
                    requirement_days=milestone,
                    badge_type='completion',
                    defaults={
                        'name': f'{milestone} Completions',
                        'description': f'Completed habits {milestone} times!',
                        'icon': self._get_completion_icon(milestone)
                    }
                )
                
                # For completion badges, we don't tie to specific habits
                user_badge, badge_created = UserBadge.objects.get_or_create(
                    user=self.user,
                    badge=badge,
                    habit=None  # Completion badges aren't tied to specific habits
                )
                
                if badge_created:
                    badges_awarded.append(badge)
        
        return badges_awarded
    
    def _get_streak_icon(self, milestone):
        """Get appropriate icon for streak milestone"""
        if milestone < 7:
            return '🔥'
        elif milestone < 30:
            return '⭐'
        elif milestone < 100:
            return '💎'
        else:
            return '👑'
    
    def _get_completion_icon(self, milestone):
        """Get appropriate icon for completion milestone"""
        if milestone < 50:
            return '🎯'
        elif milestone < 250:
            return '🏆'
        else:
            return '👑'


def calculate_habit_color_intensity(completion_rate):
    """Calculate color intensity based on completion rate"""
    if completion_rate >= 90:
        return 'success'
    elif completion_rate >= 70:
        return 'warning'
    elif completion_rate >= 50:
        return 'info'
    else:
        return 'danger'


def get_motivational_message(completion_rate, streak):
    """Get motivational message based on performance"""
    if completion_rate >= 90 and streak >= 7:
        return "🔥 You're on fire! Keep up the amazing streak!"
    elif completion_rate >= 70:
        return "⭐ Great progress! You're building strong habits!"
    elif completion_rate >= 50:
        return "💪 Good effort! Keep pushing forward!"
    elif streak >= 3:
        return "🌟 Nice streak! Don't break the chain!"
    else:
        return "🚀 Every journey starts with a single step. You got this!"
