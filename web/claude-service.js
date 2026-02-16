// Claude API service for calorie estimation, workout parsing, and health analysis
// Automatically detects if running locally or on Netlify

export class ClaudeService {
    constructor() {
        this.apiKey = this.getApiKey();
    }

    getApiKey() {
        return localStorage.getItem('anthropicAPIKey') || '';
    }

    setApiKey(key) {
        localStorage.setItem('anthropicAPIKey', key);
        this.apiKey = key;
    }

    // Detect if we're running locally or on Netlify and return the right base
    _getUrl(endpoint) {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal) {
            return `http://localhost:3000/api/${endpoint}`;
        }
        return `/.netlify/functions/${endpoint}`;
    }

    async estimateCalories(foodDescription, conversationContext = null) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
        }

        const backendUrl = this._getUrl('estimate-calories');

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    foodDescription,
                    conversationContext
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('fetch') && backendUrl.includes('localhost')) {
                throw new Error('Cannot connect to backend server. Make sure the Node.js server is running on port 3000.');
            }
            throw new Error(error.message);
        }
    }

    async parseWorkout(workoutDescription) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
        }

        const backendUrl = this._getUrl('parse-workout');

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    workoutDescription
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('fetch') && backendUrl.includes('localhost')) {
                throw new Error('Cannot connect to backend server. Make sure the Node.js server is running on port 3000.');
            }
            throw new Error(error.message);
        }
    }

    async analyzeHealth(meals, weights, workouts) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
        }

        const backendUrl = this._getUrl('analyze-health');

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    meals,
                    weights,
                    workouts
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('fetch') && backendUrl.includes('localhost')) {
                throw new Error('Cannot connect to backend server. Make sure the Node.js server is running on port 3000.');
            }
            throw new Error(error.message);
        }
    }
}
