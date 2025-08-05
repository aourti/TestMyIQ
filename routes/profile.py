from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from extensions import db
from models.test_session import TestSession
from models.response import Response
from models.question import Question
from models.user import User
from sqlalchemy import func
import json

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

@profile_bp.route('/')
@login_required
def index():
    # Get user's test history
    test_history = TestSession.query.filter_by(user_id=current_user.id).order_by(TestSession.start_time.desc()).all()
    
    # Get overall statistics
    total_tests = len(test_history)
    if total_tests > 0:
        # Filter out None scores for calculations
        valid_scores = [test.score for test in test_history if test.score is not None]
        if valid_scores:
            avg_score = sum(valid_scores) / len(valid_scores)
            best_score = max(valid_scores)
        else:
            avg_score = best_score = 0
        total_questions_attempted = sum(test.total_questions or 0 for test in test_history)
    else:
        avg_score = best_score = total_questions_attempted = 0

    # Get category-wise performance
    category_stats = db.session.query(
        Question.category,
        func.count(Response.id).label('attempts'),
        func.avg(Response.is_correct).label('success_rate')
    ).join(Response, Response.question_id == Question.id)\
     .join(TestSession, TestSession.id == Response.test_session_id)\
     .filter(TestSession.user_id == current_user.id)\
     .group_by(Question.category).all()

    # Convert to list with percentage values
    category_stats_list = [
        {
            'category': stat.category,
            'attempts': stat.attempts,
            'success_rate': float(stat.success_rate or 0) * 100
        }
        for stat in category_stats
    ]

    # Get difficulty-wise performance
    difficulty_stats = db.session.query(
        Question.difficulty,
        func.count(Response.id).label('attempts'),
        func.avg(Response.is_correct).label('success_rate')
    ).join(Response, Response.question_id == Question.id)\
     .join(TestSession, TestSession.id == Response.test_session_id)\
     .filter(TestSession.user_id == current_user.id)\
     .group_by(Question.difficulty).all()

    # Convert to list with percentage values
    difficulty_stats_list = [
        {
            'difficulty': stat.difficulty,
            'attempts': stat.attempts,
            'success_rate': float(stat.success_rate or 0) * 100
        }
        for stat in difficulty_stats
    ]

    # Get response time statistics
    avg_response_time = db.session.query(
        func.avg(Response.response_time)
    ).join(TestSession, TestSession.id == Response.test_session_id)\
     .filter(TestSession.user_id == current_user.id).scalar() or 0

    # Get improvement trend (scores over time)
    scores_trend = [
        {
            'date': test.start_time.strftime('%Y-%m-%d'),
            'score': test.score or 0,
            'total': test.total_questions or 0
        }
        for test in test_history
    ]

    # Get recent test details
    recent_tests = []
    for test in test_history[:5]:  # Last 5 tests
        responses = Response.query.filter_by(test_session_id=test.id).all()
        correct_responses = sum(1 for r in responses if r.is_correct)
        response_times = [r.response_time for r in responses if r.response_time is not None]
        avg_time = sum(response_times) / len(response_times) if response_times else 0
        
        recent_tests.append({
            'date': test.start_time.strftime('%Y-%m-%d %H:%M'),
            'score': test.score or 0,
            'total': test.total_questions or 0,
            'percentage': (test.score / test.total_questions * 100) if test.score and test.total_questions and test.total_questions > 0 else 0,
            'avg_response_time': round(avg_time, 2),
            'correct_responses': correct_responses
        })

    return render_template('profile/index.html',
                         user=current_user,
                         total_tests=total_tests,
                         avg_score=round(avg_score, 2),
                         best_score=best_score,
                         total_questions=total_questions_attempted,
                         category_stats=category_stats_list,
                         difficulty_stats=difficulty_stats_list,
                         avg_response_time=round(avg_response_time, 2),
                         scores_trend=json.dumps(scores_trend),
                         recent_tests=recent_tests)

@profile_bp.route('/update', methods=['POST'])
@login_required
def update():
    username = request.form.get('username')
    email = request.form.get('email')
    age = request.form.get('age')
    
    # Validate age
    try:
        age = int(age)
        if age < 13 or age > 120:
            flash('Please enter a valid age between 13 and 120', 'error')
            return redirect(url_for('profile.index'))
    except (ValueError, TypeError):
        flash('Please enter a valid age', 'error')
        return redirect(url_for('profile.index'))
    
    # Check if username or email already exists (excluding current user)
    if User.query.filter(User.username == username, User.id != current_user.id).first():
        flash('Username already exists', 'error')
        return redirect(url_for('profile.index'))
        
    if User.query.filter(User.email == email, User.id != current_user.id).first():
        flash('Email already registered', 'error')
        return redirect(url_for('profile.index'))
    
    # Update user information
    current_user.username = username
    current_user.email = email
    current_user.age = age
    
    db.session.commit()
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('profile.index'))
