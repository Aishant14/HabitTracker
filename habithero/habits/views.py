from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from datetime import date, timedelta
from .models import Habit, HabitCompletion, Badge, UserBadge, MuscleGroup, Exercise, Workout
from .forms import HabitForm
import json

def home(request):
    """Home page - redirect to dashboard if logged in"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'habits/home.html')

def signup(request):
    """User registration"""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}!')
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'registration/signup.html', {'form': form})

@login_required
def dashboard(request):
    """Main dashboard showing all user habits"""
    habits = Habit.objects.filter(user=request.user, is_active=True)
    today = date.today()
    
    # Get today's completions
    today_completions = HabitCompletion.objects.filter(
        habit__user=request.user, 
        date=today
    ).values_list('habit_id', flat=True)
    
    # Get user's badges
    user_badges = UserBadge.objects.filter(user=request.user).select_related('badge')
    
    context = {
        'habits': habits,
        'today_completions': list(today_completions),
        'user_badges': user_badges,
        'today': today,
    }
    
    return render(request, 'habits/dashboard.html', context)

@login_required
def add_habit(request):
    """Add a new habit"""
    if request.method == 'POST':
        form = HabitForm(request.POST)
        if form.is_valid():
            habit = form.save(commit=False)
            habit.user = request.user
            habit.save()
            messages.success(request, f'Habit "{habit.name}" created successfully!')
            return redirect('dashboard')
    else:
        form = HabitForm()
    
    return render(request, 'habits/add_habit.html', {'form': form})

@login_required
def edit_habit(request, habit_id):
    """Edit an existing habit"""
    habit = get_object_or_404(Habit, id=habit_id, user=request.user)
    
    if request.method == 'POST':
        form = HabitForm(request.POST, instance=habit)
        if form.is_valid():
            form.save()
            messages.success(request, f'Habit "{habit.name}" updated successfully!')
            return redirect('dashboard')
    else:
        form = HabitForm(instance=habit)
    
    return render(request, 'habits/edit_habit.html', {'form': form, 'habit': habit})

@login_required
def delete_habit(request, habit_id):
    """Delete a habit"""
    habit = get_object_or_404(Habit, id=habit_id, user=request.user)
    
    if request.method == 'POST':
        habit_name = habit.name
        habit.delete()
        messages.success(request, f'Habit "{habit_name}" deleted successfully!')
        return redirect('dashboard')
    
    return render(request, 'habits/delete_habit.html', {'habit': habit})

@login_required
def toggle_habit(request, habit_id):
    """Toggle habit completion for today"""
    habit = get_object_or_404(Habit, id=habit_id, user=request.user)
    today = date.today()
    
    completion, created = HabitCompletion.objects.get_or_create(
        habit=habit,
        date=today
    )
    
    if not created:
        # If completion exists, remove it (unchecking)
        completion.delete()
        completed = False
        message = f'Unchecked {habit.name} for today'
    else:
        completed = True
        message = f'Completed {habit.name} for today! 🎉'
        
        # Check for new badges
        check_and_award_badges(request.user, habit)
    
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'completed': completed,
            'message': message,
            'streak': habit.current_streak
        })
    
    messages.success(request, message)
    return redirect('dashboard')

@login_required
def habit_calendar(request, habit_id):
    """Show calendar view for a specific habit"""
    habit = get_object_or_404(Habit, id=habit_id, user=request.user)
    
    # Get completions for the last 365 days
    year_ago = date.today() - timedelta(days=365)
    completions = HabitCompletion.objects.filter(
        habit=habit,
        date__gte=year_ago
    ).values_list('date', flat=True)
    
    completion_dates = [d.isoformat() for d in completions]
    
    context = {
        'habit': habit,
        'completion_dates': json.dumps(completion_dates),
    }
    
    return render(request, 'habits/calendar.html', context)

def check_and_award_badges(user, habit):
    """Check if user earned any new badges and award them"""
    current_streak = habit.current_streak
    
    # Define streak milestones
    milestones = [3, 7, 14, 30, 60, 100, 365]
    
    for milestone in milestones:
        if current_streak >= milestone:
            # Check if badge exists for this milestone
            badge, created = Badge.objects.get_or_create(
                requirement_days=milestone,
                defaults={
                    'name': f'{milestone} Day Streak',
                    'description': f'Completed a habit for {milestone} consecutive days!',
                    'icon': '🔥' if milestone < 30 else '⭐' if milestone < 100 else '👑'
                }
            )
            
            # Award badge if user doesn't have it for this habit
            user_badge, badge_created = UserBadge.objects.get_or_create(
                user=user,
                badge=badge,
                habit=habit
            )
            
            if badge_created:
                messages.success(
                    request=None,  # Will be handled in the view
                    message=f'🏆 New badge earned: {badge.name} for {habit.name}!'
                )

def contact(request):
    """Contact Us page"""
    return render(request, 'habits/contact.html')

def about(request):
    """About Us page"""
    return render(request, 'habits/about.html')

def custom_logout(request):
    """Custom logout view with confirmation message"""
    from django.contrib.auth import logout
    from django.contrib import messages
    
    if request.method == 'POST':
        username = request.user.username if request.user.is_authenticated else 'User'
        logout(request)
        messages.success(request, f'👋 Goodbye {username}! You have been logged out successfully.')
        return redirect('home')
    
    return redirect('home')

# Strength Training Views
@login_required
def strength_training(request):
    """Strength training main page with muscle diagram"""
    muscle_groups = MuscleGroup.objects.all()
    exercises = Exercise.objects.select_related('muscle_group')
    user_workouts = Workout.objects.filter(user=request.user).select_related('exercise')
    
    # Create a dictionary of user workouts for easy lookup
    workout_dict = {workout.exercise.id: workout for workout in user_workouts}
    
    context = {
        'muscle_groups': muscle_groups,
        'exercises': exercises,
        'workout_dict': workout_dict,
    }
    
    return render(request, 'habits/strength_training.html', context)

@login_required
def update_workout(request):
    """Update workout sets/reps via AJAX"""
    if request.method == 'POST':
        exercise_id = request.POST.get('exercise_id')
        sets = int(request.POST.get('sets', 3))
        reps = int(request.POST.get('reps', 10))
        
        if exercise_id:
            exercise = get_object_or_404(Exercise, id=exercise_id)
            workout, created = Workout.objects.get_or_create(
                user=request.user,
                exercise=exercise,
                defaults={'sets': sets, 'reps': reps}
            )
            
            if not created:
                workout.sets = sets
                workout.reps = reps
                workout.save()
            
            return JsonResponse({
                'success': True,
                'sets': workout.sets,
                'reps': workout.reps
            })
    
    return JsonResponse({'success': False})
