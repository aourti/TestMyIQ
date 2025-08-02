from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from models.user import User
from models.question import Question
from models.test_session import TestSession
from models.response import Response
from extensions import db
from functools import wraps

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/')
@admin_required
def dashboard():
    questions_count = Question.query.count()
    users_count = User.query.count()
    tests_count = TestSession.query.count()
    recent_tests = TestSession.query.order_by(TestSession.start_time.desc()).limit(5).all()
    
    return render_template('admin/dashboard.html',
                         questions_count=questions_count,
                         users_count=users_count,
                         tests_count=tests_count,
                         recent_tests=recent_tests)

@admin_bp.route('/questions')
@admin_required
def questions():
    questions = Question.query.order_by(Question.category, Question.difficulty).all()
    return render_template('admin/questions.html', questions=questions)

@admin_bp.route('/question/add', methods=['GET', 'POST'])
@admin_required
def add_question():
    if request.method == 'POST':
        question = Question(
            text=request.form['text'],
            options=request.form.getlist('options[]'),
            correct_answer=request.form['correct_answer'],
            category=request.form['category'],
            difficulty=int(request.form['difficulty'])
        )
        db.session.add(question)
        db.session.commit()
        flash('Question added successfully!', 'success')
        return redirect(url_for('admin.questions'))
    return render_template('admin/question_form.html')

@admin_bp.route('/question/<int:id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_question(id):
    question = Question.query.get_or_404(id)
    if request.method == 'POST':
        question.text = request.form['text']
        question.options = request.form.getlist('options[]')
        question.correct_answer = request.form['correct_answer']
        question.category = request.form['category']
        question.difficulty = int(request.form['difficulty'])
        db.session.commit()
        flash('Question updated successfully!', 'success')
        return redirect(url_for('admin.questions'))
    return render_template('admin/question_form.html', question=question)

@admin_bp.route('/question/<int:id>/delete', methods=['POST'])
@admin_required
def delete_question(id):
    question = Question.query.get_or_404(id)
    db.session.delete(question)
    db.session.commit()
    flash('Question deleted successfully!', 'success')
    return redirect(url_for('admin.questions'))

@admin_bp.route('/users')
@admin_required
def users():
    users = User.query.all()
    return render_template('admin/users.html', users=users)

@admin_bp.route('/statistics')
@admin_required
def statistics():
    # Get overall statistics
    total_tests = TestSession.query.count()
    avg_score = db.session.query(db.func.avg(TestSession.score)).scalar() or 0
    
    # Get statistics by category
    category_stats = db.session.query(
        Question.category,
        db.func.count(Response.id).label('attempts'),
        db.func.avg(Response.is_correct).label('success_rate')
    ).join(Response).group_by(Question.category).all()
    
    # Get statistics by difficulty
    difficulty_stats = db.session.query(
        Question.difficulty,
        db.func.count(Response.id).label('attempts'),
        db.func.avg(Response.is_correct).label('success_rate')
    ).join(Response).group_by(Question.difficulty).all()
    
    return render_template('admin/statistics.html',
                         total_tests=total_tests,
                         avg_score=round(avg_score, 2),
                         category_stats=category_stats,
                         difficulty_stats=difficulty_stats)
