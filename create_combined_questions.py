#!/usr/bin/env python3
"""
Script to create a combined questions file from questions.json and questions2.json
This creates a single, deduplicated file that contains all the best questions from both sources.
"""

import json
import sys

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

def main():
    """Main function"""
    print("🔄 Creating combined questions file...")
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
    
    # Save combined questions
    output_file = 'static/questions_combined.json'
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(combined_questions, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Combined questions saved to: {output_file}")
        
        # Show statistics
        print(f"\n📊 Statistics by category:")
        for category, difficulties in combined_questions.items():
            easy_count = len(difficulties.get('easy', []))
            medium_count = len(difficulties.get('medium', []))
            hard_count = len(difficulties.get('hard', []))
            total_cat = easy_count + medium_count + hard_count
            print(f"   {category}: {total_cat} total (Easy: {easy_count}, Medium: {medium_count}, Hard: {hard_count})")
        
        return 0
        
    except Exception as e:
        print(f"❌ Error saving combined file: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
