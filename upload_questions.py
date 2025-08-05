#!/usr/bin/env python3
"""
Script to upload questions from both questions.json and questions2.json to the database.
This script combines both files and removes duplicates, keeping the better version of each question.
"""

import json
import sys
import os
from flask import Flask
from extensions import db
from config import Config
from models.question import Question

def create_app():
    """Create Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app

def load_questions_from_file(filepath):
    """Load questions from a JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {filepath} not found.")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filepath}: {e}")
        return None

def combine_questions(questions1, questions2):
    """
    Combine questions from both files, removing duplicates.
    Preference is given to questions2.json as it has better quality questions.
    """
    combined = {}
    
    # Process questions from both files
    for data, source in [(questions1, "questions.json"), (questions2, "questions2.json")]:
        if not data:
            continue
            
        for category, difficulties in data.items():
            if category not in combined:
                combined[category] = {"easy": {}, "medium": {}, "hard": {}}
            
            for difficulty, questions in difficulties.items():
                if difficulty not in combined[category]:
                    combined[category][difficulty] = {}
                
                for question in questions:
                    q_id = question.get('id')
                    if q_id:
                        # If question already exists, keep the one from questions2.json (better quality)
                        if q_id not in combined[category][difficulty] or source == "questions2.json":
                            combined[category][difficulty][q_id] = {
                                'question': question,
                                'source': source
                            }
    
    # Convert back to list format
    result = {}
    for category, difficulties in combined.items():
        result[category] = {}
        for difficulty, questions in difficulties.items():
            result[category][difficulty] = [item['question'] for item in questions.values()]
    
    return result

def upload_questions_to_db(questions_data):
    """Upload questions to database"""
    uploaded_count = 0
    updated_count = 0
    error_count = 0
    
    for category_name, difficulties in questions_data.items():
        print(f"\nProcessing category: {category_name}")
        
        for difficulty, questions in difficulties.items():
            print(f"  Uploading {difficulty} questions...")
            
            for question_data in questions:
                try:
                    # Check if question already exists
                    existing = Question.query.filter_by(id=question_data['id']).first()
                    
                    if existing:
                        # Update existing question
                        existing.question_text = question_data['question']
                        existing.options = question_data.get('options', [])
                        existing.correct_answer = str(question_data.get('correct', ''))
                        existing.category = category_name
                        existing.difficulty = difficulty
                        existing.question_type = question_data.get('type', 'multiple-choice')
                        existing.points = question_data.get('points', 1)
                        existing.display_time = question_data.get('displayTime')
                        existing.length = question_data.get('length')
                        
                        # Set input type based on question type for Working Memory questions
                        if question_data.get('type') and any(wm_type in question_data['type'] for wm_type in 
                                ['digit-span', 'letter-span', 'visual-span', 'n-back', 'operation-span']):
                            existing.input_type = question_data.get('inputType', 'text')
                        else:
                            existing.input_type = question_data.get('inputType', 'multiple-choice')
                            
                        existing.time_limit = question_data.get('timeLimit')
                        
                        updated_count += 1
                        print(f"    Updated: {question_data['id']}")
                    else:
                        # Create new question
                        # Set input type based on question type for Working Memory questions
                        if question_data.get('type') and any(wm_type in question_data['type'] for wm_type in 
                                ['digit-span', 'letter-span', 'visual-span', 'n-back', 'operation-span']):
                            input_type = question_data.get('inputType', 'text')
                        else:
                            input_type = question_data.get('inputType', 'multiple-choice')
                            
                        new_question = Question(
                            id=question_data['id'],
                            question_text=question_data['question'],
                            options=question_data.get('options', []),
                            correct_answer=str(question_data.get('correct', '')),
                            category=category_name,
                            difficulty=difficulty,
                            question_type=question_data.get('type', 'multiple-choice'),
                            points=question_data.get('points', 1),
                            display_time=question_data.get('displayTime'),
                            length=question_data.get('length'),
                            input_type=input_type,
                            time_limit=question_data.get('timeLimit')
                        )
                        
                        db.session.add(new_question)
                        uploaded_count += 1
                        print(f"    Added: {question_data['id']}")
                
                except Exception as e:
                    error_count += 1
                    print(f"    Error processing {question_data.get('id', 'unknown')}: {e}")
    
    try:
        db.session.commit()
        print(f"\n✅ Upload completed successfully!")
        print(f"📊 Statistics:")
        print(f"   - New questions added: {uploaded_count}")
        print(f"   - Questions updated: {updated_count}")
        print(f"   - Errors: {error_count}")
        print(f"   - Total processed: {uploaded_count + updated_count}")
        
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error committing to database: {e}")
        return False
    
    return True

def main():
    """Main function"""
    app = create_app()
    
    with app.app_context():
        print("🚀 Starting question upload process...")
        print("=" * 50)
        
        # Load questions from both files
        questions1 = load_questions_from_file('static/questions.json')
        questions2 = load_questions_from_file('static/questions2.json')
        
        if not questions1 and not questions2:
            print("❌ No valid question files found!")
            return 1
        
        print(f"📁 Loaded questions from:")
        if questions1:
            total1 = sum(len(diff_questions) for cat in questions1.values() for diff_questions in cat.values())
            print(f"   - questions.json: {total1} questions")
        if questions2:
            total2 = sum(len(diff_questions) for cat in questions2.values() for diff_questions in cat.values())
            print(f"   - questions2.json: {total2} questions")
        
        # Combine questions and remove duplicates
        print("\n🔄 Combining questions and removing duplicates...")
        combined_questions = combine_questions(questions1, questions2)
        
        total_combined = sum(len(diff_questions) for cat in combined_questions.values() for diff_questions in cat.values())
        print(f"📋 Final question count after deduplication: {total_combined}")
        
        # Upload to database
        print("\n📤 Uploading questions to database...")
        success = upload_questions_to_db(combined_questions)
        
        if success:
            print("\n🎉 All questions have been successfully uploaded to the database!")
            return 0
        else:
            print("\n💥 Upload failed!")
            return 1

if __name__ == "__main__":
    sys.exit(main())
