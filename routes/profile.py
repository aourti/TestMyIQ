from flask import Blueprint, render_template
from flask_login import login_required, current_user
from extensions import db
from models.test_session import TestSession
from models.response import Response
from models.question import Question
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
        avg_score = sum(test.score for test in test_history) / total_tests
        best_score = max(test.score for test in test_history)
        total_questions_attempted = sum(test.total_questions for test in test_history)
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

    # Get difficulty-wise performance
    difficulty_stats = db.session.query(
        Question.difficulty,
        func.count(Response.id).label('attempts'),
        func.avg(Response.is_correct).label('success_rate')
    ).join(Response, Response.question_id == Question.id)\
     .join(TestSession, TestSession.id == Response.test_session_id)\
     .filter(TestSession.user_id == current_user.id)\
     .group_by(Question.difficulty).all()

    # Get response time statistics
    avg_response_time = db.session.query(
        func.avg(Response.response_time)
    ).join(TestSession, TestSession.id == Response.test_session_id)\
     .filter(TestSession.user_id == current_user.id).scalar() or 0

    # Get improvement trend (scores over time)
    scores_trend = [
        {
            'date': test.start_time.strftime('%Y-%m-%d'),
            'score': test.score,
            'total': test.total_questions
        }
        for test in test_history
    ]

    # Get recent test details
    recent_tests = []
    for test in test_history[:5]:  # Last 5 tests
        responses = Response.query.filter_by(test_session_id=test.id).all()
        correct_responses = sum(1 for r in responses if r.is_correct)
        avg_time = sum(r.response_time for r in responses) / len(responses) if responses else 0
        
        recent_tests.append({
            'date': test.start_time.strftime('%Y-%m-%d %H:%M'),
            'score': test.score,
            'total': test.total_questions,
            'percentage': (test.score / test.total_questions * 100) if test.total_questions > 0 else 0,
            'avg_response_time': round(avg_time, 2),
            'correct_responses': correct_responses
        })

    return render_template('profile/index.html',
                         user=current_user,
                         total_tests=total_tests,
                         avg_score=round(avg_score, 2),
                         best_score=best_score,
                         total_questions=total_questions_attempted,
                         category_stats=category_stats,
                         difficulty_stats=difficulty_stats,
                         avg_response_time=round(avg_response_time, 2),
                         scores_trend=json.dumps(scores_trend),
                         recent_tests=recent_tests)
