// Claude API service for calorie estimation
// Calls local backend server instead of Anthropic API directly (to avoid CORS issues)

const BACKEND_URL = 'http://localhost:3000/api/estimate-calories';

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

    async estimateCalories(foodDescription, conversationContext = null) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
        }

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    foodDescription: foodDescription,
                    conversationContext: conversationContext
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Request failed: ${response.statusText}`);
            }

            const estimate = await response.json();
            return estimate;

        } catch (error) {
            // Check if it's a network error (backend not running)
            if (error.message.includes('fetch')) {
                throw new Error('Cannot connect to backend server. Make sure the Node.js server is running on port 3000.');
            }
            throw new Error(error.message);
        }
    }
}
