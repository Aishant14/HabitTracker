from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('signup/', views.signup, name='signup'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', views.custom_logout, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('add/', views.add_habit, name='add_habit'),
    path('edit/<int:habit_id>/', views.edit_habit, name='edit_habit'),
    path('delete/<int:habit_id>/', views.delete_habit, name='delete_habit'),
    path('toggle/<int:habit_id>/', views.toggle_habit, name='toggle_habit'),
    path('calendar/<int:habit_id>/', views.habit_calendar, name='habit_calendar'),
    path('contact/', views.contact, name='contact'),
    path('about/', views.about, name='about'),
    # Strength Training URLs
    path('strength/', views.strength_training, name='strength_training'),
    path('update-workout/', views.update_workout, name='update_workout'),
]
