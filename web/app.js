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
                this.updateFirebaseStatus('✓ Syncing');
                this.updateAuthUI();
            } else {
                this.updateFirebaseStatus('Not signed in');
                // Show auth modal after a brief delay
                setTimeout(() => {
                    document.getElementById('auth-modal').classList.add('active');
                }, 500);
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
        this.setupHistory();
        this.setupSettings();
        this.setupModals();
        this.setupAuth();

        // Load initial data
        this.loadHistory();
    }

    // Tab Navigation
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

                // Refresh data when switching to history
                if (tabName === 'history') {
                    this.loadHistory();
                }
            });
        });
    }

    // Meal Entry
    setupMealEntry() {
        const foodInput = document.getElementById('food-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-conversation-btn');
        const saveBtn = document.getElementById('save-entry-btn');

        // Auto-resize textarea
        foodInput.addEventListener('input', () => {
            foodInput.style.height = 'auto';
            foodInput.style.height = foodInput.scrollHeight + 'px';

            // Enable/disable send button
            const hasText = foodInput.value.trim().length > 0;
            sendBtn.disabled = !hasText || this.isProcessing;
        });

        // Send message
        sendBtn.addEventListener('click', () => this.submitFood());

        // Enter to send (shift+enter for new line)
        foodInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    this.submitFood();
                }
            }
        });

        // Clear conversation
        clearBtn.addEventListener('click', () => this.resetConversation());

        // Save entry
        saveBtn.addEventListener('click', () => this.saveEntry());
    }

    async submitFood() {
        const foodInput = document.getElementById('food-input');
        const input = foodInput.value.trim();

        if (!input || this.isProcessing) return;

        this.isProcessing = true;
        this.showError(null);

        // Add user message
        this.addMessage(input, true);
        this.conversationContext += `User: ${input}\n`;

        // Clear input
        foodInput.value = '';
        foodInput.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;

        try {
            // Get calorie estimate
            const estimate = await this.claudeService.estimateCalories(
                input,
                this.conversationContext || null
            );

            this.currentEstimate = estimate;

            // Add assistant response
            this.addMessage(estimate.analysis, false);
            this.conversationContext += `Assistant: ${estimate.analysis}\n`;

            // Handle clarification
            if (estimate.needsClarification && estimate.clarificationQuestion) {
                this.addMessage(estimate.clarificationQuestion, false);
                this.conversationContext += `Question: ${estimate.clarificationQuestion}\n`;
                this.showSaveButton(true);
            } else {
                // Auto-save if no clarification needed
                await this.saveEntry();
            }
        } catch (error) {
            this.showError(error.message);
            console.error('Error estimating calories:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    addMessage(text, isUser) {
        const messagesContainer = document.getElementById('conversation-messages');
        const emptyState = document.getElementById('conversation-empty');

        // Hide empty state
        emptyState.style.display = 'none';

        // Create message element
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

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Update conversation history
        this.conversationHistory.push({ text, isUser, timestamp: new Date() });

        // Show clear button
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
        if (show) {
            saveBtn.textContent = 'Skip & Save Entry';
        }
    }

    async saveEntry() {
        if (!this.currentEstimate) return;

        try {
            // Create meal entry
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

            // Save to local database
            await db.addMeal(meal);

            // Also save to Firebase (if configured)
            if (firebaseService.initialized) {
                await firebaseService.addMeal(meal);
                console.log('Meal synced to Firebase');
            }

            // Reset conversation
            this.resetConversation();

            // Show success feedback
            this.showTemporaryMessage('Meal saved successfully!');
        } catch (error) {
            this.showError('Failed to save meal: ' + error.message);
            console.error('Error saving meal:', error);
        }
    }

    resetConversation() {
        this.conversationHistory = [];
        this.conversationContext = '';
        this.currentEstimate = null;

        // Clear UI
        const messagesContainer = document.getElementById('conversation-messages');
        messagesContainer.innerHTML = '';

        const emptyState = document.getElementById('conversation-empty');
        emptyState.style.display = 'flex';

        document.getElementById('clear-conversation-btn').style.display = 'none';
        document.getElementById('save-entry-btn').style.display = 'none';
        this.showError(null);
    }

    showTemporaryMessage(message) {
        // Create temporary toast message
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

    // History
    setupHistory() {
        const prevBtn = document.getElementById('prev-day-btn');
        const nextBtn = document.getElementById('next-day-btn');
        const datePickerBtn = document.getElementById('date-picker-btn');

        prevBtn.addEventListener('click', () => {
            this.selectedDate.setDate(this.selectedDate.getDate() - 1);
            this.loadHistory();
        });

        nextBtn.addEventListener('click', () => {
            const today = new Date();
            if (this.selectedDate < today) {
                this.selectedDate.setDate(this.selectedDate.getDate() + 1);
                this.loadHistory();
            }
        });

        datePickerBtn.addEventListener('click', () => {
            document.getElementById('date-picker-modal').classList.add('active');
            document.getElementById('date-input').valueAsDate = this.selectedDate;
        });
    }

    async loadHistory() {
        try {
            const meals = await db.getMealsByDate(this.selectedDate);

            // Update date display
            const dateDisplay = document.getElementById('selected-date');
            const today = new Date();
            const isToday = this.selectedDate.toDateString() === today.toDateString();

            if (isToday) {
                dateDisplay.textContent = 'Today';
            } else {
                dateDisplay.textContent = this.selectedDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                });
            }

            // Enable/disable next button
            document.getElementById('next-day-btn').disabled = isToday;

            // Calculate totals
            const totalMin = meals.reduce((sum, meal) => sum + meal.caloriesMin, 0);
            const totalMax = meals.reduce((sum, meal) => sum + meal.caloriesMax, 0);

            // Update summary
            const caloriesDisplay = totalMin === totalMax
                ? totalMin.toString()
                : `${totalMin}-${totalMax}`;

            document.getElementById('total-calories').textContent = caloriesDisplay;
            document.getElementById('meal-count').textContent = meals.length;

            // Render meals list
            this.renderMealsList(meals);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    renderMealsList(meals) {
        const listContainer = document.getElementById('meals-list');
        listContainer.innerHTML = '';

        if (meals.length === 0) {
            listContainer.innerHTML = `
                <div class="meals-list-empty">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No meals logged for this day</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp (most recent first)
        meals.sort((a, b) => b.timestamp - a.timestamp);

        meals.forEach(meal => {
            const card = document.createElement('div');
            card.className = 'meal-card';

            const caloriesDisplay = meal.caloriesMin === meal.caloriesMax
                ? `${meal.caloriesMin} cal`
                : `${meal.caloriesMin}-${meal.caloriesMax} cal`;

            card.innerHTML = `
                <div class="meal-header">
                    <div class="meal-description">${meal.foodDescription}</div>
                    <div class="meal-calories">${caloriesDisplay}</div>
                </div>
                <div class="meal-time">${new Date(meal.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
                ${meal.notes ? `<div class="meal-notes">${meal.notes}</div>` : ''}
                <button class="delete-button" data-id="${meal.id}">Delete</button>
            `;

            // Add delete handler
            const deleteBtn = card.querySelector('.delete-button');
            deleteBtn.addEventListener('click', async () => {
                if (confirm('Delete this meal?')) {
                    await db.deleteMeal(meal.id);
                    this.loadHistory();
                }
            });

            listContainer.appendChild(card);
        });
    }

    // Settings
    setupSettings() {
        const apiKeyInput = document.getElementById('api-key-input');
        const toggleBtn = document.getElementById('toggle-api-key');
        const infoBtn = document.getElementById('api-key-info-btn');

        // Load saved API key
        apiKeyInput.value = this.claudeService.getApiKey();

        // Save API key on change
        apiKeyInput.addEventListener('input', () => {
            this.claudeService.setApiKey(apiKeyInput.value);
        });

        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const type = apiKeyInput.type === 'password' ? 'text' : 'password';
            apiKeyInput.type = type;
        });

        // Show info modal
        infoBtn.addEventListener('click', () => {
            document.getElementById('api-key-modal').classList.add('active');
        });

        // Firebase configuration
        const firebaseConfigBtn = document.getElementById('firebase-config-btn');
        const firebaseConfigForm = document.getElementById('firebase-config-form');
        const saveFirebaseBtn = document.getElementById('save-firebase-btn');
        const cancelFirebaseBtn = document.getElementById('cancel-firebase-btn');

        // Load existing Firebase config
        this.loadFirebaseConfig();

        // Toggle config form
        firebaseConfigBtn.addEventListener('click', () => {
            const isVisible = firebaseConfigForm.style.display === 'block';
            firebaseConfigForm.style.display = isVisible ? 'none' : 'block';
            firebaseConfigBtn.textContent = isVisible ? '+ Configure Firebase' : '- Hide Configuration';
        });

        // Save Firebase config
        saveFirebaseBtn.addEventListener('click', async () => {
            const config = {
                apiKey: document.getElementById('firebase-api-key').value.trim(),
                authDomain: document.getElementById('firebase-auth-domain').value.trim(),
                projectId: document.getElementById('firebase-project-id').value.trim(),
                storageBucket: document.getElementById('firebase-storage-bucket').value.trim(),
                messagingSenderId: document.getElementById('firebase-sender-id').value.trim(),
                appId: document.getElementById('firebase-app-id').value.trim()
            };

            // Validate
            if (!config.apiKey || !config.authDomain || !config.projectId) {
                alert('Please fill in at least API Key, Auth Domain, and Project ID');
                return;
            }

            // Save to localStorage
            localStorage.setItem('firebaseApiKey', config.apiKey);
            localStorage.setItem('firebaseAuthDomain', config.authDomain);
            localStorage.setItem('firebaseProjectId', config.projectId);
            localStorage.setItem('firebaseStorageBucket', config.storageBucket);
            localStorage.setItem('firebaseMessagingSenderId', config.messagingSenderId);
            localStorage.setItem('firebaseAppId', config.appId);

            // Initialize Firebase
            this.updateFirebaseStatus('Initializing...');
            const initialized = await firebaseService.initialize();

            if (initialized) {
                this.updateFirebaseStatus('✓ Syncing');
                this.showTemporaryMessage('Firebase sync enabled!');
                firebaseConfigForm.style.display = 'none';
                firebaseConfigBtn.textContent = '+ Configure Firebase';
            } else {
                this.updateFirebaseStatus('Configuration error');
                alert('Failed to initialize Firebase. Check your configuration and try again.');
            }
        });

        // Cancel config
        cancelFirebaseBtn.addEventListener('click', () => {
            firebaseConfigForm.style.display = 'none';
            firebaseConfigBtn.textContent = '+ Configure Firebase';
        });
    }

    loadFirebaseConfig() {
        document.getElementById('firebase-api-key').value = localStorage.getItem('firebaseApiKey') || '';
        document.getElementById('firebase-auth-domain').value = localStorage.getItem('firebaseAuthDomain') || '';
        document.getElementById('firebase-project-id').value = localStorage.getItem('firebaseProjectId') || '';
        document.getElementById('firebase-storage-bucket').value = localStorage.getItem('firebaseStorageBucket') || '';
        document.getElementById('firebase-sender-id').value = localStorage.getItem('firebaseMessagingSenderId') || '';
        document.getElementById('firebase-app-id').value = localStorage.getItem('firebaseAppId') || '';
    }

    updateFirebaseStatus(status) {
        const statusElement = document.getElementById('firebase-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // Modals
    setupModals() {
        // Date picker modal
        const dateDoneBtn = document.getElementById('date-done-btn');
        const closeDatePicker = document.getElementById('close-date-picker');
        const datePickerModal = document.getElementById('date-picker-modal');
        const dateInput = document.getElementById('date-input');

        dateDoneBtn.addEventListener('click', () => {
            this.selectedDate = dateInput.valueAsDate || new Date();
            datePickerModal.classList.remove('active');
            this.loadHistory();
        });

        closeDatePicker.addEventListener('click', () => {
            datePickerModal.classList.remove('active');
        });

        // API key info modal
        const closeApiModal = document.getElementById('close-api-modal');
        const apiKeyModal = document.getElementById('api-key-modal');

        closeApiModal.addEventListener('click', () => {
            apiKeyModal.classList.remove('active');
        });

        // Close modals on backdrop click
        [datePickerModal, apiKeyModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // Auth
    setupAuth() {
        const authModal = document.getElementById('auth-modal');
        const closeAuthModal = document.getElementById('close-auth-modal');

        // Tab switching
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

        // Close modal
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
                this.updateFirebaseStatus('✓ Syncing');
                this.updateAuthUI();
                authModal.classList.remove('active');
                this.showTemporaryMessage('Signed in successfully!');

                // Clear form
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
                this.updateFirebaseStatus('✓ Syncing');
                this.updateAuthUI();
                authModal.classList.remove('active');
                this.showTemporaryMessage('Account created successfully!');

                // Clear form
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

        // Close on backdrop click
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.remove('active');
            }
        });
    }

    updateAuthUI() {
        if (firebaseService.isSignedIn() && firebaseService.user) {
            // Update Firebase status in settings
            const email = firebaseService.user.email;
            this.updateFirebaseStatus(`✓ Syncing (${email})`);
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CalorieTrackerApp());
} else {
    new CalorieTrackerApp();
}
