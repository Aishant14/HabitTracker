from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import date, timedelta
import calendar

class HabitManager(models.Manager):
    """Custom manager for Habit model"""
    
    def active_for_user(self, user):
        """Get active habits for a user"""
        return self.filter(user=user, is_active=True)
    
    def with_completion_data(self, user, date_range=30):
        """Get habits with completion data"""
        from django.db.models import Count, Case, When, IntegerField
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range)
        
        return self.active_for_user(user).annotate(
            completions_count=Count(
                'habitcompletion',
                filter=models.Q(
                    habitcompletion__date__gte=start_date,
                    habitcompletion__date__lte=end_date
                )
            ),
            completion_rate=Case(
                When(completions_count=0, then=0),
                default=models.F('completions_count') * 100 / date_range,
                output_field=models.FloatField()
            )
        )


class Habit(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default='daily')
    target_per_week = models.PositiveIntegerField(default=7, validators=[MinValueValidator(1), MaxValueValidator(7)])
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    objects = HabitManager()
    
    def __str__(self):
        return self.name
    
    @property
    def current_streak(self):
        """Calculate current streak for this habit"""
        today = date.today()
        streak = 0
        check_date = today
        
        while True:
            if HabitCompletion.objects.filter(habit=self, date=check_date).exists():
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        return streak
    
    @property
    def completion_percentage(self):
        """Get completion percentage for last 30 days"""
        thirty_days_ago = date.today() - timedelta(days=30)
        total_days = 30
        completed_days = HabitCompletion.objects.filter(
            habit=self, 
            date__gte=thirty_days_ago
        ).count()
        return (completed_days / total_days) * 100
    
    @property
    def longest_streak(self):
        """Calculate the longest streak ever achieved"""
        completions = HabitCompletion.objects.filter(
            habit=self
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
    
    @property
    def this_week_completions(self):
        """Get completions for current week"""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        return HabitCompletion.objects.filter(
            habit=self,
            date__gte=week_start,
            date__lte=today
        ).count()
    
    @property
    def this_month_completions(self):
        """Get completions for current month"""
        today = date.today()
        month_start = today.replace(day=1)
        return HabitCompletion.objects.filter(
            habit=self,
            date__gte=month_start,
            date__lte=today
        ).count()
    
    @property
    def priority_color(self):
        """Get color based on priority"""
        priority_colors = {
            'low': '#28a745',
            'medium': '#17a2b8', 
            'high': '#ffc107',
            'critical': '#dc3545'
        }
        return priority_colors.get(self.priority, '#17a2b8')
    
    @property
    def completion_status(self):
        """Get completion status for today"""
        return HabitCompletion.objects.filter(
            habit=self,
            date=date.today()
        ).exists()
    
    def get_completion_data_for_period(self, days=30):
        """Get detailed completion data for a period"""
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        completions = HabitCompletion.objects.filter(
            habit=self,
            date__gte=start_date,
            date__lte=end_date
        ).values_list('date', flat=True)
        
        completion_dates = set(completions)
        period_data = []
        
        current_date = start_date
        while current_date <= end_date:
            period_data.append({
                'date': current_date,
                'completed': current_date in completion_dates,
                'day_name': current_date.strftime('%A')[:3]
            })
            current_date += timedelta(days=1)
        
        return period_data
    
    def get_monthly_calendar_data(self, year=None, month=None):
        """Get calendar data for a specific month"""
        if not year:
            year = date.today().year
        if not month:
            month = date.today().month
            
        cal = calendar.monthcalendar(year, month)
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])
        
        completions = set(HabitCompletion.objects.filter(
            habit=self,
            date__gte=month_start,
            date__lte=month_end
        ).values_list('date', flat=True))
        
        calendar_data = []
        for week in cal:
            week_data = []
            for day in week:
                if day == 0:
                    week_data.append(None)
                else:
                    day_date = date(year, month, day)
                    week_data.append({
                        'day': day,
                        'date': day_date,
                        'completed': day_date in completions,
                        'is_today': day_date == date.today(),
                        'is_future': day_date > date.today()
                    })
            calendar_data.append(week_data)
        
        return calendar_data

class HabitCompletion(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('habit', 'date')
    
    def __str__(self):
        return f"{self.habit.name} - {self.date}"

class Badge(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='🏆')  # Emoji icon
    requirement_days = models.IntegerField()  # Days needed for streak
    
    def __str__(self):
        return self.name

class UserBadge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'badge', 'habit')
    
    def __str__(self):
        return f"{self.user.username} earned {self.badge.name} for {self.habit.name}"

# Strength Training Models
class MuscleGroup(models.Model):
    name = models.CharField(max_length=100)
    highlight_color = models.CharField(max_length=7, default='#FF5733')  # Hex color for highlighting
    svg_id = models.CharField(max_length=50)  # ID for SVG element in diagram

    def __str__(self):
        return self.name

class Exercise(models.Model):
    name = models.CharField(max_length=100)
    muscle_group = models.ForeignKey(MuscleGroup, on_delete=models.CASCADE)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.muscle_group.name})"

class Workout(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    sets = models.IntegerField(default=3)
    reps = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'exercise')

    def __str__(self):
        return f"{self.user.username} - {self.exercise.name}: {self.sets}x{self.reps}"
