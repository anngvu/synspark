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

            // Shuffle questions
            this.questions = this.shuffleArray(this.questions);
            
            // Calculate total possible score
            this.totalPossibleScore = this.questions.reduce((total, question) => {
                return total + question.answers.filter(a => a.correct).reduce((sum, a) => sum + (a.points || 1), 0);
            }, 0);
            
            // Initialize question states and results
            this.questionStates = new Array(this.questions.length).fill('unanswered');
            this.questionResults = new Array(this.questions.length).fill(null);

            this.showQuiz();
            this.displayQuestion();
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

    showQuiz() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
        
        document.getElementById('totalQuestions').textContent = this.questions.length;
        document.getElementById('totalScore').textContent = this.totalPossibleScore;
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
        document.getElementById('currentScore').textContent = this.score;
        
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
        
        // Update score display
        document.getElementById('currentScore').textContent = this.score;
        
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
        
        // Check if user qualifies for badge (80% of questions answered)
        const completionPercentage = Math.round((answeredCount / this.questions.length) * 100);
        if (completionPercentage >= 80) {
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
            const confirmed = confirm(`You've answered ${answeredCount} questions. Are you sure you want to exit and see your results?`);
            if (!confirmed) return;
        }
        this.showResults(false);
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

// Initialize quiz when page loads
document.addEventListener('DOMContentLoaded', () => {
    quiz = new Quiz();
    quiz.loadQuestions();
});