from extensions import db
from datetime import datetime

class TestSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    score = db.Column(db.Integer)
    total_questions = db.Column(db.Integer, nullable=False)
    responses = db.relationship('Response', backref='test_session', lazy=True)

    def calculate_score(self):
        correct_responses = [r for r in self.responses if r.is_correct]
        self.score = len(correct_responses)
        return self.score

    def __repr__(self):
        return f'<TestSession {self.id} - User {self.user_id}>'
