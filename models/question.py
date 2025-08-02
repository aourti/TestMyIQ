from extensions import db
from datetime import datetime

class Question(db.Model):
    id = db.Column(db.String(10), primary_key=True)  # e.g., "vc_e1"
    question_text = db.Column(db.String(500), nullable=False)
    options = db.Column(db.JSON)  # Store options as JSON array
    correct_answer = db.Column(db.String(100))
    category = db.Column(db.String(50), nullable=False)  # e.g., "Verbal Comprehension"
    difficulty = db.Column(db.String(10), nullable=False)  # "easy", "medium", "hard"
    question_type = db.Column(db.String(50))  # e.g., "pattern", "sequence", "digit-span"
    points = db.Column(db.Integer, default=1)
    display_time = db.Column(db.Integer)  # in milliseconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responses = db.relationship('Response', backref='question', lazy=True)

    def __repr__(self):
        return f'<Question {self.id}: {self.question_text[:30]}...>'
