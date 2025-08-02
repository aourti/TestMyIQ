import { AdaptiveTestEngine } from './engine.js';

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make functions globally available
    window.checkSavedSession = checkSavedSession;
    window.resumeTest = resumeTest;
    window.startNewTest = startNewTest;
    window.clearAndRestart = clearAndRestart;
    window.initializeTest = initializeTest;
    window.startSection = startSection;
    window.selectAnswer = selectAnswer;
    window.enableSubmitForText = enableSubmitForText;
    window.submitAnswer = submitAnswer;
    window.generateReport = generateReport;

    // Global variables
    window.testEngine = new AdaptiveTestEngine();
    window.currentDomain = '';
    window.currentQuestion = null;
    window.domainIndex = 0;
    window.startTime;
    window.timerInterval;
    window.questionTimer;
    window.questionStartTime;
    window.userAge = 12;
    window.domains = ["Verbal Comprehension", "Perceptual Reasoning", "Working Memory", "Processing Speed", "Fluid Reasoning"];

    // Initialize the application
    checkSavedSession();
});

// Check for saved session on load
window.addEventListener('load', () => {
    checkSavedSession();
});

function checkSavedSession() {
    const savedState = localStorage.getItem('iqTestState');
    if (savedState) {
        document.getElementById('resumePrompt').style.display = 'block';
    }
}

function resumeTest() {
    const savedState = JSON.parse(localStorage.getItem('iqTestState'));
    if (savedState) {
        // Restore state
        testEngine.responses = savedState.responses || [];
        testEngine.domainScores = savedState.domainScores || {};
        testEngine.currentDifficulty = savedState.currentDifficulty || {};
        domainIndex = savedState.domainIndex || 0;
        userAge = savedState.userAge || 12;
        startTime = Date.now() - (savedState.elapsedTime || 0);
        
        // Load questions and continue
        initializeTest(true);
    }
}

function startNewTest() {
    localStorage.removeItem('iqTestState');
    document.getElementById('resumePrompt').style.display = 'none';
}

function clearAndRestart() {
    localStorage.removeItem('iqTestState');
    location.reload();
}

async function initializeTest(resuming = false) {
    if (!resuming) {
        userAge = parseInt(document.getElementById('ageSelect').value);
    }
    
    document.getElementById('intro').classList.remove('active');
    document.getElementById('loading').classList.add('active');
    
    // Load question bank
    const loaded = await testEngine.loadQuestionBank();
    if(!loaded) return; // Stop if questions failed to load
    
    setTimeout(() => {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('test-container').classList.add('active');
        
        if (!resuming) {
            startTime = Date.now();
        }
        startTimer();
        
        if (resuming && domainIndex < domains.length) {
            currentDomain = domains[domainIndex];
            showNextQuestion();
        } else {
            domainIndex = 0; // Reset for new test
            showSectionIntro();
        }
    }, 1000);
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function showSectionIntro() {
    if (domainIndex >= domains.length) {
        showResults();
        return;
    }
    
    currentDomain = domains[domainIndex];
    const html = `
        <div class="question">
            <h2>${currentDomain}</h2>
            <p class="question-text">${getSectionDescription(currentDomain)}</p>
            <div class="adaptive-info">
                <p><strong>Adaptive Testing:</strong> Questions will adjust to your performance level.</p>
                <p>Starting with medium difficulty questions.</p>
            </div>
        </div>
        <div class="navigation">
            <button class="btn" onclick="startSection()">Begin Section</button>
        </div>
    `;
    document.getElementById('test-container').innerHTML = html;
}

function getSectionDescription(domain) {
    const descriptions = {
        "Verbal Comprehension": "This section measures your understanding of language, vocabulary, and verbal reasoning.",
        "Perceptual Reasoning": "This section tests your ability to analyze visual information and recognize patterns.",
        "Working Memory": "This section tests your ability to remember and manipulate information. You'll need to type responses from memory.",
        "Processing Speed": "This section measures how quickly and accurately you can process information. Work as fast as you can!",
        "Fluid Reasoning": "This section tests your ability to solve new problems using logic and reasoning."
    };
    return descriptions[domain];
}

function startSection() {
    showNextQuestion();
}

function showNextQuestion() {
    clearInterval(questionTimer);
    
    // Check if we should continue this domain
    if (testEngine.domainScores[currentDomain] && !testEngine.shouldContinueDomain(currentDomain)) {
        domainIndex++;
        saveState();
        showSectionIntro();
        return;
    }
    
    // Get adaptive question
    const lastResponse = testEngine.responses
        .filter(r => r.domain === currentDomain)
        .pop();
    
    currentQuestion = testEngine.getNextQuestion(
        currentDomain,
        lastResponse ? lastResponse.correct : null
    );
    
    if (!currentQuestion) {
        domainIndex++;
        saveState();
        showSectionIntro();
        return;
    }
    
    questionStartTime = Date.now();
    displayQuestion(currentQuestion);
}

function displayQuestion(question) {
    if (question.type && question.type.includes('digit-span') && question.length) {
        const sequence = generateRandomSequence(question.length);
        question.sequence = sequence; 
        let correctAnswer = sequence.replace(/-/g, '');
        if (question.type === 'digit-span-reverse') {
            correctAnswer = correctAnswer.split('').reverse().join('');
        }
        question.correctAnswer = correctAnswer;
    }

    let html = `
        <div class="question">
            <h3>${currentDomain}</h3>
            <span class="difficulty-indicator difficulty-${question.difficulty}">
                ${question.difficulty.toUpperCase()} DIFFICULTY
            </span>
    `;
    
    if (question.type === 'matrix') {
        html += `
            <p class="question-text">${question.question}</p>
            <div class="visual-container">
                <div class="pattern-grid">
        `;
        question.matrix.forEach(row => {
            row.forEach(cell => {
                html += `<div class="pattern-cell ${cell === '?' ? 'missing' : ''}">${cell}</div>`;
            });
        });
        html += `</div></div>`;
    } else if (question.type && question.type.includes('digit-span')) {
        html += `
            <p class="question-text">${question.question}</p>
            <div class="memory-display" id="memoryDisplay">${question.sequence}</div>
            <div id="memoryInput" style="display: none;">
                <input type="text" class="text-input" id="textAnswer" placeholder="Enter the sequence" 
                       onkeyup="enableSubmitForText()" autocomplete="off">
            </div>
        `;
        setTimeout(() => {
            const display = document.getElementById('memoryDisplay');
            const input = document.getElementById('memoryInput');
            if (display && input) {
                display.textContent = '';
                display.classList.add('hidden');
                input.style.display = 'block';
                document.getElementById('textAnswer').focus();
            }
        }, question.displayTime);
    } else {
        html += `<p class="question-text">${question.question}</p>`;
    }
    
    if (!question.inputType || question.inputType !== 'text') {
        html += '<div class="options">';
        question.options.forEach((option, index) => {
            html += `<div class="option" onclick="selectAnswer(${index})">${option}</div>`;
        });
        html += '</div>';
    }
    
    html += '</div>';
    
    const isTextInput = question.inputType === 'text';
    html += `
        <div class="navigation">
            <button class="btn" id="submitBtn" onclick="submitAnswer()" disabled>Submit Answer</button>
        </div>
    `;
    
    document.getElementById('test-container').innerHTML = html;
    updateProgress();
    
    if (question.timeLimit) {
        let timeLeft = question.timeLimit;
        const countdownDiv = document.getElementById('countdownTimer');
        countdownDiv.style.display = 'block';
        countdownDiv.textContent = timeLeft;
        
        questionTimer = setInterval(() => {
            timeLeft--;
            countdownDiv.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                countdownDiv.style.display = 'none';
                submitAnswer(); // Auto-submit on time out
            }
        }, 1000);
    }
}

function selectAnswer(index) {
    document.querySelectorAll('.option').forEach((opt, i) => {
        opt.classList.toggle('selected', i === index);
    });
    document.getElementById('submitBtn').disabled = false;
}

function enableSubmitForText() {
    const input = document.getElementById('textAnswer');
    document.getElementById('submitBtn').disabled = !input.value.trim();
}

function submitAnswer() {
    clearInterval(questionTimer);
    document.getElementById('countdownTimer').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
    
    let isCorrect = false;
    const responseTime = Date.now() - questionStartTime;
    let selectedElement;
    
    if (currentQuestion.inputType === 'text') {
        const userAnswer = document.getElementById('textAnswer').value.replace(/[-\s]/g, '');
        isCorrect = userAnswer === currentQuestion.correctAnswer;
        selectedElement = document.getElementById('textAnswer').parentElement;
    } else {
        selectedElement = document.querySelector('.option.selected');
        if (selectedElement) {
            const selectedIndex = Array.from(document.querySelectorAll('.option')).indexOf(selectedElement);
            isCorrect = selectedIndex === currentQuestion.correct;
        }
    }

    // Remove any existing feedback
    const existingFeedback = document.querySelector('.feedback-text');
    if (existingFeedback) {
        existingFeedback.remove();
    }

    // Create and show feedback
    const feedback = document.createElement('div');
    feedback.className = `feedback-text ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect ? 
        '<span style="font-size: 1.2em;">✓</span> Correct!' : 
        '<span style="font-size: 1.2em;">✗</span> Incorrect';
    document.body.appendChild(feedback);

    // Add animation class to selected option
    if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    
    // Record the response
    testEngine.recordResponse(
        currentDomain,
        currentQuestion.id,
        isCorrect,
        responseTime,
        currentQuestion.difficulty
    );
    
    saveState();
    
    // Wait for animation to complete before showing next question
    setTimeout(() => {
        if (feedback) {
            feedback.remove();
        }
        showNextQuestion();
    }, 1200);
}

function updateProgress() {
    const totalResponses = testEngine.responses.length;
    const estimatedTotal = domains.length * 7; // Adjusted average
    const progress = Math.min(100, Math.round((totalResponses / estimatedTotal) * 100));
    
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressText').textContent = progress + '%';
}

function saveState() {
    const state = {
        responses: testEngine.responses,
        domainScores: testEngine.domainScores,
        currentDifficulty: testEngine.currentDifficulty,
        domainIndex: domainIndex,
        userAge: userAge,
        elapsedTime: Date.now() - startTime
    };
    localStorage.setItem('iqTestState', JSON.stringify(state));
}

function showResults() {
    clearInterval(timerInterval);
    document.getElementById('test-container').classList.remove('active');
    document.getElementById('results').classList.add('active');
    localStorage.removeItem('iqTestState');
    
    const results = calculateAdaptiveIQ();
    const iq = results.fsiq;
    document.getElementById('finalScore').textContent = iq;
    
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (circumference * ((iq - 40) / 120));
    
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
        circle.style.transition = 'stroke-dashoffset 2s ease-out';
    }, 100);
    
    let categoryHTML = '';
    Object.keys(results.domainScores).forEach(domain => {
        const domainScore = results.domainScores[domain];
        const data = testEngine.domainScores[domain] || { correct: 0, total: 1, difficulties: {easy:0,medium:0,hard:0} };
        const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        
        categoryHTML += `
            <div class="category-card">
                <h4>${domain}</h4>
                <div class="category-score">${domainScore}</div>
                <p>Accuracy: ${accuracy}%</p>
                <p style="font-size: 0.9em; color: #666;">
                    E:${data.difficulties.easy} M:${data.difficulties.medium} H:${data.difficulties.hard}
                </p>
            </div>
        `;
    });
    
    document.getElementById('categoryScores').innerHTML = categoryHTML;
    document.getElementById('interpretation').innerHTML = generateAdaptiveInterpretation(iq, results.domainScores);
}

function calculateAdaptiveIQ() {
    const domainScores = {};
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    
    domains.forEach(domain => {
        const data = testEngine.domainScores[domain];
        if (!data || data.total === 0) {
            domainScores[domain] = 100; // Default if no questions answered
            return;
        }
        
        let earnedPoints = 0;
        let possiblePoints = 0;
        
        testEngine.responses
            .filter(r => r.domain === domain)
            .forEach(response => {
                const points = testEngine.getDifficultyPoints(response.difficulty);
                possiblePoints += points;
                if (response.correct) {
                    earnedPoints += points;
                }
            });
        
        const percentage = possiblePoints > 0 ? earnedPoints / possiblePoints : 0;
        
        let difficultyBonus = 0;
        if (testEngine.currentDifficulty[domain] === 'hard' && data.correct / data.total > 0.5) {
            difficultyBonus = 0.15;
        } else if (testEngine.currentDifficulty[domain] === 'medium' && data.correct / data.total > 0.6) {
            difficultyBonus = 0.05;
        }
        
        const adjustedPercentage = Math.min(1, percentage + difficultyBonus);
        const zScore = (adjustedPercentage - 0.5) * 3;
        const domainIQ = Math.round(100 + (zScore * 15));
        
        domainScores[domain] = Math.max(70, Math.min(130, domainIQ));
        
        totalPoints += earnedPoints;
        maxPossiblePoints += possiblePoints;
    });
    
    const overallPercentage = maxPossiblePoints > 0 ? totalPoints / maxPossiblePoints : 0.5;
    
    let difficultyAdjustment = 0;
    const difficulties = Object.values(testEngine.currentDifficulty);
    const hardCount = difficulties.filter(d => d === 'hard').length;
    const easyCount = difficulties.filter(d => d === 'easy').length;
    
    if (hardCount >= 3) difficultyAdjustment = 5;
    else if (hardCount >= 2) difficultyAdjustment = 3;
    else if (easyCount >= 3) difficultyAdjustment = -5;
    else if (easyCount >= 2) difficultyAdjustment = -3;
    
    const baseIQ = 85 + (overallPercentage * 60);
    const fsiq = Math.round(baseIQ + difficultyAdjustment);
    
    return {
        fsiq: Math.max(70, Math.min(145, fsiq)),
        domainScores: domainScores,
        overallAccuracy: overallPercentage
    };
}

function generateAdaptiveInterpretation(iq, domainScores) {
    let html = '<h3>Adaptive Testing Results</h3>';
    
    const classification = getClassification(iq);
    const percentile = getPercentile(iq);
    
    html += `
        <p><strong>Full Scale IQ:</strong> ${iq} (${percentile}th percentile)</p>
        <p><strong>Classification:</strong> ${classification}</p>
        <p><strong>Age at Testing:</strong> ${userAge} years</p>
        <p><strong>Test Type:</strong> Computerized Adaptive Testing (CAT)</p>
    `;
    
    html += `<h4 style="margin-top: 20px;">Adaptive Performance Summary</h4><p>The test adapted to your performance across ${testEngine.responses.length} questions:</p><ul>`;
    
    Object.keys(testEngine.domainScores).forEach(domain => {
        const finalDifficulty = testEngine.currentDifficulty[domain] || 'medium';
        html += `<li><strong>${domain}:</strong> Stabilized at ${finalDifficulty} difficulty</li>`;
    });
    
    html += '</ul>';
    
    if (iq >= 130) html += `<p>Your performance indicates exceptionally advanced cognitive abilities.</p>`;
    else if (iq >= 120) html += `<p>Your performance reflects superior intellectual functioning.</p>`;
    else if (iq >= 110) html += `<p>Your performance represents high average intellectual ability.</p>`;
    else if (iq >= 90) html += `<p>Your performance falls within the average range of intellectual functioning.</p>`;
    else html += `<p>Your performance suggests areas where additional support may be beneficial.</p>`;
    
    return html;
}

function getClassification(iq) {
    if (iq >= 130) return "Very Superior";
    if (iq >= 120) return "Superior";
    if (iq >= 110) return "High Average";
    if (iq >= 90) return "Average";
    if (iq >= 80) return "Low Average";
    if (iq >= 70) return "Borderline";
    return "Extremely Low";
}

function getPercentile(iq) {
    const zScore = (iq - 100) / 15;
    // Using a standard Normal CDF function
    const normalCDF = (z) => {
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        const t = 1 / (1 + p * z);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        return 0.5 * (1 + sign * y);
    };
    return Math.round(normalCDF(zScore) * 100);
}

function generateReport() {
    const results = calculateAdaptiveIQ();
    const testDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    let report = `ADAPTIVE IQ ASSESSMENT REPORT\n${'='.repeat(50)}\n\n`;
    report += `Assessment Date: ${new Date().toLocaleDateString()}\n`;
    report += `Test Duration: ${Math.floor(testDuration / 60)}m ${testDuration % 60}s\n`;
    report += `Age at Testing: ${userAge} years\nTotal Questions: ${testEngine.responses.length}\n\n`;
    
    report += `SUMMARY OF RESULTS\n${'-'.repeat(30)}\n`;
    report += `Full Scale IQ (FSIQ): ${results.fsiq}\nPercentile Rank: ${getPercentile(results.fsiq)}\nClassification: ${getClassification(results.fsiq)}\n\n`;
    
    report += `ADAPTIVE TESTING METRICS\n${'-'.repeat(30)}\n`;
    Object.keys(testEngine.domainScores).forEach(domain => {
        const data = testEngine.domainScores[domain];
        report += `\n${domain}:\n  Final Difficulty: ${testEngine.currentDifficulty[domain] || 'medium'}\n`;
        report += `  Questions: ${data.total} (E:${data.difficulties.easy} M:${data.difficulties.medium} H:${data.difficulties.hard})\n`;
        report += `  Accuracy: ${data.total > 0 ? Math.round((data.correct / data.total) * 100) : 'N/A'}%\n`;
        report += `  Domain Score: ${results.domainScores[domain]}\n`;
    });
    
    report += `\n\nDISCLAIMER\n${'-'.repeat(30)}\nThis assessment provides educational insights only. For clinical or diagnostic purposes, consult a qualified professional.\n`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Adaptive_IQ_Report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function generateRandomSequence(length) {
    const digits = [];
    for (let i = 0; i < length; i++) {
        digits.push(Math.floor(Math.random() * 10));
    }
    return digits.join('-');
}
