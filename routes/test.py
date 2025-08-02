from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.question import Question
from models.test_session import TestSession
from models.response import Response
import json
from datetime import datetime

test_bp = Blueprint('test', __name__, url_prefix='/test')

@test_bp.route('/get_questions')
def get_questions():
    # Get all questions and organize them by category and difficulty
    questions = Question.query.all()
    questions_data = {}
    
    for question in questions:
        if question.category not in questions_data:
            questions_data[question.category] = {}
            
        if question.difficulty not in questions_data[question.category]:
            questions_data[question.category][question.difficulty] = []
            
        # Convert options back from JSON string
        options = json.loads(question.options) if question.options else []
        
        # Create question dict in the same format as the JSON file
        question_dict = {
            "id": question.id,
            "question": question.question_text,
            "options": options
        }
        
        # Add optional fields if they exist
        if question.correct_answer is not None:
            question_dict["correct"] = int(question.correct_answer) if question.correct_answer.isdigit() else question.correct_answer
        if question.question_type:
            question_dict["type"] = question.question_type
        if question.points:
            question_dict["points"] = question.points
        if question.display_time:
            question_dict["displayTime"] = question.display_time
            
        questions_data[question.category][question.difficulty].append(question_dict)
    
    return jsonify(questions_data)

@test_bp.route('/start')
@login_required
def start():
    # Create new test session
    session = TestSession(
        user_id=current_user.id,
        total_questions=10  # You can adjust this number
    )
    db.session.add(session)
    db.session.commit()
    
    return render_template('test/start.html', session_id=session.id)

@test_bp.route('/submit_answer', methods=['POST'])
@login_required
def submit_answer():
    data = request.get_json()
    question_id = data.get('question_id')
    answer = data.get('answer')
    session_id = data.get('session_id')
    response_time = data.get('response_time')
    
    question = Question.query.get_or_404(question_id)
    is_correct = answer == question.correct_answer
    
    response = Response(
        test_session_id=session_id,
        question_id=question_id,
        user_answer=answer,
        is_correct=is_correct,
        response_time=response_time
    )
    db.session.add(response)
    db.session.commit()
    
    return jsonify({'is_correct': is_correct})

@test_bp.route('/finish/<int:session_id>')
@login_required
def finish(session_id):
    session = TestSession.query.get_or_404(session_id)
    if session.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    session.end_time = datetime.utcnow()
    session.calculate_score()
    db.session.commit()
    
    return render_template('test/results.html', session=session)
