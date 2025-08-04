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
    fsiq = db.Column(db.Integer)
    percentile = db.Column(db.Float)
    classification = db.Column(db.String(50))
    domain_scores = db.Column(db.JSON)
    confidence_interval = db.Column(db.JSON)
    reliability_coefficient = db.Column(db.Float)

    def calculate_score(self):
        total_score = 0
        for response in self.responses:
            if response.is_correct and response.question:
                total_score += response.question.points or 1  # Default to 1 point
        self.score = total_score
        return self.score

    def __repr__(self):
        return f'<TestSession {self.id} - User {self.user_id}>'
