from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models.question import Question
from models.test_session import TestSession
from models.response import Response
from sqlalchemy import func
import json
from datetime import datetime

test_bp = Blueprint('test', __name__, url_prefix='/test')

@test_bp.route('/get_questions')
def get_questions():
    # Get adaptive questions organized by category and difficulty
    categories = ['Verbal Comprehension', 'Perceptual Reasoning', 'Working Memory', 'Processing Speed', 'Fluid Reasoning']
    questions_data = []
    
    for category in categories:
        # Start with easy questions from each category - add randomization
        easy_questions = Question.query.filter_by(category=category, difficulty='easy').order_by(func.random()).limit(1).all()
        for question in easy_questions:
            questions_data.append(format_question(question))
    
    return jsonify(questions_data)

@test_bp.route('/get_adaptive_question', methods=['POST'])
def get_adaptive_question():
    data = request.get_json()
    category = data.get('category')
    current_difficulty = data.get('difficulty', 'easy')
    is_correct = data.get('is_correct')
    question_history = data.get('question_history', [])  # IDs of already answered questions
    
    # Adaptive logic: adjust difficulty based on performance
    if is_correct:
        # Move to harder difficulty
        if current_difficulty == 'easy':
            next_difficulty = 'medium'
        elif current_difficulty == 'medium':
            next_difficulty = 'hard'
        else:
            next_difficulty = 'hard'  # Stay at hard
    else:
        # Move to easier difficulty or stay
        if current_difficulty == 'hard':
            next_difficulty = 'medium'
        elif current_difficulty == 'medium':
            next_difficulty = 'easy'
        else:
            next_difficulty = 'easy'  # Stay at easy
    
    # Get next question from the category and difficulty, excluding already answered
    question = Question.query.filter_by(
        category=category, 
        difficulty=next_difficulty
    ).filter(
        ~Question.id.in_(question_history)
    ).order_by(func.random()).first()
    
    if not question:
        # If no questions available at this difficulty, try other difficulties
        for alt_difficulty in ['medium', 'easy', 'hard']:
            if alt_difficulty != next_difficulty:
                question = Question.query.filter_by(
                    category=category, 
                    difficulty=alt_difficulty
                ).filter(
                    ~Question.id.in_(question_history)
                ).order_by(func.random()).first()
                if question:
                    next_difficulty = alt_difficulty
                    break
                    print(f"Found question at alternative difficulty: {alt_difficulty}")
                    break
    
    if question:
        return jsonify({
            'question': format_question(question),
            'difficulty': next_difficulty
        })
    else:
        return jsonify({'question': None, 'difficulty': None})

def format_question(question):
    """Format a question object for JSON response"""
    # For interactive question types (Working Memory), don't include options
    interactive_types = [
        'digit-span', 'digit-span-reverse', 'letter-span', 'letter-span-reorder',
        'visual-span', 'visual-span-reverse', 'n-back', 'visual-n-back',
        'operation-span', 'task-switching-span', 'n-back-dual'
    ]
    
    # Parse options - handle both string and already parsed JSON
    if question.question_type in interactive_types:
        options = []  # Interactive questions don't use multiple choice
    elif isinstance(question.options, str):
        try:
            options = json.loads(question.options)
        except json.JSONDecodeError:
            print(f"Warning: Could not parse options for question {question.id}")
            options = []
    else:
        options = question.options or []
    
    # Create question dict in the same format as the JSON file
    question_dict = {
        "id": question.id,
        "question": question.question_text,
        "options": options,
        "category": question.category,
        "difficulty": question.difficulty
    }
    
    # Add optional fields if they exist
    if question.correct_answer is not None:
        question_dict["correct"] = int(question.correct_answer) if str(question.correct_answer).isdigit() else question.correct_answer
    if question.question_type:
        question_dict["type"] = question.question_type
    if question.points:
        question_dict["points"] = question.points
    if question.display_time:
        question_dict["displayTime"] = question.display_time
        
    # Add fields from the original JSON structure that might be stored in the database
    if hasattr(question, 'length') and question.length:
        question_dict["length"] = question.length
    if hasattr(question, 'input_type') and question.input_type:
        question_dict["inputType"] = question.input_type
    if hasattr(question, 'time_limit') and question.time_limit:
        question_dict["timeLimit"] = question.time_limit
        
    return question_dict

@test_bp.route('/start')
@login_required
def start():
    # Create new test session
    session = TestSession(
        user_id=current_user.id,
        total_questions=15  # 5 categories × 3 questions each
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
    is_correct_provided = data.get('is_correct')  # For digit-span questions
    
    question = Question.query.get_or_404(question_id)
    
    # Determine if answer is correct
    if is_correct_provided is not None:
        # For digit-span questions, correctness is determined client-side
        is_correct = is_correct_provided
    else:
        # For multiple choice questions, check against stored correct answer
        if question.correct_answer is not None:
            # Handle both string and integer correct answers
            try:
                correct_idx = int(question.correct_answer)
                user_idx = int(answer) if isinstance(answer, str) and answer.isdigit() else answer
                is_correct = user_idx == correct_idx
            except (ValueError, TypeError):
                is_correct = str(answer) == str(question.correct_answer)
        else:
            is_correct = False
    
    response = Response(
        test_session_id=session_id,
        question_id=question_id,
        user_answer=str(answer),
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
    
    # Calculate IQ score with user's age (default to 18 if not available)
    user_age = getattr(current_user, 'age', 18)
    session.calculate_score(user_age)
    db.session.commit()
    
    return render_template('test/results.html', session=session)

@test_bp.route('/save_results', methods=['POST'])
@login_required
def save_results():
    data = request.get_json()
    
    # Save additional scientific metrics
    session = TestSession.query.get(data.get('session_id'))
    if session:
        session.fsiq = data.get('fsiq')
        session.percentile = data.get('percentile')
        session.classification = data.get('classification')
        session.domain_scores = json.dumps(data.get('domain_scores'))
        session.confidence_interval = json.dumps(data.get('confidence_interval'))
        db.session.commit()
    
    return jsonify({'status': 'success'})
