import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from models.question import Question
from models.user import User
import json

def init_db():
    app = create_app()
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create admin user if it doesn't exist
        admin = User.query.filter_by(username='aourti').first()
        if not admin:
            admin = User(
                username='aourti',
                email='aourti@admin.com',
                is_admin=True
            )
            admin.set_password('123456')
            db.session.add(admin)
            db.session.commit()
            print("Admin user 'aourti' created successfully!")
        else:
            print("Admin user 'aourti' already exists!")
        
        # Load questions from JSON file
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                               'static', 'questions.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            question_data = json.load(f)

        # Process and add questions
        questions_to_add = []
        for category, difficulty_groups in question_data.items():
            for difficulty, questions in difficulty_groups.items():
                for q in questions:
                    # Skip questions that don't have standard format (like working memory exercises)
                    if not isinstance(q, dict) or 'options' not in q or not isinstance(q['options'], list):
                        continue
                        
                    difficulty_level = {'easy': 1, 'medium': 2, 'hard': 3}.get(difficulty, 2)
                    
                    # Get the correct answer
                    correct_answer = None
                    if 'correct' in q and isinstance(q['correct'], int):
                        correct_answer = q['options'][q['correct']]
                    elif 'correct_answer' in q:
                        correct_answer = q['correct_answer']
                    else:
                        continue  # Skip if no correct answer found
                        
                    question = Question(
                        text=q['question'],
                        options=q['options'],
                        correct_answer=correct_answer,
                        category=category,
                        difficulty=difficulty_level
                    )
                    questions_to_add.append(question)
                    
        # Add questions only if none exist
        if not Question.query.first():
            db.session.bulk_save_objects(questions_to_add)
            db.session.commit()
            print(f"Database initialized with {len(questions_to_add)} questions!")
        else:
            print("Questions already exist in the database. Skipping question initialization.")

if __name__ == "__main__":
    init_db()
