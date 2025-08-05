"""
Scientific IQ Calculator - Python Backend Implementation
Based on psychometric principles and standard IQ test methodologies
"""

import math
import json
from typing import Dict, List, Any, Tuple
from collections import defaultdict


class ScientificIQCalculator:
    """
    Python implementation of the scientific IQ calculator for backend use
    """
    
    def __init__(self):
        # Standard IQ parameters
        self.MEAN_IQ = 100
        self.SD_IQ = 15
        
        # Domain weights based on WAIS-IV/WISC-V structure
        self.domain_weights = {
            'Verbal Comprehension': 0.25,
            'Perceptual Reasoning': 0.25,
            'Working Memory': 0.20,
            'Processing Speed': 0.15,
            'Fluid Reasoning': 0.15
        }
        
        # Age adjustment factors (simplified for demo)
        self.age_adjustments = {
            6: 0.85, 7: 0.88, 8: 0.91, 9: 0.94, 10: 0.97,
            11: 0.99, 12: 1.00, 13: 1.01, 14: 1.02, 15: 1.03,
            16: 1.04, 17: 1.05, 18: 1.05, 19: 1.04, 20: 1.03,
            21: 1.02, 22: 1.01, 23: 1.00, 24: 0.99, 25: 0.98,
            26: 0.97, 27: 0.96, 28: 0.95, 29: 0.94, 30: 0.93
        }
        
        # Difficulty multipliers for IRT-based scoring
        self.difficulty_multipliers = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.3
        }
    
    def calculate_fsiq(self, responses: List[Any], user_age: int = 18) -> Dict[str, Any]:
        """
        Calculate Full Scale IQ (FSIQ) using scientific methodology
        
        Args:
            responses: List of response objects with domain, correct, difficulty, response_time
            user_age: Age of the test taker
            
        Returns:
            Dictionary containing FSIQ and related metrics
        """
        
        # Step 1: Calculate raw scores for each domain
        raw_scores = self._calculate_raw_scores(responses)
        
        # Step 2: Convert to scaled scores (mean=10, SD=3)
        scaled_scores = self._convert_to_scaled_scores(raw_scores)
        
        # Step 3: Calculate composite scores for each index
        composite_scores = self._calculate_composite_scores(scaled_scores)
        
        # Step 4: Apply age norms
        age_adjusted_scores = self._apply_age_norms(composite_scores, user_age)
        
        # Step 5: Calculate FSIQ
        fsiq = self._compute_fsiq(age_adjusted_scores)
        
        # Step 6: Calculate confidence intervals
        confidence_intervals = self._calculate_confidence_intervals(fsiq)
        
        # Step 7: Generate percentile ranks
        percentile_rank = self._calculate_percentile_rank(fsiq)
        
        # Step 8: Get classification
        classification = self._get_classification(fsiq)
        
        # Step 9: Calculate reliability
        reliability = self._calculate_reliability(responses)
        
        return {
            'fsiq': round(fsiq),
            'domain_scores': age_adjusted_scores,
            'scaled_scores': scaled_scores,
            'raw_scores': raw_scores,
            'percentile_rank': round(percentile_rank, 1),
            'confidence_intervals': confidence_intervals,
            'classification': classification,
            'reliability': reliability
        }
    
    def _calculate_raw_scores(self, responses: List[Any]) -> Dict[str, float]:
        """Calculate raw scores using IRT principles"""
        scores = {}
        
        # Group responses by domain
        domain_responses = self._group_by_domain(responses)
        
        for domain, domain_items in domain_responses.items():
            raw_score = 0
            max_possible = 0
            
            for response in domain_items:
                difficulty = getattr(response, 'difficulty', 'medium') or 'medium'
                if hasattr(response, 'question') and response.question:
                    difficulty = response.question.difficulty or 'medium'
                
                difficulty_weight = self.difficulty_multipliers.get(difficulty, 1.0)
                
                if getattr(response, 'is_correct', False):
                    # Apply IRT-based scoring
                    response_time = getattr(response, 'response_time', 10) or 10
                    speed_bonus = self._calculate_speed_bonus(response_time, domain)
                    raw_score += difficulty_weight * (1 + speed_bonus)
                
                max_possible += difficulty_weight
            
            # Normalize to 0-100 scale
            if max_possible > 0:
                scores[domain] = (raw_score / max_possible) * 100
            else:
                scores[domain] = 50  # Default to middle score if no questions
        
        return scores
    
    def _convert_to_scaled_scores(self, raw_scores: Dict[str, float]) -> Dict[str, int]:
        """Convert raw scores to scaled scores (mean=10, SD=3)"""
        scaled_scores = {}
        
        for domain, raw_score in raw_scores.items():
            # Convert percentage to z-score
            z_score = (raw_score - 50) / 16.67  # Assuming raw scores are percentages
            
            # Convert to scaled score (mean=10, SD=3)
            scaled_score = round(10 + (z_score * 3))
            
            # Ensure scores are within valid range (1-19)
            scaled_scores[domain] = max(1, min(19, scaled_score))
        
        return scaled_scores
    
    def _calculate_composite_scores(self, scaled_scores: Dict[str, int]) -> Dict[str, int]:
        """Calculate composite scores for each cognitive index"""
        composite_scores = {}
        
        # Calculate index scores (mean=100, SD=15)
        for domain, scaled_score in scaled_scores.items():
            z_score = (scaled_score - 10) / 3
            composite_score = round(100 + (z_score * 15))
            
            # Ensure scores are within valid range (40-160)
            composite_scores[domain] = max(40, min(160, composite_score))
        
        return composite_scores
    
    def _apply_age_norms(self, composite_scores: Dict[str, int], user_age: int) -> Dict[str, int]:
        """Apply age-based norms"""
        age_adjustment = self.age_adjustments.get(user_age, 1.0)
        adjusted_scores = {}
        
        for domain, score in composite_scores.items():
            # Apply age adjustment while maintaining mean=100
            deviation = score - 100
            adjusted_scores[domain] = round(100 + (deviation * age_adjustment))
        
        return adjusted_scores
    
    def _compute_fsiq(self, domain_scores: Dict[str, int]) -> float:
        """Compute Full Scale IQ from domain scores"""
        weighted_sum = 0
        total_weight = 0
        
        for domain, score in domain_scores.items():
            weight = self.domain_weights.get(domain, 0.2)
            weighted_sum += score * weight
            total_weight += weight
        
        # Calculate weighted average
        if total_weight > 0:
            fsiq = weighted_sum / total_weight
        else:
            fsiq = 100  # Default to average if no domains
        
        # Apply Flynn effect correction (optional, based on test year)
        flynn_correction = self._calculate_flynn_correction()
        
        return fsiq + flynn_correction
    
    def _calculate_confidence_intervals(self, fsiq: float) -> Dict[str, Any]:
        """Calculate confidence intervals (95% CI)"""
        # Standard error of measurement (SEM) for IQ tests is typically ~3-5 points
        sem = 4.5
        z95 = 1.96  # 95% confidence interval
        
        margin = z95 * sem
        
        return {
            'lower': round(fsiq - margin),
            'upper': round(fsiq + margin),
            'confidence': 95
        }
    
    def _calculate_percentile_rank(self, iq: float) -> float:
        """Calculate percentile rank based on normal distribution"""
        z_score = (iq - self.MEAN_IQ) / self.SD_IQ
        percentile = self._normal_cdf(z_score) * 100
        return percentile
    
    def _normal_cdf(self, z: float) -> float:
        """Normal cumulative distribution function"""
        # Using the approximation method
        a1 = 0.254829592
        a2 = -0.284496736
        a3 = 1.421413741
        a4 = -1.453152027
        a5 = 1.061405429
        p = 0.3275911
        
        sign = -1 if z < 0 else 1
        z = abs(z) / math.sqrt(2)
        
        t = 1 / (1 + p * z)
        y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-z * z)
        
        return 0.5 * (1 + sign * y)
    
    def _get_classification(self, iq: float) -> Dict[str, str]:
        """Get IQ classification based on score"""
        if iq >= 145:
            return {"level": "Very Superior", "description": "Genius or near genius"}
        elif iq >= 130:
            return {"level": "Superior", "description": "Gifted"}
        elif iq >= 120:
            return {"level": "Very High", "description": "Superior intelligence"}
        elif iq >= 110:
            return {"level": "High Average", "description": "Above average intelligence"}
        elif iq >= 90:
            return {"level": "Average", "description": "Normal intelligence"}
        elif iq >= 80:
            return {"level": "Low Average", "description": "Below average intelligence"}
        elif iq >= 70:
            return {"level": "Borderline", "description": "Borderline intellectual functioning"}
        else:
            return {"level": "Extremely Low", "description": "Intellectual disability"}
    
    def _calculate_reliability(self, responses: List[Any]) -> Dict[str, Any]:
        """Calculate test reliability coefficient"""
        # Simplified reliability calculation
        consistency = self._calculate_response_consistency(responses)
        completion = len(responses) / 75  # Assuming 75 total items
        completion = min(1.0, completion)  # Cap at 1.0
        
        coefficient = consistency * completion
        
        return {
            'coefficient': round(coefficient, 2),
            'interpretation': "High" if consistency > 0.8 else "Moderate" if consistency > 0.6 else "Low"
        }
    
    def _group_by_domain(self, responses: List[Any]) -> Dict[str, List[Any]]:
        """Group responses by domain"""
        grouped = defaultdict(list)
        
        for response in responses:
            domain = None
            
            # Try to get domain from different possible attributes
            if hasattr(response, 'domain'):
                domain = response.domain
            elif hasattr(response, 'question') and response.question and hasattr(response.question, 'category'):
                domain = response.question.category
            elif hasattr(response, 'category'):
                domain = response.category
            
            if domain:
                grouped[domain].append(response)
        
        return dict(grouped)
    
    def _calculate_speed_bonus(self, response_time: float, domain: str) -> float:
        """Calculate speed bonus for Processing Speed domain"""
        if domain == 'Processing Speed':
            if response_time < 5:
                return 0.2
            elif response_time < 10:
                return 0.1
        return 0
    
    def _calculate_response_consistency(self, responses: List[Any]) -> float:
        """Analyze pattern of correct/incorrect responses"""
        if len(responses) <= 1:
            return 1.0
        
        transitions = 0
        last_correct = None
        
        for response in responses:
            current_correct = getattr(response, 'is_correct', False)
            if last_correct is not None and current_correct != last_correct:
                transitions += 1
            last_correct = current_correct
        
        # Lower transitions indicate more consistent performance
        max_transitions = len(responses) - 1
        if max_transitions == 0:
            return 1.0
        
        return 1 - (transitions / max_transitions)
    
    def _calculate_flynn_correction(self) -> float:
        """Flynn effect: IQ scores increase ~3 points per decade"""
        # This is a placeholder - actual implementation would consider test standardization date
        return 0
