class Quiz {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalPossibleScore = 0;
        this.currentQuestionAnswered = false;
        this.selectedAnswers = [];
        this.questionStates = []; // Track which questions have been answered
        this.questionResults = []; // Track results for each question
        this.returnFromList = false;
        
    }

    getBadgeRequirement() {
        return Math.ceil(this.questions.length * 0.8);
    }

    qualifiesForBadge(answeredCount) {
        return answeredCount >= this.getBadgeRequirement();
    }

    async loadQuestions() {
        try {
            const questionFiles = [
                'questions/curated/confluence_maya_ar_bypass_followup.yaml',
                'questions/curated/forum_platform_positioning.yaml',
                'questions/curated/forum_open_data_vs_public_access.yaml',
                'questions/curated/forum_messaging_reliability.yaml',
                'questions/curated/forum_materialized_view_union.yaml',
                'questions/curated/forum_large_table_validation_timing.yaml',
                'questions/curated/forum_globus_integration_strategy.yaml',
                'questions/curated/forum_file_view_eventual_consistency.yaml',
                'questions/curated/forum_file_preview_permissions.yaml',
                'questions/curated/forum_file_metadata_change.yaml',
                'questions/curated/forum_file_metadata_access.yaml',
                'questions/curated/forum_entity_version_tracking.yaml',
                'questions/curated/forum_email_integration_requirements.yaml',
                'questions/curated/forum_dataset_folder_management.yaml',
                'questions/curated/forum_data_warehouse_user_analysis.yaml',
                'questions/curated/forum_data_transfer_costs.yaml',
                'questions/curated/forum_column_model_reuse.yaml',
                'questions/curated/forum_data_migration_strategy.yaml',
                'questions/curated/forum_bulk_upload_timeouts.yaml',
                'questions/curated/forum_ar_types_comparison.yaml',
                'questions/curated/forum_api_rate_limiting.yaml',
                'questions/curated/forum_acl_vs_access_requirements.yaml',
                'questions/curated/forum_access_status_annotation.yaml',
                'questions/curated/other_data_processing.yaml',
                'questions/curated/forum_wiki_javascript_permissions.yaml',
                'questions/curated/forum_user_access_management.yaml',
                'questions/curated/forum_upload_performance_optimization.yaml',
                'questions/curated/forum_timestamp_format_requirements.yaml',
                'questions/curated/forum_team_privacy_challenges.yaml',
                'questions/curated/forum_sql_joins_limitations.yaml',
                'questions/curated/forum_s3_to_synapse_migration.yaml',
                'questions/curated/forum_s3_direct_access_setup.yaml'
            ];

            const loadPromises = questionFiles.map(async (file) => {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const yamlText = await response.text();
                        const question = jsyaml.load(yamlText);
                        if (question && question.type === 'quiz') {
                            return question;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load ${file}:`, error);
                }
                return null;
            });

            const results = await Promise.all(loadPromises);
            this.questions = results.filter(q => q !== null);
            
            if (this.questions.length === 0) {
                throw new Error('No valid quiz questions found');
            }

            // Smart shuffle with constraints (starter questions first, dependencies respected)
            this.questions = this.smartShuffle(this.questions);
            
            // Calculate total possible score
            this.totalPossibleScore = this.questions.reduce((total, question) => {
                return total + question.answers.filter(a => a.correct).reduce((sum, a) => sum + (a.points || 1), 0);
            }, 0);
            
            // Initialize question states and results
            this.questionStates = new Array(this.questions.length).fill('unanswered');
            this.questionResults = new Array(this.questions.length).fill(null);

            // Don't auto-start the quiz - wait for user to click start button
            // this.showQuiz(); 
            // this.displayQuestion();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError();
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    smartShuffle(questions) {
        // Create maps for easier lookup by ID
        const questionMap = new Map();
        questions.forEach(q => {
            if (q.id) {
                questionMap.set(q.id, q);
            }
        });

        // Separate questions by type
        const starterQuestions = questions.filter(q => q.starter === true);
        const dependentQuestions = questions.filter(q => q.followup_to);
        const regularQuestions = questions.filter(q => !q.starter && !q.followup_to);

        // Build dependency map to track which questions need to come before others
        const dependencyMap = new Map();
        dependentQuestions.forEach(q => {
            if (q.followup_to) {
                const parentId = q.followup_to;
                if (!dependencyMap.has(parentId)) {
                    dependencyMap.set(parentId, []);
                }
                dependencyMap.get(parentId).push(q);
            }
        });

        // Start with shuffled starter questions
        const result = this.shuffleArray(starterQuestions);

        // Process remaining questions, respecting dependencies
        const processed = new Set();
        const toProcess = [...regularQuestions];

        // Add questions that have dependents to toProcess if they're not already there
        dependencyMap.forEach((dependents, parentId) => {
            const parent = questionMap.get(parentId);
            if (parent && !starterQuestions.includes(parent)) {
                if (!toProcess.includes(parent)) {
                    toProcess.push(parent);
                }
            }
        });

        // Process questions while respecting dependencies
        while (toProcess.length > 0) {
            let addedAny = false;
            
            for (let i = toProcess.length - 1; i >= 0; i--) {
                const question = toProcess[i];
                
                // Check if this question can be added (no unresolved dependencies)
                let canAdd = true;
                
                // If this question is a followup, check if its parent is already processed
                if (question.followup_to) {
                    const parent = questionMap.get(question.followup_to);
                    if (parent && !processed.has(parent)) {
                        canAdd = false;
                    }
                }
                
                if (canAdd) {
                    // Add this question
                    result.push(question);
                    processed.add(question);
                    toProcess.splice(i, 1);
                    addedAny = true;
                    
                    // Add any dependents of this question
                    if (question.id && dependencyMap.has(question.id)) {
                        const dependents = dependencyMap.get(question.id);
                        dependents.forEach(dependent => {
                            if (!processed.has(dependent) && !toProcess.includes(dependent)) {
                                toProcess.push(dependent);
                            }
                        });
                    }
                }
            }
            
            // If we couldn't add any questions, there might be a circular dependency
            // or missing parent - just add remaining questions randomly
            if (!addedAny && toProcess.length > 0) {
                console.warn('Potential dependency issue, adding remaining questions randomly');
                result.push(...this.shuffleArray(toProcess));
                break;
            }
        }

        console.log('Smart shuffle complete:', {
            total: result.length,
            starters: starterQuestions.length,
            regular: regularQuestions.length,
            dependent: dependentQuestions.length
        });

        return result;
    }


    showQuiz() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
        
        document.getElementById('totalQuestions').textContent = this.questions.length;
        document.getElementById('badgeRequirement').textContent = this.getBadgeRequirement();
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        const container = document.getElementById('questionContainer');
        
        // Update counters
        document.getElementById('currentQuestion').textContent = this.currentQuestionIndex + 1;
        // Update progress bar and counter
        const answeredCount = this.questionStates.filter(state => state === 'answered').length;
        const badgeRequirement = this.getBadgeRequirement();
        
        document.getElementById('questionsAnswered').textContent = answeredCount;
        
        // Update progress bar
        const progressPercentage = (answeredCount / badgeRequirement) * 100;
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = Math.min(progressPercentage, 100) + '%';
        
        if (this.qualifiesForBadge(answeredCount)) {
            progressFill.classList.add('badge-earned');
        }
        
        // Reset state
        this.currentQuestionAnswered = false;
        this.selectedAnswers = [];
        
        // Prepare answers (shuffle if requested)
        let answers = [...question.answers];
        if (question.random_answer_order) {
            answers = this.shuffleArray(answers);
        }
        
        // Always use radio buttons for single selection, even for multiple correct questions
        const inputType = 'radio';
        const inputName = `question_${this.currentQuestionIndex}`;
        
        // Build HTML
        container.innerHTML = `
            <div class="question-card">
                <div class="question-level level-${question.level || 'intermediate'}">
                    ${(question.level || 'intermediate').toUpperCase()}
                </div>
                
                ${question.context ? `
                    <div class="context">
                        <div>${this.formatText(question.context)}</div>
                    </div>
                ` : ''}
                
                <div class="question">${this.formatText(question.question)}</div>
                
                <ul class="answers">
                    ${answers.map((answer, index) => `
                        <li class="answer-item">
                            <label class="answer-label" data-index="${index}">
                                <input 
                                    type="${inputType}" 
                                    name="${inputName}" 
                                    value="${index}" 
                                    class="answer-input"
                                    onchange="quiz.selectAnswer(${index}, ${JSON.stringify(answer).replace(/"/g, '&quot;')})"
                                />
                                <span class="answer-text">${this.formatText(answer.text)}</span>
                            </label>
                            <div class="feedback" id="feedback_${index}"></div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        // Add multiple choice hint after the HTML is set
        const isMultipleCorrect = question.multiple_correct || (question.meta && question.meta.multiple_correct);
        if (isMultipleCorrect) {
            const questionDiv = container.querySelector('.question');
            if (questionDiv) {
                const hintDiv = document.createElement('div');
                hintDiv.className = 'multiple-choice-hint';
                hintDiv.innerHTML = '💡 <strong>Tip:</strong> This question has multiple correct answers with different point values. Choose the best answer for maximum points.';
                questionDiv.insertAdjacentElement('afterend', hintDiv);
            }
        }
        
        // Reset buttons
        document.getElementById('submitBtn').style.display = 'inline-block';
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('retryBtn').style.display = 'none';
    }

    formatText(text) {
        if (typeof text !== 'string') return text;
        
        // Convert markdown-style formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    selectAnswer(index, answer) {
        // Always handle as single selection (radio button behavior)
        this.selectedAnswers = [{ index, answer }];
    }

    submitAnswer() {
        if (this.selectedAnswers.length === 0) {
            alert('Please select at least one answer.');
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.currentQuestionAnswered = true;
        
        // With single selection, we only have one answer to check
        const { index, answer } = this.selectedAnswers[0];
        const label = document.querySelector(`label[data-index="${index}"]`);
        const feedback = document.getElementById(`feedback_${index}`);
        
        let questionScore = 0;
        let isCorrect = answer.correct;
        
        if (isCorrect) {
            label.classList.add('answer-correct');
            questionScore = answer.points || 1;
            feedback.innerHTML = answer.message;
            feedback.className = 'feedback correct';
            this.score += questionScore;
        } else {
            label.classList.add('answer-incorrect');
            feedback.innerHTML = answer.message;
            feedback.className = 'feedback incorrect';
        }
        feedback.style.display = 'block';
        
        // For multiple correct questions, show what other correct answers were available
        const isMultipleCorrect = question.multiple_correct || (question.meta && question.meta.multiple_correct);
        if (isMultipleCorrect && !isCorrect) {
            // Show other correct answers that weren't selected
            question.answers.forEach((otherAnswer, otherIndex) => {
                if (otherAnswer.correct && otherIndex !== index) {
                    const otherLabel = document.querySelector(`label[data-index="${otherIndex}"]`);
                    const otherFeedback = document.getElementById(`feedback_${otherIndex}`);
                    otherLabel.classList.add('answer-correct');
                    otherFeedback.innerHTML = `Also correct (${otherAnswer.points || 1} pts): ${otherAnswer.message}`;
                    otherFeedback.className = 'feedback correct';
                    otherFeedback.style.display = 'block';
                }
            });
        }
        
        // Mark this question as answered and store result
        this.questionStates[this.currentQuestionIndex] = 'answered';
        this.questionResults[this.currentQuestionIndex] = {
            question: question,
            selectedAnswer: answer,
            selectedIndex: index,
            isCorrect: isCorrect,
            pointsEarned: isCorrect ? questionScore : 0
        };
        
        // Update progress bar and counter
        const answeredCount = this.questionStates.filter(state => state === 'answered').length;
        const badgeRequirement = this.getBadgeRequirement();
        
        document.getElementById('questionsAnswered').textContent = answeredCount;
        
        // Update progress bar
        const progressPercentage = (answeredCount / badgeRequirement) * 100;
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = Math.min(progressPercentage, 100) + '%';
        
        if (this.qualifiesForBadge(answeredCount)) {
            progressFill.classList.add('badge-earned');
        }
        
        // Disable all inputs
        const inputs = document.querySelectorAll('.answer-input');
        inputs.forEach(input => input.disabled = true);
        
        // Update buttons
        document.getElementById('submitBtn').style.display = 'none';
        
        // Show retry button for wrong answers if retries are allowed
        if (question.allow_retry && !isCorrect) {
            document.getElementById('retryBtn').style.display = 'inline-block';
        }
        
        // Always show next button after submission
        if (this.currentQuestionIndex < this.questions.length - 1) {
            document.getElementById('nextBtn').textContent = 'Next Question';
            document.getElementById('nextBtn').style.display = 'inline-block';
        } else {
            document.getElementById('nextBtn').textContent = 'View Results';
            document.getElementById('nextBtn').style.display = 'inline-block';
        }
    }

    retryQuestion() {
        // Reset question state
        this.displayQuestion();
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        } else {
            this.showResults(true);
        }
    }

    showResults(isComplete = true) {
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('questionListView').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        
        const percentage = Math.round((this.score / this.totalPossibleScore) * 100);
        const answeredCount = this.questionStates.filter(state => state === 'answered').length;
        
        // Update title based on completion status
        document.getElementById('resultsTitle').textContent = isComplete ? 'Quiz Complete!' : 'Quiz Results';
        
        // Update scores and completion stats
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalTotal').textContent = this.totalPossibleScore;
        document.getElementById('finalPercentage').textContent = percentage;
        document.getElementById('questionsAnswered').textContent = answeredCount;
        document.getElementById('totalQuestionsCount').textContent = this.questions.length;
        
        // Check if user qualifies for badge
        if (this.qualifiesForBadge(answeredCount)) {
            const completionPercentage = Math.round((answeredCount / this.questions.length) * 100);
            document.getElementById('badgeSection').style.display = 'block';
            document.getElementById('badgePercentage').textContent = completionPercentage;
        }
        
        // Populate question breakdown
        this.populateQuestionBreakdown();
    }

    restartQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = this.shuffleArray(this.questions);
        this.questionStates = new Array(this.questions.length).fill('unanswered');
        this.questionResults = new Array(this.questions.length).fill(null);
        
        // Hide details and badge sections for fresh start
        document.getElementById('detailsSection').style.display = 'none';
        document.getElementById('badgeSection').style.display = 'none';
        document.querySelector('.details-toggle button').textContent = '📊 Show Details';
        
        document.getElementById('results').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
        
        this.displayQuestion();
    }

    showQuestionList() {
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('questionListView').style.display = 'block';
        
        const container = document.getElementById('questionListContainer');
        container.innerHTML = this.questions.map((question, index) => {
            const status = this.getQuestionStatus(index);
            const isCurrentQ = index === this.currentQuestionIndex;
            
            return `
                <div class="question-item ${isCurrentQ ? 'current' : ''}" onclick="quiz.jumpToQuestion(${index})">
                    <div class="question-title">
                        ${index + 1}. ${question.title || this.truncateText(this.stripHtml(question.question), 60)}
                    </div>
                    <div class="question-status ${status.class}">${status.text}</div>
                </div>
            `;
        }).join('');
    }

    getQuestionStatus(index) {
        if (index === this.currentQuestionIndex) {
            return { class: 'status-current', text: 'Current' };
        }
        if (this.questionStates[index] === 'answered') {
            return { class: 'status-answered', text: 'Answered' };
        }
        return { class: 'status-unanswered', text: 'Not Answered' };
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    stripHtml(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || '';
    }

    jumpToQuestion(index) {
        this.currentQuestionIndex = index;
        this.returnFromList = true;
        this.returnToQuiz();
        this.displayQuestion();
    }

    returnToQuiz() {
        document.getElementById('questionListView').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
    }

    exitQuiz() {
        // Confirm exit if questions have been answered
        const answeredCount = this.questionStates.filter(state => state === 'answered').length;
        if (answeredCount > 0) {
            const choice = confirm(`You've answered ${answeredCount} questions. Click OK to see your results, or Cancel to return to the home page.`);
            if (choice) {
                this.showResults(false);
            } else {
                returnToLanding();
            }
        } else {
            // No questions answered, just return to landing
            returnToLanding();
        }
    }

    populateQuestionBreakdown() {
        const container = document.getElementById('questionBreakdown');
        const breakdown = this.questions.map((question, index) => {
            const result = this.questionResults[index];
            const maxPoints = question.answers.filter(a => a.correct).reduce((max, a) => Math.max(max, a.points || 1), 0);
            
            if (result) {
                // Question was answered
                const statusClass = result.isCorrect ? 'correct' : 'incorrect';
                const statusText = result.isCorrect ? '✅ Correct' : '❌ Incorrect';
                const pointsText = `${result.pointsEarned}/${maxPoints} points`;
                
                return `
                    <div class="question-breakdown-item ${statusClass}">
                        <strong>${index + 1}. ${question.title || 'Question ' + (index + 1)}</strong>
                        <div>${statusText} - ${pointsText}</div>
                        <div><em>Your answer: ${result.selectedAnswer.text}</em></div>
                    </div>
                `;
            } else {
                // Question was not answered
                return `
                    <div class="question-breakdown-item unanswered">
                        <strong>${index + 1}. ${question.title || 'Question ' + (index + 1)}</strong>
                        <div>⚪ Not answered - 0/${maxPoints} points</div>
                    </div>
                `;
            }
        }).join('');
        
        container.innerHTML = breakdown;
    }
}

// Global functions for HTML onclick handlers
let quiz;

function submitAnswer() {
    quiz.submitAnswer();
}

function retryQuestion() {
    quiz.retryQuestion();
}

function nextQuestion() {
    quiz.nextQuestion();
}

function restartQuiz() {
    quiz.restartQuiz();
}

function showQuestionList() {
    quiz.showQuestionList();
}

function returnToQuiz() {
    quiz.returnToQuiz();
}

function exitQuiz() {
    quiz.exitQuiz();
}

function toggleDetails() {
    const detailsSection = document.getElementById('detailsSection');
    const toggleButton = document.querySelector('.details-toggle button');
    
    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        toggleButton.textContent = '📊 Hide Details';
    } else {
        detailsSection.style.display = 'none';
        toggleButton.textContent = '📊 Show Details';
    }
}

function downloadBadge() {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = 'synspark_action_potential.png';
    link.download = 'synspark_action_potential_badge.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Landing page function
async function startQuiz() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('quizInterface').style.display = 'block';
    
    if (!quiz) {
        quiz = new Quiz();
        await quiz.loadQuestions();
        // After questions are loaded, show the quiz
        quiz.showQuiz();
        quiz.displayQuestion();
    } else {
        // If quiz already exists, just show it
        quiz.showQuiz();
        quiz.displayQuestion();
    }
}

// Return to landing page function
function returnToLanding() {
    document.getElementById('quizInterface').style.display = 'none';
    document.getElementById('landingPage').style.display = 'block';
}

// Function to load questions for chart analysis only
async function loadQuestionsForChart() {
    const questionFiles = [
        'questions/curated/confluence_maya_ar_bypass_followup.yaml',
        'questions/curated/forum_platform_positioning.yaml',
        'questions/curated/forum_open_data_vs_public_access.yaml',
        'questions/curated/forum_messaging_reliability.yaml',
        'questions/curated/forum_materialized_view_union.yaml',
        'questions/curated/forum_large_table_validation_timing.yaml',
        'questions/curated/forum_globus_integration_strategy.yaml',
        'questions/curated/forum_file_view_eventual_consistency.yaml',
        'questions/curated/forum_file_preview_permissions.yaml',
        'questions/curated/forum_file_metadata_change.yaml',
        'questions/curated/forum_file_metadata_access.yaml',
        'questions/curated/forum_entity_version_tracking.yaml',
        'questions/curated/forum_email_integration_requirements.yaml',
        'questions/curated/forum_dataset_folder_management.yaml',
        'questions/curated/forum_data_warehouse_user_analysis.yaml',
        'questions/curated/forum_data_transfer_costs.yaml',
        'questions/curated/forum_column_model_reuse.yaml',
        'questions/curated/forum_data_migration_strategy.yaml',
        'questions/curated/forum_bulk_upload_timeouts.yaml',
        'questions/curated/forum_ar_types_comparison.yaml',
        'questions/curated/forum_api_rate_limiting.yaml',
        'questions/curated/forum_acl_vs_access_requirements.yaml',
        'questions/curated/forum_access_status_annotation.yaml',
        'questions/curated/other_data_processing.yaml',
        'questions/curated/forum_wiki_javascript_permissions.yaml',
        'questions/curated/forum_user_access_management.yaml',
        'questions/curated/forum_upload_performance_optimization.yaml',
        'questions/curated/forum_timestamp_format_requirements.yaml',
        'questions/curated/forum_team_privacy_challenges.yaml',
        'questions/curated/forum_sql_joins_limitations.yaml',
        'questions/curated/forum_s3_to_synapse_migration.yaml',
        'questions/curated/forum_s3_direct_access_setup.yaml'
    ];

    const loadPromises = questionFiles.map(async (file) => {
        try {
            const response = await fetch(file);
            if (response.ok) {
                const yamlText = await response.text();
                const question = jsyaml.load(yamlText);
                if (question && question.type === 'quiz') {
                    return question;
                }
            }
        } catch (error) {
            console.warn(`Failed to load ${file}:`, error);
        }
        return null;
    });

    const results = await Promise.all(loadPromises);
    return results.filter(q => q !== null);
}

// Function to analyze questions and populate chart
async function populateQuestionDistribution() {
    try {
        console.log('Loading questions for chart...');
        const questions = await loadQuestionsForChart();
        console.log(`Loaded ${questions.length} questions`);
        
        if (questions.length === 0) {
            throw new Error('No questions loaded');
        }
        
        // Count difficulty levels
        const counts = {
            beginner: 0,
            intermediate: 0,
            advanced: 0
        };
        
        questions.forEach(question => {
            let level = question.level || 'intermediate';
            // Treat intermediate-advanced as advanced
            if (level === 'intermediate-advanced') {
                level = 'advanced';
            }
            if (counts.hasOwnProperty(level)) {
                counts[level]++;
            } else {
                counts.intermediate++; // default fallback
            }
        });
        
        const total = questions.length;
        
        // Calculate percentages
        const percentages = {
            beginner: Math.round((counts.beginner / total) * 100),
            intermediate: Math.round((counts.intermediate / total) * 100),
            advanced: Math.round((counts.advanced / total) * 100)
        };
        
        // Create chart HTML
        const maxCount = Math.max(counts.beginner, counts.intermediate, counts.advanced);
        const chartHTML = `
            <div class="chart-bar">
                <div class="bar-fill bar-beginner" style="height: ${(counts.beginner / maxCount) * 120}px;"></div>
                <div class="bar-label">Beginner</div>
                <div class="bar-count">${counts.beginner} questions (${percentages.beginner}%)</div>
            </div>
            <div class="chart-bar">
                <div class="bar-fill bar-intermediate" style="height: ${(counts.intermediate / maxCount) * 120}px;"></div>
                <div class="bar-label">Intermediate</div>
                <div class="bar-count">${counts.intermediate} questions (${percentages.intermediate}%)</div>
            </div>
            <div class="chart-bar">
                <div class="bar-fill bar-advanced" style="height: ${(counts.advanced / maxCount) * 120}px;"></div>
                <div class="bar-label">Advanced</div>
                <div class="bar-count">${counts.advanced} questions (${percentages.advanced}%)</div>
            </div>
        `;
        
        // Update chart
        document.getElementById('difficultyChart').innerHTML = chartHTML;
        
        // Clear summary - keep chart clean
        document.getElementById('questionSummary').innerHTML = '';
            
        console.log('Chart updated successfully:', counts);
            
    } catch (error) {
        console.error('Error loading question distribution:', error);
        document.getElementById('difficultyChart').innerHTML = 
            '<div class="loading-chart">Unable to load question distribution</div>';
        document.getElementById('questionSummary').innerHTML = 
            '<strong>Questions available</strong> covering data storage, access control, APIs, and advanced platform features';
    }
}

// Initialize page when loaded (show landing page and populate chart)
document.addEventListener('DOMContentLoaded', () => {
    // Landing page is shown by default, quiz will be initialized when user clicks start
    populateQuestionDistribution();
});