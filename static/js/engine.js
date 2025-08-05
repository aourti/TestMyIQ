export class AdaptiveTestEngine {
    constructor() {
        this.questionBank = {};
        this.currentDifficulty = {};
        this.responses = [];
        this.domainScores = {};
        this.initialized = false;
    }
    
    async loadQuestionBank() {
        try {
            const response = await fetch('/test/get_questions');
            console.log('Fetching questions from server...'); // Debug log
            if (!response.ok) {
                console.error('HTTP error:', response.status); // Debug log
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.questionBank = await response.json();
            console.log('Questions loaded:', this.questionBank); // Debug log
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to load questions:', error);
            document.getElementById('loading').innerHTML = `
                <div class="loading">
                    <h3>Error Loading Test</h3>
                    <p>Could not load the question bank. Please try again later.</p>
                </div>
            `;
            return false;
        }
    }

    getNextQuestion(domain, previousCorrect = null) {
        if (!this.currentDifficulty[domain]) {
            this.currentDifficulty[domain] = 'medium';
        }
        
        let difficulty = this.currentDifficulty[domain];
        
        if (previousCorrect !== null) {
            if (previousCorrect && difficulty !== 'hard') {
                difficulty = difficulty === 'easy' ? 'medium' : 'hard';
            } else if (!previousCorrect && difficulty !== 'easy') {
                difficulty = difficulty === 'hard' ? 'medium' : 'easy';
            }
            this.currentDifficulty[domain] = difficulty;
        }
        
        const questions = this.questionBank[domain][difficulty];
        const availableQuestions = questions.filter(q => 
            !this.responses.find(r => r.questionId === q.id)
        );
        
        if (availableQuestions.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        return { ...availableQuestions[randomIndex], difficulty };
    }
    
    recordResponse(domain, questionId, correct, responseTime, difficulty, points = null) {
        this.responses.push({
            domain,
            questionId,
            correct,
            responseTime,
            difficulty,
            timestamp: Date.now()
        });
        
        if (!this.domainScores[domain]) {
            this.domainScores[domain] = {
                correct: 0,
                total: 0,
                points: 0,
                difficulties: { easy: 0, medium: 0, hard: 0 }
            };
        }
        
        this.domainScores[domain].total++;
        if (correct) {
            this.domainScores[domain].correct++;
            // Use provided points if available, otherwise calculate based on difficulty
            this.domainScores[domain].points += (points !== null) ? points : this.getDifficultyPoints(difficulty);
        }
        this.domainScores[domain].difficulties[difficulty]++;
    }

    getDifficultyPoints(difficulty) {
        const points = { easy: 1, medium: 2, hard: 3 };
        return points[difficulty] || 1;
    }

    shouldContinueDomain(domain) {
        const score = this.domainScores[domain];
        if (!score || score.total < 3) return true;
        
        if (score.total >= 10) return false;
        
        const recentResponses = this.responses
            .filter(r => r.domain === domain)
            .slice(-3);
        
        if (recentResponses.length < 3) return true;

        const allCorrect = recentResponses.every(r => r.correct);
        const allIncorrect = recentResponses.every(r => !r.correct);
        
        if ((allCorrect && this.currentDifficulty[domain] === 'hard') ||
            (allIncorrect && this.currentDifficulty[domain] === 'easy')) {
            return false;
        }
        
        return true;
    }
}
