// Main application logic
import { db } from './db.js';
import { ClaudeService } from './claude-service.js';
import { firebaseService } from './firebase-service.js';

class CalorieTrackerApp {
    constructor() {
        this.claudeService = new ClaudeService();
        this.currentTab = 'add-meal';
        this.selectedDate = new Date();
        this.conversationHistory = [];
        this.conversationContext = '';
        this.currentEstimate = null;
        this.isProcessing = false;
        this.currentParsedWorkout = null;
        this.charts = {};

        this.init();
    }

    async init() {
        // Initialize database
        await db.init();

        // Initialize Firebase (if configured)
        const firebaseInitialized = await firebaseService.initialize();
        if (firebaseInitialized) {
            console.log('Firebase initialized');
            if (firebaseService.isSignedIn()) {
                this.updateFirebaseStatus('Syncing');
                this.updateAuthUI();

                // Sync local data to Firestore
                this.syncLocalMealsToFirestore().then(() => {
                    console.log('Background sync completed');
                    this.loadTodayMeals();
                }).catch(err => {
                    console.error('Background sync failed:', err);
                });
            } else {
                this.updateFirebaseStatus('Not signed in');
                document.getElementById('auth-modal').classList.add('active');
            }
        } else {
            this.updateFirebaseStatus('Not configured');
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(err => {
                console.log('Service worker registration failed:', err);
            });
        }

        // Setup event listeners
        this.setupTabNavigation();
        this.setupMealEntry();
        this.setupSettings();
        this.setupModals();
        this.setupAuth();
        this.setupWeightTab();
        this.setupWorkoutsTab();
        this.setupInsightsTab();

        // Load initial data
        this.loadTodayMeals();

        // Default weight date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('weight-date').value = today;

        // Load saved unit preference
        const savedUnit = localStorage.getItem('weightUnit');
        if (savedUnit) {
            document.getElementById('weight-unit').value = savedUnit;
        }
    }

    // ========================
    // Tab Navigation
    // ========================

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');

                this.currentTab = tabName;

                // Load data when switching tabs
                if (tabName === 'add-meal') {
                    this.loadTodayMeals();
                } else if (tabName === 'weight') {
                    this.loadWeightHistory();
                } else if (tabName === 'workouts') {
                    this.loadWorkoutHistory();
                } else if (tabName === 'insights') {
                    this.loadInsights();
                }
            });
        });
    }

    // ========================
    // Meal Entry
    // ========================

    setupMealEntry() {
        const foodInput = document.getElementById('food-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-conversation-btn');
        const saveBtn = document.getElementById('save-entry-btn');

        foodInput.addEventListener('input', () => {
            foodInput.style.height = 'auto';
            foodInput.style.height = foodInput.scrollHeight + 'px';
            const hasText = foodInput.value.trim().length > 0;
            sendBtn.disabled = !hasText || this.isProcessing;
        });

        sendBtn.addEventListener('click', () => this.submitFood());

        foodInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    this.submitFood();
                }
            }
        });

        clearBtn.addEventListener('click', () => this.resetConversation());
        saveBtn.addEventListener('click', () => this.saveEntry());
    }

    async submitFood() {
        const foodInput = document.getElementById('food-input');
        const input = foodInput.value.trim();

        if (!input || this.isProcessing) return;

        this.isProcessing = true;
        this.showError(null);

        this.addMessage(input, true);
        this.conversationContext += `User: ${input}\n`;

        foodInput.value = '';
        foodInput.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;

        try {
            let recentMeals = await db.getRecentMeals(14);

            if (firebaseService.isSignedIn()) {
                const firestoreMeals = await firebaseService.getRecentMeals(14);
                const mealMap = new Map();
                recentMeals.forEach(meal => {
                    mealMap.set(meal.timestamp + meal.foodDescription, meal);
                });
                firestoreMeals.forEach(meal => {
                    mealMap.set(meal.timestamp + meal.foodDescription, meal);
                });
                recentMeals = Array.from(mealMap.values());
            }

            const mealHistoryContext = this.formatMealHistory(recentMeals);
            const fullContext = mealHistoryContext + (this.conversationContext || '');

            const estimate = await this.claudeService.estimateCalories(input, fullContext);

            this.currentEstimate = estimate;

            this.addMessage(estimate.analysis, false);
            this.conversationContext += `Assistant: ${estimate.analysis}\n`;

            if (estimate.needsClarification && estimate.clarificationQuestion) {
                this.addMessage(estimate.clarificationQuestion, false);
                this.conversationContext += `Question: ${estimate.clarificationQuestion}\n`;
                this.showSaveButton(true);
            } else {
                await this.saveEntry();
            }
        } catch (error) {
            this.showError(error.message);
            console.error('Error estimating calories:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    formatMealHistory(meals) {
        if (!meals || meals.length === 0) return '';

        const mealsByDate = {};
        meals.forEach(meal => {
            if (!mealsByDate[meal.date]) mealsByDate[meal.date] = [];
            mealsByDate[meal.date].push(meal);
        });

        let history = '=== RECENT MEAL HISTORY ===\n';
        history += 'The user has logged these meals recently. Reference them when the user mentions "yesterday", "the same as", "similar to what I had", etc.\n\n';

        const dates = Object.keys(mealsByDate).sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        dates.slice(0, 10).forEach(date => {
            const dayLabel = date === today ? 'Today' : date === yesterday ? 'Yesterday' : date;
            history += `${dayLabel}:\n`;

            mealsByDate[date].forEach(meal => {
                const calorieRange = meal.caloriesMin === meal.caloriesMax
                    ? `${meal.caloriesMin} cal`
                    : `${meal.caloriesMin}-${meal.caloriesMax} cal`;
                history += `  - ${meal.foodDescription} (${calorieRange})\n`;
            });
            history += '\n';
        });

        history += '=== END MEAL HISTORY ===\n\n';
        return history;
    }

    addMessage(text, isUser) {
        const messagesContainer = document.getElementById('conversation-messages');
        const emptyState = document.getElementById('conversation-empty');

        emptyState.style.display = 'none';

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = text;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(bubble);
        messageDiv.appendChild(time);
        messagesContainer.appendChild(messageDiv);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.conversationHistory.push({ text, isUser, timestamp: new Date() });

        document.getElementById('clear-conversation-btn').style.display = 'block';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (message) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'flex';
        } else {
            errorDiv.style.display = 'none';
        }
    }

    showSaveButton(show) {
        const saveBtn = document.getElementById('save-entry-btn');
        saveBtn.style.display = show ? 'block' : 'none';
        if (show) saveBtn.textContent = 'Skip & Save Entry';
    }

    async saveEntry() {
        if (!this.currentEstimate) return;

        try {
            const meal = {
                timestamp: Date.now(),
                foodDescription: this.conversationHistory
                    .filter(m => m.isUser)
                    .map(m => m.text)
                    .join(' | '),
                caloriesMin: this.currentEstimate.caloriesMin,
                caloriesMax: this.currentEstimate.caloriesMax,
                clarifications: this.conversationHistory
                    .filter(m => !m.isUser)
                    .map(m => m.text)
                    .join('\n'),
                notes: this.currentEstimate.analysis
            };

            await db.addMeal(meal);

            if (firebaseService.initialized) {
                await firebaseService.addMeal(meal);
            }

            this.resetConversation();
            await this.loadTodayMeals();

            this.showTemporaryMessage('Meal saved successfully!');
        } catch (error) {
            this.showError('Failed to save meal: ' + error.message);
        }
    }

    resetConversation() {
        this.conversationHistory = [];
        this.conversationContext = '';
        this.currentEstimate = null;

        const messagesContainer = document.getElementById('conversation-messages');
        messagesContainer.innerHTML = '';

        const emptyState = document.getElementById('conversation-empty');
        emptyState.style.display = 'flex';

        document.getElementById('clear-conversation-btn').style.display = 'none';
        document.getElementById('save-entry-btn').style.display = 'none';
        this.showError(null);
    }

    showTemporaryMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #34c759;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ========================
    // Today's Meals (embedded in Add Meal tab)
    // ========================

    async loadTodayMeals() {
        try {
            let meals = await db.getMealsByDate(new Date());

            if (firebaseService.isSignedIn()) {
                const firestoreMeals = await firebaseService.getMealsByDate(new Date());
                const mealMap = new Map();
                meals.forEach(m => mealMap.set(m.timestamp + m.foodDescription, m));
                firestoreMeals.forEach(m => mealMap.set(m.timestamp + m.foodDescription, m));
                meals = Array.from(mealMap.values());
            }

            meals.sort((a, b) => b.timestamp - a.timestamp);

            const listEl = document.getElementById('today-meals-list');
            const totalEl = document.getElementById('today-total-calories');

            if (meals.length === 0) {
                listEl.innerHTML = '<div class="today-meals-empty">No meals logged today</div>';
                totalEl.textContent = '0 cal';
                return;
            }

            const totalMin = meals.reduce((sum, m) => sum + m.caloriesMin, 0);
            const totalMax = meals.reduce((sum, m) => sum + m.caloriesMax, 0);
            totalEl.textContent = totalMin === totalMax ? `${totalMin} cal` : `${totalMin}-${totalMax} cal`;

            listEl.innerHTML = '';
            meals.forEach(meal => {
                const cal = meal.caloriesMin === meal.caloriesMax
                    ? `${meal.caloriesMin} cal`
                    : `${meal.caloriesMin}-${meal.caloriesMax} cal`;

                const item = document.createElement('div');
                item.className = 'today-meal-item';
                item.innerHTML = `
                    <span class="meal-name">${this.escapeHtml(meal.foodDescription)}</span>
                    <span class="meal-cal">${cal}</span>
                `;
                listEl.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading today meals:', error);
        }
    }

    // ========================
    // Weight Tab
    // ========================

    setupWeightTab() {
        const logBtn = document.getElementById('log-weight-btn');
        logBtn.addEventListener('click', () => this.logWeight());
    }

    async logWeight() {
        const valueInput = document.getElementById('weight-value');
        const unitSelect = document.getElementById('weight-unit');
        const dateInput = document.getElementById('weight-date');

        const weight = parseFloat(valueInput.value);
        if (!weight || weight <= 0) {
            this.showTemporaryMessage('Please enter a valid weight');
            return;
        }

        const unit = unitSelect.value;
        const dateStr = dateInput.value;
        const timestamp = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : Date.now();

        // Save unit preference
        localStorage.setItem('weightUnit', unit);

        const entry = { timestamp, weight, unit };

        try {
            await db.addWeight(entry);

            if (firebaseService.isSignedIn()) {
                await firebaseService.addWeight(entry);
            }

            valueInput.value = '';
            this.loadWeightHistory();
            this.showTemporaryMessage('Weight logged!');
        } catch (error) {
            console.error('Error logging weight:', error);
            this.showTemporaryMessage('Failed to log weight');
        }
    }

    async loadWeightHistory() {
        try {
            let weights = await db.getRecentWeights(30);

            if (firebaseService.isSignedIn()) {
                const firestoreWeights = await firebaseService.getRecentWeights(30);
                const weightMap = new Map();
                weights.forEach(w => weightMap.set(w.timestamp + '' + w.weight, w));
                firestoreWeights.forEach(w => weightMap.set(w.timestamp + '' + w.weight, w));
                weights = Array.from(weightMap.values());
            }

            weights.sort((a, b) => b.timestamp - a.timestamp);

            const listEl = document.getElementById('weight-history-list');

            if (weights.length === 0) {
                listEl.innerHTML = '<div class="weight-empty">No weight entries yet. Start tracking!</div>';
                return;
            }

            listEl.innerHTML = '';
            weights.forEach(entry => {
                const card = document.createElement('div');
                card.className = 'weight-entry-card';

                const dateStr = new Date(entry.timestamp).toLocaleDateString([], {
                    month: 'short', day: 'numeric', year: 'numeric'
                });

                card.innerHTML = `
                    <div class="weight-entry-info">
                        <div class="weight-entry-value">${entry.weight} ${entry.unit}</div>
                        <div class="weight-entry-date">${dateStr}</div>
                    </div>
                    <button class="weight-entry-delete">Delete</button>
                `;

                card.querySelector('.weight-entry-delete').addEventListener('click', async () => {
                    if (confirm('Delete this weight entry?')) {
                        if (firebaseService.isSignedIn() && typeof entry.id === 'string') {
                            await firebaseService.deleteWeight(entry.id);
                        } else {
                            await db.deleteWeight(entry.id);
                        }
                        this.loadWeightHistory();
                    }
                });

                listEl.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading weight history:', error);
        }
    }

    // ========================
    // Workouts Tab
    // ========================

    setupWorkoutsTab() {
        const analyzeBtn = document.getElementById('analyze-workout-btn');
        const saveBtn = document.getElementById('save-workout-btn');
        const cancelBtn = document.getElementById('cancel-workout-btn');

        analyzeBtn.addEventListener('click', () => this.analyzeWorkout());
        saveBtn.addEventListener('click', () => this.saveWorkout());
        cancelBtn.addEventListener('click', () => this.cancelWorkoutPreview());
    }

    async analyzeWorkout() {
        const input = document.getElementById('workout-input');
        const description = input.value.trim();

        if (!description) {
            this.showTemporaryMessage('Please describe your workout');
            return;
        }

        const analyzeBtn = document.getElementById('analyze-workout-btn');
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        try {
            const parsed = await this.claudeService.parseWorkout(description);
            this.currentParsedWorkout = { ...parsed, rawDescription: description };
            this.renderWorkoutPreview(parsed);
        } catch (error) {
            console.error('Error parsing workout:', error);
            this.showTemporaryMessage('Failed to analyze workout: ' + error.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Workout';
        }
    }

    renderWorkoutPreview(parsed) {
        const preview = document.getElementById('workout-preview');
        const exercisesEl = document.getElementById('workout-exercises');
        const totalCalEl = document.getElementById('workout-total-cal');
        const totalDurEl = document.getElementById('workout-total-dur');
        const notesEl = document.getElementById('workout-notes');

        exercisesEl.innerHTML = '';

        (parsed.exercises || []).forEach((ex, i) => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.dataset.index = i;

            const typeClass = (ex.type || 'other').toLowerCase();
            const muscleHtml = (ex.muscleGroups || [])
                .map(mg => `<span class="muscle-tag">${this.escapeHtml(mg)}</span>`)
                .join('');

            card.innerHTML = `
                <div class="exercise-card-header">
                    <input class="exercise-name-input" value="${this.escapeHtml(ex.name)}" data-field="name" data-index="${i}">
                    <span class="exercise-type-badge ${typeClass}">${ex.type || 'other'}</span>
                </div>
                <div class="exercise-details">
                    ${ex.duration != null ? `<div class="exercise-detail-field"><input type="number" value="${ex.duration}" data-field="duration" data-index="${i}"> min</div>` : ''}
                    ${ex.sets != null ? `<div class="exercise-detail-field"><input type="number" value="${ex.sets}" data-field="sets" data-index="${i}"> sets</div>` : ''}
                    ${ex.reps != null ? `<div class="exercise-detail-field"><input type="number" value="${ex.reps}" data-field="reps" data-index="${i}"> reps</div>` : ''}
                    ${ex.weight != null ? `<div class="exercise-detail-field"><input type="number" value="${ex.weight}" data-field="weight" data-index="${i}"> lbs</div>` : ''}
                </div>
                <div class="exercise-muscle-groups">${muscleHtml}</div>
            `;

            // Update parsed data on input change
            card.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('change', () => {
                    const idx = parseInt(inp.dataset.index);
                    const field = inp.dataset.field;
                    if (field === 'name') {
                        this.currentParsedWorkout.exercises[idx].name = inp.value;
                    } else {
                        this.currentParsedWorkout.exercises[idx][field] = parseFloat(inp.value) || null;
                    }
                });
            });

            exercisesEl.appendChild(card);
        });

        totalCalEl.textContent = `${parsed.totalCaloriesBurned || 0} cal burned`;
        totalDurEl.textContent = `${parsed.totalDuration || 0} min`;
        notesEl.textContent = parsed.notes || '';

        preview.style.display = 'block';
    }

    cancelWorkoutPreview() {
        document.getElementById('workout-preview').style.display = 'none';
        this.currentParsedWorkout = null;
    }

    async saveWorkout() {
        if (!this.currentParsedWorkout) return;

        const workout = {
            timestamp: Date.now(),
            rawDescription: this.currentParsedWorkout.rawDescription,
            exercises: this.currentParsedWorkout.exercises,
            totalCaloriesBurned: this.currentParsedWorkout.totalCaloriesBurned,
            totalDuration: this.currentParsedWorkout.totalDuration,
            notes: this.currentParsedWorkout.notes
        };

        try {
            await db.addWorkout(workout);

            if (firebaseService.isSignedIn()) {
                await firebaseService.addWorkout(workout);
            }

            document.getElementById('workout-input').value = '';
            document.getElementById('workout-preview').style.display = 'none';
            this.currentParsedWorkout = null;

            this.loadWorkoutHistory();
            this.showTemporaryMessage('Workout saved!');
        } catch (error) {
            console.error('Error saving workout:', error);
            this.showTemporaryMessage('Failed to save workout');
        }
    }

    async loadWorkoutHistory() {
        try {
            let workouts = await db.getRecentWorkouts(30);

            if (firebaseService.isSignedIn()) {
                const firestoreWorkouts = await firebaseService.getRecentWorkouts(30);
                const workoutMap = new Map();
                workouts.forEach(w => workoutMap.set(w.timestamp + (w.rawDescription || ''), w));
                firestoreWorkouts.forEach(w => workoutMap.set(w.timestamp + (w.rawDescription || ''), w));
                workouts = Array.from(workoutMap.values());
            }

            workouts.sort((a, b) => b.timestamp - a.timestamp);

            const listEl = document.getElementById('workout-history-list');

            if (workouts.length === 0) {
                listEl.innerHTML = '<div class="workout-empty">No workouts logged yet. Describe your workout above!</div>';
                return;
            }

            listEl.innerHTML = '';
            workouts.forEach(workout => {
                const card = document.createElement('div');
                card.className = 'workout-card';

                const dateStr = new Date(workout.timestamp).toLocaleDateString([], {
                    month: 'short', day: 'numeric'
                });
                const timeStr = new Date(workout.timestamp).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit'
                });

                const allMuscles = new Set();
                (workout.exercises || []).forEach(ex => {
                    (ex.muscleGroups || []).forEach(mg => allMuscles.add(mg));
                });
                const muscleHtml = Array.from(allMuscles)
                    .map(mg => `<span class="muscle-tag">${this.escapeHtml(mg)}</span>`)
                    .join('');

                card.innerHTML = `
                    <div class="workout-card-header">
                        <div class="workout-card-desc">${this.escapeHtml(workout.rawDescription || 'Workout')}</div>
                    </div>
                    <div class="workout-card-meta">
                        <span>${dateStr} ${timeStr}</span>
                        <span>${workout.totalCaloriesBurned || 0} cal</span>
                        <span>${workout.totalDuration || 0} min</span>
                    </div>
                    <div class="workout-card-muscles">${muscleHtml}</div>
                    <button class="delete-button">Delete</button>
                `;

                card.querySelector('.delete-button').addEventListener('click', async () => {
                    if (confirm('Delete this workout?')) {
                        if (firebaseService.isSignedIn() && typeof workout.id === 'string') {
                            await firebaseService.deleteWorkout(workout.id);
                        } else {
                            await db.deleteWorkout(workout.id);
                        }
                        this.loadWorkoutHistory();
                    }
                });

                listEl.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading workout history:', error);
        }
    }

    // ========================
    // Insights Tab
    // ========================

    setupInsightsTab() {
        document.getElementById('analyze-health-btn').addEventListener('click', () => this.runHealthAnalysis());
    }

    async loadInsights() {
        try {
            const [weights, meals, workouts] = await Promise.all([
                this.getMergedWeights(30),
                this.getMergedMeals(30),
                this.getMergedWorkouts(30)
            ]);

            this.renderWeightChart(weights);
            this.renderCalorieChart(meals, workouts);
            this.renderWorkoutChart(workouts);
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    async getMergedWeights(days) {
        let weights = await db.getRecentWeights(days);
        if (firebaseService.isSignedIn()) {
            const fw = await firebaseService.getRecentWeights(days);
            const map = new Map();
            weights.forEach(w => map.set(w.timestamp + '' + w.weight, w));
            fw.forEach(w => map.set(w.timestamp + '' + w.weight, w));
            weights = Array.from(map.values());
        }
        return weights.sort((a, b) => a.timestamp - b.timestamp);
    }

    async getMergedMeals(days) {
        let meals = await db.getRecentMeals(days);
        if (firebaseService.isSignedIn()) {
            const fm = await firebaseService.getRecentMeals(days);
            const map = new Map();
            meals.forEach(m => map.set(m.timestamp + m.foodDescription, m));
            fm.forEach(m => map.set(m.timestamp + m.foodDescription, m));
            meals = Array.from(map.values());
        }
        return meals.sort((a, b) => a.timestamp - b.timestamp);
    }

    async getMergedWorkouts(days) {
        let workouts = await db.getRecentWorkouts(days);
        if (firebaseService.isSignedIn()) {
            const fw = await firebaseService.getRecentWorkouts(days);
            const map = new Map();
            workouts.forEach(w => map.set(w.timestamp + (w.rawDescription || ''), w));
            fw.forEach(w => map.set(w.timestamp + (w.rawDescription || ''), w));
            workouts = Array.from(map.values());
        }
        return workouts.sort((a, b) => a.timestamp - b.timestamp);
    }

    renderWeightChart(weights) {
        const ctx = document.getElementById('weight-chart').getContext('2d');

        if (this.charts.weight) this.charts.weight.destroy();

        if (weights.length === 0) {
            this.charts.weight = new Chart(ctx, {
                type: 'line',
                data: { labels: ['No data'], datasets: [{ data: [0] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
            return;
        }

        const labels = weights.map(w => {
            const d = new Date(w.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        const data = weights.map(w => w.weight);
        const unit = weights[0]?.unit || 'lbs';

        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: `Weight (${unit})`,
                    data,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#007AFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { font: { size: 11 } }
                    },
                    x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
                }
            }
        });
    }

    renderCalorieChart(meals, workouts) {
        const ctx = document.getElementById('calorie-chart').getContext('2d');

        if (this.charts.calorie) this.charts.calorie.destroy();

        // Group by date
        const caloriesByDate = {};
        const burnedByDate = {};

        meals.forEach(m => {
            const d = m.date;
            if (!caloriesByDate[d]) caloriesByDate[d] = 0;
            caloriesByDate[d] += Math.round((m.caloriesMin + m.caloriesMax) / 2);
        });

        workouts.forEach(w => {
            const d = w.date;
            if (!burnedByDate[d]) burnedByDate[d] = 0;
            burnedByDate[d] += (w.totalCaloriesBurned || 0);
        });

        const allDates = [...new Set([...Object.keys(caloriesByDate), ...Object.keys(burnedByDate)])].sort();

        // Limit to last 14 days for readability
        const recentDates = allDates.slice(-14);

        const labels = recentDates.map(d => {
            const parts = d.split('-');
            return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        });

        this.charts.calorie = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Calories In',
                        data: recentDates.map(d => caloriesByDate[d] || 0),
                        backgroundColor: 'rgba(0, 122, 255, 0.7)'
                    },
                    {
                        label: 'Calories Burned',
                        data: recentDates.map(d => burnedByDate[d] || 0),
                        backgroundColor: 'rgba(255, 59, 48, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { size: 11 } } },
                    x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
                }
            }
        });
    }

    renderWorkoutChart(workouts) {
        const ctx = document.getElementById('workout-chart').getContext('2d');

        if (this.charts.workout) this.charts.workout.destroy();

        // Count workouts per date
        const countByDate = {};
        workouts.forEach(w => {
            const d = w.date;
            if (!countByDate[d]) countByDate[d] = 0;
            countByDate[d]++;
        });

        // Generate last 14 days
        const dates = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dates.push(key);
        }

        const labels = dates.map(d => {
            const parts = d.split('-');
            return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        });

        this.charts.workout = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Workouts',
                    data: dates.map(d => countByDate[d] || 0),
                    backgroundColor: 'rgba(52, 199, 89, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } }
                    },
                    x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
                }
            }
        });
    }

    async runHealthAnalysis() {
        const btn = document.getElementById('analyze-health-btn');
        btn.disabled = true;
        btn.textContent = 'Analyzing...';

        try {
            const [meals, weights, workouts] = await Promise.all([
                this.getMergedMeals(30),
                this.getMergedWeights(30),
                this.getMergedWorkouts(30)
            ]);

            if (meals.length === 0 && weights.length === 0 && workouts.length === 0) {
                this.showTemporaryMessage('No data to analyze yet. Start logging!');
                return;
            }

            const analysis = await this.claudeService.analyzeHealth(meals, weights, workouts);
            this.renderAnalysisResults(analysis);
        } catch (error) {
            console.error('Error analyzing health:', error);
            this.showTemporaryMessage('Analysis failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Analyze My Health';
        }
    }

    renderAnalysisResults(analysis) {
        const resultsEl = document.getElementById('analysis-results');
        resultsEl.style.display = 'block';

        // Summary
        document.getElementById('analysis-summary').textContent = analysis.summary || '';

        // Highlights
        const highlightsEl = document.getElementById('analysis-highlights');
        highlightsEl.innerHTML = '';
        (analysis.highlights || []).forEach(h => {
            const div = document.createElement('div');
            div.className = `highlight-callout ${h.type === 'positive' ? 'positive' : 'attention'}`;
            div.textContent = h.text;
            highlightsEl.appendChild(div);
        });

        // Observations
        const obsEl = document.getElementById('analysis-observations');
        if (analysis.observations && analysis.observations.length) {
            obsEl.innerHTML = '<h4>Observations</h4>';
            const ul = document.createElement('ul');
            ul.className = 'analysis-list';
            analysis.observations.forEach(o => {
                const li = document.createElement('li');
                li.textContent = o;
                ul.appendChild(li);
            });
            obsEl.appendChild(ul);
        }

        // Diet suggestions
        const dietEl = document.getElementById('analysis-diet');
        if (analysis.dietSuggestions && analysis.dietSuggestions.length) {
            dietEl.innerHTML = '<h4>Diet Suggestions</h4>';
            const ul = document.createElement('ul');
            ul.className = 'analysis-list';
            analysis.dietSuggestions.forEach(s => {
                const li = document.createElement('li');
                li.textContent = s;
                ul.appendChild(li);
            });
            dietEl.appendChild(ul);
        }

        // Exercise suggestions
        const exEl = document.getElementById('analysis-exercise');
        if (analysis.exerciseSuggestions && analysis.exerciseSuggestions.length) {
            exEl.innerHTML = '<h4>Exercise Suggestions</h4>';
            const ul = document.createElement('ul');
            ul.className = 'analysis-list';
            analysis.exerciseSuggestions.forEach(s => {
                const li = document.createElement('li');
                li.textContent = s;
                ul.appendChild(li);
            });
            exEl.appendChild(ul);
        }
    }

    // ========================
    // Settings
    // ========================

    setupSettings() {
        const apiKeyInput = document.getElementById('api-key-input');
        const toggleBtn = document.getElementById('toggle-api-key');
        const infoBtn = document.getElementById('api-key-info-btn');

        apiKeyInput.value = this.claudeService.getApiKey();

        apiKeyInput.addEventListener('input', () => {
            this.claudeService.setApiKey(apiKeyInput.value);
        });

        toggleBtn.addEventListener('click', () => {
            const type = apiKeyInput.type === 'password' ? 'text' : 'password';
            apiKeyInput.type = type;
        });

        infoBtn.addEventListener('click', () => {
            document.getElementById('api-key-modal').classList.add('active');
        });

        const signOutBtn = document.getElementById('sign-out-btn');
        signOutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to sign out? Your data will remain saved locally.')) {
                await firebaseService.signOutUser();
                this.updateFirebaseStatus('Not signed in');
                signOutBtn.style.display = 'none';
                this.showTemporaryMessage('Signed out successfully');
            }
        });
    }

    updateFirebaseStatus(status) {
        const statusElement = document.getElementById('firebase-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // ========================
    // Modals
    // ========================

    setupModals() {
        const dateDoneBtn = document.getElementById('date-done-btn');
        const closeDatePicker = document.getElementById('close-date-picker');
        const datePickerModal = document.getElementById('date-picker-modal');
        const dateInput = document.getElementById('date-input');

        dateDoneBtn.addEventListener('click', () => {
            this.selectedDate = dateInput.valueAsDate || new Date();
            datePickerModal.classList.remove('active');
        });

        closeDatePicker.addEventListener('click', () => {
            datePickerModal.classList.remove('active');
        });

        const closeApiModal = document.getElementById('close-api-modal');
        const apiKeyModal = document.getElementById('api-key-modal');

        closeApiModal.addEventListener('click', () => {
            apiKeyModal.classList.remove('active');
        });

        [datePickerModal, apiKeyModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // ========================
    // Auth
    // ========================

    setupAuth() {
        const authModal = document.getElementById('auth-modal');
        const closeAuthModal = document.getElementById('close-auth-modal');

        const signinTabBtn = document.getElementById('signin-tab-btn');
        const signupTabBtn = document.getElementById('signup-tab-btn');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');

        signinTabBtn.addEventListener('click', () => {
            signinTabBtn.classList.add('active');
            signupTabBtn.classList.remove('active');
            signinForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupTabBtn.addEventListener('click', () => {
            signupTabBtn.classList.add('active');
            signinTabBtn.classList.remove('active');
            signupForm.style.display = 'block';
            signinForm.style.display = 'none';
        });

        closeAuthModal.addEventListener('click', () => {
            authModal.classList.remove('active');
        });

        // Sign in
        const signinBtn = document.getElementById('signin-btn');
        signinBtn.addEventListener('click', async () => {
            const email = document.getElementById('signin-email').value.trim();
            const password = document.getElementById('signin-password').value;
            const errorDiv = document.getElementById('signin-error');

            errorDiv.style.display = 'none';

            if (!email || !password) {
                errorDiv.textContent = 'Please enter email and password';
                errorDiv.style.display = 'block';
                return;
            }

            signinBtn.disabled = true;
            signinBtn.textContent = 'Signing in...';

            const result = await firebaseService.signIn(email, password);

            if (result.success) {
                this.updateFirebaseStatus('Syncing');
                this.updateAuthUI();
                authModal.classList.remove('active');
                this.showTemporaryMessage('Signed in successfully!');

                await this.syncLocalMealsToFirestore();
                this.loadTodayMeals();

                document.getElementById('signin-email').value = '';
                document.getElementById('signin-password').value = '';
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }

            signinBtn.disabled = false;
            signinBtn.textContent = 'Sign In';
        });

        // Sign up
        const signupBtn = document.getElementById('signup-btn');
        signupBtn.addEventListener('click', async () => {
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-password-confirm').value;
            const errorDiv = document.getElementById('signup-error');

            errorDiv.style.display = 'none';

            if (!email || !password || !confirmPassword) {
                errorDiv.textContent = 'Please fill in all fields';
                errorDiv.style.display = 'block';
                return;
            }

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            if (password.length < 6) {
                errorDiv.textContent = 'Password must be at least 6 characters';
                errorDiv.style.display = 'block';
                return;
            }

            signupBtn.disabled = true;
            signupBtn.textContent = 'Creating account...';

            const result = await firebaseService.signUp(email, password);

            if (result.success) {
                this.updateFirebaseStatus('Syncing');
                this.updateAuthUI();
                authModal.classList.remove('active');
                this.showTemporaryMessage('Account created successfully!');

                await this.syncLocalMealsToFirestore();
                this.loadTodayMeals();

                document.getElementById('signup-email').value = '';
                document.getElementById('signup-password').value = '';
                document.getElementById('signup-password-confirm').value = '';
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }

            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
        });

        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });
    }

    async syncLocalMealsToFirestore() {
        if (!firebaseService.isSignedIn()) return;

        try {
            const localMeals = await db.getAllMeals();
            if (localMeals.length === 0) return;

            const firestoreMeals = await firebaseService.getAllMeals();
            const firestoreSignatures = new Set(
                firestoreMeals.map(m => `${m.timestamp}_${m.foodDescription}`)
            );

            const mealsToSync = localMeals.filter(meal => {
                const signature = `${meal.timestamp}_${meal.foodDescription}`;
                return !firestoreSignatures.has(signature);
            });

            if (mealsToSync.length === 0) return;

            let syncedCount = 0;
            for (const meal of mealsToSync) {
                const { id, ...mealData } = meal;
                const result = await firebaseService.addMeal(mealData);
                if (result) syncedCount++;
            }

            console.log(`Synced ${syncedCount} meals to Firestore`);
        } catch (error) {
            console.error('Error syncing local meals:', error);
        }
    }

    updateAuthUI() {
        const signOutBtn = document.getElementById('sign-out-btn');
        if (firebaseService.isSignedIn() && firebaseService.user) {
            const email = firebaseService.user.email;
            this.updateFirebaseStatus(`Syncing (${email})`);
            if (signOutBtn) signOutBtn.style.display = 'block';
        } else {
            if (signOutBtn) signOutBtn.style.display = 'none';
        }
    }

    // ========================
    // Utility
    // ========================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CalorieTrackerApp());
} else {
    new CalorieTrackerApp();
}
