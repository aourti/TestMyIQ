import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from models.question import Question
import json

app = create_app()

def update_questions():
    with app.app_context():
        # Delete all existing questions
        print("Deleting old questions...")
        db.session.query(Question).delete()
        
        # Load questions from JSON
        print("Loading new questions from static/questions.json...")
        with open('static/questions.json', 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
            
        # Insert questions into database
        print("Inserting new questions into the database...")
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
        print("Database questions updated successfully!")

if __name__ == "__main__":
    update_questions()
