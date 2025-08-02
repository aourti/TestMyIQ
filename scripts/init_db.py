import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from models.question import Question

app = create_app()
import json

def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if we already have questions
        if Question.query.first() is not None:
            print("Database already contains questions. Skipping initialization.")
            return
            
        # Load questions from JSON
        with open('static/questions.json', 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
            
        # Insert questions into database
        for category, difficulties in questions_data.items():
            for difficulty, questions in difficulties.items():
                for question in questions:
                    db_question = Question(
                        id=question['id'],
                        question_text=question['question'],
                        options=json.dumps(question.get('options', [])) if question.get('options') else None,
                        correct_answer=str(question.get('correct', '')) if 'correct' in question else None,
                        category=category,
                        difficulty=difficulty,
                        question_type=question.get('type', 'multiple-choice'),
                        points=question.get('points', 1),
                        display_time=question.get('displayTime')
                    )
                    db.session.add(db_question)
        
        # Commit the changes
        db.session.commit()
        print("Database initialized with questions from JSON!")

if __name__ == "__main__":
    init_db()
