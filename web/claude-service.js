// Claude API service for calorie estimation
// Automatically detects if running locally or on Netlify

const BACKEND_URL_LOCAL = 'http://localhost:3000/api/estimate-calories';
const BACKEND_URL_NETLIFY = '/.netlify/functions/estimate-calories';

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

    // Detect if we're running locally or on Netlify
    getBackendUrl() {
        // If on localhost, use local server
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return BACKEND_URL_LOCAL;
        }
        // Otherwise, use Netlify function
        return BACKEND_URL_NETLIFY;
    }

    async estimateCalories(foodDescription, conversationContext = null) {
        if (!this.apiKey) {
            throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
        }

        const backendUrl = this.getBackendUrl();

        try {
            const response = await fetch(backendUrl, {
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
            if (error.message.includes('fetch') && backendUrl === BACKEND_URL_LOCAL) {
                throw new Error('Cannot connect to backend server. Make sure the Node.js server is running on port 3000.');
            }
            throw new Error(error.message);
        }
    }
}
