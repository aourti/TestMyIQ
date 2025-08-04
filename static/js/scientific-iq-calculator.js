// Scientific IQ Calculation System
// Based on psychometric principles and standard IQ test methodologies

class ScientificIQCalculator {
    constructor() {
        // Standard IQ parameters
        this.MEAN_IQ = 100;
        this.SD_IQ = 15;
        
        // Domain weights based on WAIS-IV/WISC-V structure
        this.domainWeights = {
            'Verbal Comprehension': 0.25,
            'Perceptual Reasoning': 0.25,
            'Working Memory': 0.20,
            'Processing Speed': 0.15,
            'Fluid Reasoning': 0.15
        };
        
        // Age adjustment factors (simplified for demo)
        this.ageAdjustments = {
            6: 0.85, 7: 0.88, 8: 0.91, 9: 0.94, 10: 0.97,
            11: 0.99, 12: 1.00, 13: 1.01, 14: 1.02, 15: 1.03,
            16: 1.04, 17: 1.05, 18: 1.05, 19: 1.04, 20: 1.03,
            21: 1.02, 22: 1.01, 23: 1.00, 24: 0.99, 25: 0.98
        };
        
        // Difficulty multipliers for IRT-based scoring
        this.difficultyMultipliers = {
            'easy': 0.8,
            'medium': 1.0,
            'hard': 1.3
        };
    }
    
    /**
     * Calculate Full Scale IQ (FSIQ) using scientific methodology
     */
    calculateFSIQ(testData) {
        const { responses, domainScores, userAge } = testData;
        
        // Step 1: Calculate raw scores for each domain
        const rawScores = this.calculateRawScores(responses);
        
        // Step 2: Convert to scaled scores (mean=10, SD=3)
        const scaledScores = this.convertToScaledScores(rawScores);
        
        // Step 3: Calculate composite scores for each index
        const compositeScores = this.calculateCompositeScores(scaledScores);
        
        // Step 4: Apply age norms
        const ageAdjustedScores = this.applyAgeNorms(compositeScores, userAge);
        
        // Step 5: Calculate FSIQ
        const fsiq = this.computeFSIQ(ageAdjustedScores);
        
        // Step 6: Calculate confidence intervals
        const confidenceIntervals = this.calculateConfidenceIntervals(fsiq);
        
        // Step 7: Generate percentile ranks
        const percentileRank = this.calculatePercentileRank(fsiq);
        
        return {
            fsiq: Math.round(fsiq),
            domainScores: ageAdjustedScores,
            scaledScores,
            percentileRank,
            confidenceIntervals,
            classification: this.getClassification(fsiq),
            reliability: this.calculateReliability(responses)
        };
    }
    
    /**
     * Calculate raw scores using IRT principles
     */
    calculateRawScores(responses) {
        const scores = {};
        
        // Group responses by domain
        const domainResponses = this.groupByDomain(responses);
        
        for (const [domain, domainItems] of Object.entries(domainResponses)) {
            let rawScore = 0;
            let maxPossible = 0;
            
            domainItems.forEach(response => {
                const difficulty = response.difficulty || 'medium';
                const difficultyWeight = this.difficultyMultipliers[difficulty];
                
                if (response.correct) {
                    // Apply IRT-based scoring
                    const responseTime = response.responseTime || 10;
                    const speedBonus = this.calculateSpeedBonus(responseTime, domain);
                    rawScore += difficultyWeight * (1 + speedBonus);
                }
                
                maxPossible += difficultyWeight;
            });
            
            // Normalize to 0-100 scale
            scores[domain] = (rawScore / maxPossible) * 100;
        }
        
        return scores;
    }
    
    /**
     * Convert raw scores to scaled scores (mean=10, SD=3)
     */
    convertToScaledScores(rawScores) {
        const scaledScores = {};
        
        for (const [domain, rawScore] of Object.entries(rawScores)) {
            // Convert percentage to z-score
            const zScore = (rawScore - 50) / 16.67; // Assuming raw scores are percentages
            
            // Convert to scaled score (mean=10, SD=3)
            scaledScores[domain] = Math.round(10 + (zScore * 3));
            
            // Ensure scores are within valid range (1-19)
            scaledScores[domain] = Math.max(1, Math.min(19, scaledScores[domain]));
        }
        
        return scaledScores;
    }
    
    /**
     * Calculate composite scores for each cognitive index
     */
    calculateCompositeScores(scaledScores) {
        const compositeScores = {};
        
        // Calculate index scores (mean=100, SD=15)
        for (const [domain, scaledScore] of Object.entries(scaledScores)) {
            const zScore = (scaledScore - 10) / 3;
            compositeScores[domain] = Math.round(100 + (zScore * 15));
            
            // Ensure scores are within valid range (40-160)
            compositeScores[domain] = Math.max(40, Math.min(160, compositeScores[domain]));
        }
        
        return compositeScores;
    }
    
    /**
     * Apply age-based norms
     */
    applyAgeNorms(compositeScores, userAge) {
        const ageAdjustment = this.ageAdjustments[userAge] || 1.0;
        const adjustedScores = {};
        
        for (const [domain, score] of Object.entries(compositeScores)) {
            // Apply age adjustment while maintaining mean=100
            const deviation = score - 100;
            adjustedScores[domain] = Math.round(100 + (deviation * ageAdjustment));
        }
        
        return adjustedScores;
    }
    
    /**
     * Compute Full Scale IQ from domain scores
     */
    computeFSIQ(domainScores) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [domain, score] of Object.entries(domainScores)) {
            const weight = this.domainWeights[domain] || 0.2;
            weightedSum += score * weight;
            totalWeight += weight;
        }
        
        // Calculate weighted average
        const fsiq = weightedSum / totalWeight;
        
        // Apply Flynn effect correction (optional, based on test year)
        const flynnCorrection = this.calculateFlynnCorrection();
        
        return fsiq + flynnCorrection;
    }
    
    /**
     * Calculate confidence intervals (95% CI)
     */
    calculateConfidenceIntervals(fsiq) {
        // Standard error of measurement (SEM) for IQ tests is typically ~3-5 points
        const sem = 4.5;
        const z95 = 1.96; // 95% confidence interval
        
        const margin = z95 * sem;
        
        return {
            lower: Math.round(fsiq - margin),
            upper: Math.round(fsiq + margin),
            confidence: 95
        };
    }
    
    /**
     * Calculate percentile rank based on normal distribution
     */
    calculatePercentileRank(iq) {
        const zScore = (iq - this.MEAN_IQ) / this.SD_IQ;
        const percentile = this.normalCDF(zScore) * 100;
        return Math.round(percentile * 10) / 10; // Round to 1 decimal place
    }
    
    /**
     * Normal cumulative distribution function
     */
    normalCDF(z) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        
        const t = 1 / (1 + p * z);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1 + sign * y);
    }
    
    /**
     * Get IQ classification based on score
     */
    getClassification(iq) {
        if (iq >= 145) return { level: "Very Superior", description: "Genius or near genius" };
        if (iq >= 130) return { level: "Superior", description: "Gifted" };
        if (iq >= 120) return { level: "Very High", description: "Superior intelligence" };
        if (iq >= 110) return { level: "High Average", description: "Above average intelligence" };
        if (iq >= 90) return { level: "Average", description: "Normal intelligence" };
        if (iq >= 80) return { level: "Low Average", description: "Below average intelligence" };
        if (iq >= 70) return { level: "Borderline", description: "Borderline intellectual functioning" };
        return { level: "Extremely Low", description: "Intellectual disability" };
    }
    
    /**
     * Calculate test reliability coefficient
     */
    calculateReliability(responses) {
        // Simplified reliability calculation
        // In practice, this would use Cronbach's alpha or split-half reliability
        const consistency = this.calculateResponseConsistency(responses);
        const completion = responses.length / 75; // Assuming 75 total items
        
        return {
            coefficient: (consistency * completion).toFixed(2),
            interpretation: consistency > 0.8 ? "High" : consistency > 0.6 ? "Moderate" : "Low"
        };
    }
    
    /**
     * Helper functions
     */
    groupByDomain(responses) {
        const grouped = {};
        
        responses.forEach(response => {
            const domain = response.domain || response.category;
            if (!grouped[domain]) grouped[domain] = [];
            grouped[domain].push(response);
        });
        
        return grouped;
    }
    
    calculateSpeedBonus(responseTime, domain) {
        // Speed bonus for Processing Speed domain
        if (domain === 'Processing Speed') {
            if (responseTime < 5) return 0.2;
            if (responseTime < 10) return 0.1;
        }
        return 0;
    }
    
    calculateResponseConsistency(responses) {
        // Analyze pattern of correct/incorrect responses
        let transitions = 0;
        let lastCorrect = null;
        
        responses.forEach(response => {
            if (lastCorrect !== null && response.correct !== lastCorrect) {
                transitions++;
            }
            lastCorrect = response.correct;
        });
        
        // Lower transitions indicate more consistent performance
        const maxTransitions = responses.length - 1;
        return 1 - (transitions / maxTransitions);
    }
    
    calculateFlynnCorrection() {
        // Flynn effect: IQ scores increase ~3 points per decade
        // This is a placeholder - actual implementation would consider test standardization date
        return 0;
    }
    
    /**
     * Generate detailed report
     */
    generateDetailedReport(results) {
        const report = {
            summary: {
                fsiq: results.fsiq,
                percentile: results.percentileRank,
                classification: results.classification,
                confidence: `${results.confidenceIntervals.lower}-${results.confidenceIntervals.upper} (${results.confidenceIntervals.confidence}% CI)`
            },
            indices: Object.entries(results.domainScores).map(([domain, score]) => ({
                name: domain,
                score: score,
                percentile: this.calculatePercentileRank(score),
                classification: this.getClassification(score).level
            })),
            strengths: this.identifyStrengths(results.domainScores),
            weaknesses: this.identifyWeaknesses(results.domainScores),
            recommendations: this.generateRecommendations(results)
        };
        
        return report;
    }
    
    identifyStrengths(domainScores) {
        const mean = Object.values(domainScores).reduce((a, b) => a + b) / Object.keys(domainScores).length;
        return Object.entries(domainScores)
            .filter(([_, score]) => score > mean + 10)
            .map(([domain, score]) => ({ domain, score, deviation: score - mean }));
    }
    
    identifyWeaknesses(domainScores) {
        const mean = Object.values(domainScores).reduce((a, b) => a + b) / Object.keys(domainScores).length;
        return Object.entries(domainScores)
            .filter(([_, score]) => score < mean - 10)
            .map(([domain, score]) => ({ domain, score, deviation: score - mean }));
    }
    
    generateRecommendations(results) {
        const recommendations = [];
        
        // Based on strengths
        results.strengths?.forEach(strength => {
            recommendations.push({
                type: 'strength',
                domain: strength.domain,
                suggestion: `Continue developing your ${strength.domain} abilities through advanced challenges.`
            });
        });
        
        // Based on weaknesses
        results.weaknesses?.forEach(weakness => {
            recommendations.push({
                type: 'improvement',
                domain: weakness.domain,
                suggestion: `Consider practicing ${weakness.domain} exercises to strengthen this area.`
            });
        });
        
        return recommendations;
    }
}

// Export for use in the application
window.ScientificIQCalculator = ScientificIQCalculator;

// Integration with existing test system
function integrateScientificIQ(testEngine, userAge) {
    const calculator = new ScientificIQCalculator();
    
    // Prepare test data
    const testData = {
        responses: testEngine.responses.map(r => ({
            domain: r.domain,
            correct: r.correct,
            responseTime: r.responseTime,
            difficulty: r.difficulty,
            questionId: r.questionId
        })),
        domainScores: testEngine.domainScores,
        userAge: userAge
    };
    
    // Calculate scientific IQ
    const results = calculator.calculateFSIQ(testData);
    const detailedReport = calculator.generateDetailedReport(results);
    
    return {
        ...results,
        report: detailedReport
    };
}