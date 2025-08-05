from extensions import db
from datetime import datetime
import json

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

    def calculate_score(self, user_age=18):
        """Calculate IQ score using scientific methodology"""
        # Import here to avoid circular imports
        from utils.iq_calculator import ScientificIQCalculator
        
        calculator = ScientificIQCalculator()
        
        # Calculate scientific IQ score
        results = calculator.calculate_fsiq(self.responses, user_age)
        
        # Update all the scientific metrics
        self.fsiq = results['fsiq']
        self.score = results['fsiq']  # Set score to IQ score for compatibility
        self.percentile = results['percentile_rank']
        self.classification = results['classification']['level']
        self.domain_scores = json.dumps(results['domain_scores'])
        self.confidence_interval = json.dumps(results['confidence_intervals'])
        self.reliability_coefficient = results['reliability']['coefficient']
        
        return self.score

    def get_domain_scores_dict(self):
        """Get domain scores as a dictionary"""
        if self.domain_scores:
            try:
                return json.loads(self.domain_scores)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def get_confidence_interval_dict(self):
        """Get confidence interval as a dictionary"""
        if self.confidence_interval:
            try:
                return json.loads(self.confidence_interval)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def __repr__(self):
        return f'<TestSession {self.id} - User {self.user_id}>'
