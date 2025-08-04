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
    
    if (question.type === 'matrix' && question.matrix) {
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
        const countdownDiv = document.createElement('div');
        countdownDiv.className = 'countdown-timer';
        document.body.appendChild(countdownDiv);
        countdownDiv.style.display = 'block';
        countdownDiv.textContent = timeLeft;
        
        questionTimer = setInterval(() => {
            timeLeft--;
            countdownDiv.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                countdownDiv.remove();
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

// Updated showResults function for app.js
// Replace the existing showResults function with this version

function showResults() {
    clearInterval(timerInterval);
    document.getElementById('test-container').classList.remove('active');
    document.getElementById('results').classList.add('active');
    localStorage.removeItem('iqTestState');
    
    // Load the Scientific IQ Calculator
    const calculator = new window.ScientificIQCalculator();
    
    // Prepare test data for scientific calculation
    const testData = {
        responses: testEngine.responses.map(r => ({
            domain: r.domain,
            correct: r.correct,
            responseTime: r.responseTime,
            difficulty: r.difficulty,
            questionId: r.questionId,
            category: r.domain // Ensure category is set
        })),
        domainScores: testEngine.domainScores,
        userAge: userAge || 18 // Default to 18 if age not specified
    };
    
    // Calculate scientific IQ
    const results = calculator.calculateFSIQ(testData);
    const detailedReport = calculator.generateDetailedReport(results);
    
    // Display main IQ score
    const iq = results.fsiq;
    document.getElementById('finalScore').textContent = iq;
    
    // Animate score circle
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (circumference * ((iq - 40) / 120));
    
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
        circle.style.transition = 'stroke-dashoffset 2s ease-out';
    }, 100);
    
    // Display domain scores with scientific scoring
    let categoryHTML = '<h3>Cognitive Domain Analysis</h3>';
    categoryHTML += '<div class="domain-scores-grid">';
    
    detailedReport.indices.forEach(index => {
        const domainData = testEngine.domainScores[index.name] || { correct: 0, total: 1, difficulties: {easy:0,medium:0,hard:0} };
        
        categoryHTML += `
            <div class="category-card enhanced">
                <h4>${index.name}</h4>
                <div class="category-score">${index.score}</div>
                <div class="score-details">
                    <p class="percentile">Percentile: ${index.percentile.toFixed(1)}%</p>
                    <p class="classification">${index.classification}</p>
                    <div class="performance-bar">
                        <div class="performance-fill" style="width: ${index.percentile}%"></div>
                    </div>
                    <p class="question-breakdown">
                        Questions: ${domainData.total} 
                        (E:${domainData.difficulties.easy} 
                         M:${domainData.difficulties.medium} 
                         H:${domainData.difficulties.hard})
                    </p>
                </div>
            </div>
        `;
    });
    
    categoryHTML += '</div>';
    document.getElementById('categoryScores').innerHTML = categoryHTML;
    
    // Generate comprehensive interpretation
    let interpretationHTML = generateScientificInterpretation(results, detailedReport);
    document.getElementById('interpretation').innerHTML = interpretationHTML;
    
    // Add confidence interval display
    addConfidenceIntervalDisplay(results);
    
    // Add strengths and weaknesses analysis
    addStrengthsWeaknessesDisplay(detailedReport);
    
    // Save results to backend if logged in
    if (window.currentUser && window.currentUser.is_authenticated) {
        saveTestResults(results);
    }
}

function generateScientificInterpretation(results, report) {
    let html = '<div class="scientific-interpretation">';
    
    // Summary section
    html += `
        <div class="result-summary">
            <h3>Test Results Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <label>Full Scale IQ (FSIQ)</label>
                    <value>${results.fsiq}</value>
                </div>
                <div class="summary-item">
                    <label>Percentile Rank</label>
                    <value>${results.percentileRank}%</value>
                </div>
                <div class="summary-item">
                    <label>Classification</label>
                    <value>${results.classification.level}</value>
                </div>
                <div class="summary-item">
                    <label>Confidence Interval</label>
                    <value>${results.confidenceIntervals.lower}-${results.confidenceIntervals.upper}</value>
                </div>
            </div>
        </div>
    `;
    
    // Classification explanation
    html += `
        <div class="classification-section">
            <h4>What Your Score Means</h4>
            <p><strong>${results.classification.level}:</strong> ${results.classification.description}</p>
            <p>Your Full Scale IQ of ${results.fsiq} places you at the ${results.percentileRank} percentile, 
               meaning you scored higher than ${results.percentileRank}% of the population.</p>
        </div>
    `;
    
    // Cognitive profile
    html += `
        <div class="cognitive-profile">
            <h4>Your Cognitive Profile</h4>
            <p>This assessment measured five key cognitive domains. Here's how you performed in each area:</p>
            <ul class="profile-list">
    `;
    
    report.indices.forEach(index => {
        const strength = index.score >= 110 ? ' (Strength)' : index.score <= 90 ? ' (Area for Growth)' : '';
        html += `
            <li>
                <strong>${index.name}:</strong> ${index.score} 
                <span class="profile-note">${strength}</span>
            </li>
        `;
    });
    
    html += '</ul></div>';
    
    // Test reliability
    html += `
        <div class="reliability-section">
            <h4>Test Reliability</h4>
            <p>Reliability Coefficient: ${results.reliability.coefficient} (${results.reliability.interpretation})</p>
            <p class="note">A reliability coefficient above 0.80 indicates highly consistent responses.</p>
        </div>
    `;
    
    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
        html += '<div class="recommendations-section"><h4>Personalized Recommendations</h4><ul>';
        report.recommendations.forEach(rec => {
            html += `<li>${rec.suggestion}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Important notes
    html += `
        <div class="important-notes">
            <h4>Important Considerations</h4>
            <ul>
                <li>This is an adaptive online assessment and should not be used for clinical diagnosis</li>
                <li>IQ scores can vary based on factors like fatigue, stress, and testing conditions</li>
                <li>Cognitive abilities are complex and multifaceted - a single score doesn't define your potential</li>
                <li>For clinical assessment, consult with a qualified psychologist</li>
            </ul>
        </div>
    `;
    
    html += '</div>';
    return html;
}

function addConfidenceIntervalDisplay(results) {
    const confidenceHTML = `
        <div class="confidence-interval-display">
            <h4>Statistical Confidence</h4>
            <p>We can be 95% confident that your true IQ score falls between 
               <strong>${results.confidenceIntervals.lower}</strong> and 
               <strong>${results.confidenceIntervals.upper}</strong>.</p>
            <div class="confidence-visual">
                <div class="confidence-range">
                    <span class="lower-bound">${results.confidenceIntervals.lower}</span>
                    <div class="confidence-bar">
                        <div class="point-estimate" style="left: ${((results.fsiq - results.confidenceIntervals.lower) / (results.confidenceIntervals.upper - results.confidenceIntervals.lower) * 100)}%">
                            <span>${results.fsiq}</span>
                        </div>
                    </div>
                    <span class="upper-bound">${results.confidenceIntervals.upper}</span>
                </div>
            </div>
        </div>
    `;
    
    // Insert after category scores
    const categoryScores = document.getElementById('categoryScores');
    categoryScores.insertAdjacentHTML('afterend', confidenceHTML);
}

function addStrengthsWeaknessesDisplay(report) {
    let html = '<div class="strengths-weaknesses">';
    
    if (report.strengths && report.strengths.length > 0) {
        html += '<div class="strengths-section"><h4>Cognitive Strengths</h4><ul>';
        report.strengths.forEach(strength => {
            html += `<li><strong>${strength.domain}</strong> - Score: ${strength.score} (+${strength.deviation.toFixed(1)} points above average)</li>`;
        });
        html += '</ul></div>';
    }
    
    if (report.weaknesses && report.weaknesses.length > 0) {
        html += '<div class="weaknesses-section"><h4>Areas for Development</h4><ul>';
        report.weaknesses.forEach(weakness => {
            html += `<li><strong>${weakness.domain}</strong> - Score: ${weakness.score} (${weakness.deviation.toFixed(1)} points below average)</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    
    // Insert before interpretation
    const interpretation = document.getElementById('interpretation');
    interpretation.insertAdjacentHTML('beforebegin', html);
}

function saveTestResults(results) {
    // Send results to backend
    fetch('/test/save_results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fsiq: results.fsiq,
            domain_scores: results.domainScores,
            percentile: results.percentileRank,
            classification: results.classification.level,
            reliability: results.reliability.coefficient,
            test_duration: Math.floor((Date.now() - startTime) / 1000)
        })
    }).catch(error => console.error('Error saving results:', error));
}

// Additional CSS for enhanced results display
const enhancedResultsCSS = `
<style>
.scientific-interpretation {
    background: #f8f9fa;
    padding: 30px;
    border-radius: 15px;
    margin-top: 30px;
}

.result-summary {
    background: white;
    padding: 25px;
    border-radius: 12px;
    margin-bottom: 25px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.summary-item {
    text-align: center;
}

.summary-item label {
    display: block;
    font-size: 0.85em;
    color: #666;
    margin-bottom: 5px;
}

.summary-item value {
    display: block;
    font-size: 1.5em;
    font-weight: bold;
    color: #333;
}

.domain-scores-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.category-card.enhanced {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    transition: transform 0.3s ease;
}

.category-card.enhanced:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.score-details {
    margin-top: 15px;
}

.percentile {
    font-size: 0.9em;
    color: #666;
    margin: 5px 0;
}

.classification {
    font-size: 0.85em;
    color: #667eea;
    font-weight: 500;
}

.performance-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    margin: 10px 0;
}

.performance-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: width 1s ease;
}

.question-breakdown {
    font-size: 0.8em;
    color: #999;
    margin-top: 10px;
}

.confidence-interval-display {
    background: white;
    padding: 25px;
    border-radius: 12px;
    margin: 25px 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.confidence-visual {
    margin-top: 20px;
}

.confidence-range {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.confidence-bar {
    flex: 1;
    height: 40px;
    background: #e9ecef;
    border-radius: 20px;
    margin: 0 15px;
    position: relative;
}

.point-estimate {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.9em;
}

.lower-bound, .upper-bound {
    font-weight: bold;
    color: #666;
}

.strengths-weaknesses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin: 25px 0;
}

.strengths-section, .weaknesses-section {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.strengths-section h4 {
    color: #2ecc71;
    margin-bottom: 15px;
}

.weaknesses-section h4 {
    color: #e74c3c;
    margin-bottom: 15px;
}

.profile-list {
    list-style: none;
    padding: 0;
}

.profile-list li {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
}

.profile-note {
    font-size: 0.85em;
    color: #666;
    font-style: italic;
}

.reliability-section {
    background: #e7f3ff;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
}

.recommendations-section {
    background: #f0f9ff;
    padding: 20px;
    border-radius: 12px;
    margin: 20px 0;
}

.important-notes {
    background: #fff9e6;
    padding: 20px;
    border-radius: 12px;
    margin-top: 20px;
    border-left: 4px solid #f39c12;
}

.note {
    font-size: 0.85em;
    color: #666;
    font-style: italic;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .summary-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .domain-scores-grid {
        grid-template-columns: 1fr;
    }
    
    .strengths-weaknesses {
        grid-template-columns: 1fr;
    }
    
    .scientific-interpretation {
        padding: 20px 15px;
    }
}
</style>
`;

// Add the CSS to the document
document.head.insertAdjacentHTML('beforeend', enhancedResultsCSS);

function calculateAdaptiveIQ() {
    // Delegate to the scientific calculator
    const calculator = new window.ScientificIQCalculator();
    
    const testData = {
        responses: testEngine.responses,
        domainScores: testEngine.domainScores,
        userAge: userAge
    };
    
    return calculator.calculateFSIQ(testData);
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
// Add touch support for options
function addTouchSupport() {
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('option')) {
            e.target.classList.add('touch-active');
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.classList.contains('option')) {
            e.target.classList.remove('touch-active');
            selectAnswer(Array.from(e.target.parentNode.children).indexOf(e.target));
        }
    });
}

// Call this after DOM loads
document.addEventListener('DOMContentLoaded', addTouchSupport);