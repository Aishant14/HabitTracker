from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta

class Habit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
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
