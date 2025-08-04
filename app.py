from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from flask_migrate import Migrate
from config import Config
from extensions import db, login_manager, migrate
from datetime import datetime, timedelta
from sqlalchemy import func

def create_app():
    app = Flask(__name__, static_url_path='', static_folder='static')
    app.config.from_object(Config)

    # Initialize Flask extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    # Initialize migrations
    global migrate
    migrate = Migrate(app, db)

    # Import models after db is initialized
    from models.user import User
    from models.test_session import TestSession
    from models.response import Response
    from models.question import Question

    @login_manager.user_loader
    def load_user(id):
        return User.query.get(int(id))

    # Register blueprints
    from routes.auth import auth_bp
    from routes.test import test_bp
    from routes.admin import admin_bp
    from routes.profile import profile_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(test_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(profile_bp)

    @app.route('/')
    def home():
        user_stats = None
        recent_performance = None
        leaderboard = None
        
        if current_user.is_authenticated:
            # Get user statistics
            user_tests = TestSession.query.filter_by(user_id=current_user.id).all()
            
            if user_tests:
                total_tests = len(user_tests)
                scores = [test.score for test in user_tests if test.score is not None]
                avg_score = round(sum(scores) / len(scores), 1) if scores else 0
                best_score = max(scores) if scores else 0
                
                # Calculate streak (consecutive days with tests)
                today = datetime.now().date()
                streak = 0
                check_date = today
                
                while True:
                    has_test = TestSession.query.filter(
                        TestSession.user_id == current_user.id,
                        func.date(TestSession.start_time) == check_date
                    ).first()
                    
                    if has_test:
                        streak += 1
                        check_date -= timedelta(days=1)
                    else:
                        break
                
                # Count perfect scores
                perfect_scores = sum(1 for test in user_tests 
                                   if test.score == test.total_questions and test.score is not None)
                
                user_stats = {
                    'total_tests': total_tests,
                    'avg_score': avg_score,
                    'best_score': best_score,
                    'streak': streak,
                    'perfect_scores': perfect_scores
                }
                
                # Get recent performance by category (last 7 days)
                week_ago = datetime.now() - timedelta(days=7)
                recent_responses = db.session.query(
                    Question.category,
                    func.count(Response.id).label('total'),
                    func.sum(Response.is_correct).label('correct')
                ).join(
                    Response, Response.question_id == Question.id
                ).join(
                    TestSession, TestSession.id == Response.test_session_id
                ).filter(
                    TestSession.user_id == current_user.id,
                    TestSession.start_time >= week_ago
                ).group_by(Question.category).all()
                
                recent_performance = {}
                for category, total, correct in recent_responses:
                    score = round((correct / total * 100) if total > 0 else 0, 1)
                    recent_performance[category] = {
                        'score': score,
                        'total': total,
                        'correct': correct
                    }
            
            # Get weekly leaderboard
            week_ago = datetime.now() - timedelta(days=7)
            leaderboard_data = db.session.query(
                User.username,
                func.avg(TestSession.score).label('avg_score')
            ).join(
                TestSession, TestSession.user_id == User.id
            ).filter(
                TestSession.start_time >= week_ago,
                TestSession.end_time.isnot(None)
            ).group_by(User.id).order_by(
                func.avg(TestSession.score).desc()
            ).limit(10).all()
            
            leaderboard = [
                {'username': username, 'score': round(avg_score, 1)} 
                for username, avg_score in leaderboard_data if avg_score
            ]
        
        return render_template('index.html',
                             user_stats=user_stats,
                             recent_performance=recent_performance,
                             leaderboard=leaderboard)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)