// Claude API service for calorie estimation

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

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

        let prompt = `You are a nutrition expert helping estimate calories for food and drinks. The user has described what they consumed.

User's input: "${foodDescription}"`;

        if (conversationContext) {
            prompt += `\n\nPrevious conversation context:\n${conversationContext}`;
        }

        prompt += `

Please analyze this food/drink and provide:
1. A calorie estimate (provide a range if uncertain, e.g., 200-300 calories)
2. If you need clarification about portion size, preparation method, or specific variant, ask ONE specific question
3. A brief explanation of your estimate

Respond in this exact JSON format:
{
    "caloriesMin": <minimum calories as integer>,
    "caloriesMax": <maximum calories as integer>,
    "needsClarification": <true/false>,
    "clarificationQuestion": "<your question or null>",
    "analysis": "<brief explanation>"
}

Important:
- Be reasonable with estimates - use common portion sizes if not specified
- Only ask for clarification if it would significantly impact the estimate (>50 calorie difference)
- For drinks, assume standard serving sizes unless otherwise specified
- Provide ranges when uncertain rather than asking unnecessary questions`;

        try {
            const response = await fetch(ANTHROPIC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: MODEL,
                    max_tokens: 1024,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your API key in Settings.');
                }
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            if (error.message.includes('API key')) {
                throw error;
            }
            throw new Error(`Failed to estimate calories: ${error.message}`);
        }
    }

    parseResponse(data) {
        if (!data.content || !data.content[0] || !data.content[0].text) {
            throw new Error('Invalid response from Claude API');
        }

        const text = data.content[0].text;

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse calorie estimate from response');
        }

        try {
            const estimate = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (
                typeof estimate.caloriesMin !== 'number' ||
                typeof estimate.caloriesMax !== 'number' ||
                typeof estimate.needsClarification !== 'boolean' ||
                typeof estimate.analysis !== 'string'
            ) {
                throw new Error('Invalid estimate format');
            }

            return {
                caloriesMin: estimate.caloriesMin,
                caloriesMax: estimate.caloriesMax,
                needsClarification: estimate.needsClarification,
                clarificationQuestion: estimate.clarificationQuestion || null,
                analysis: estimate.analysis
            };
        } catch (error) {
            throw new Error('Failed to parse calorie estimate');
        }
    }
}
