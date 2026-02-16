const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Parse JSON bodies

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running!' });
});

// Proxy endpoint for Anthropic API
app.post('/api/estimate-calories', async (req, res) => {
    const { apiKey, foodDescription, conversationContext } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    if (!foodDescription) {
        return res.status(400).json({ error: 'Food description is required' });
    }

    // Build the prompt
    let prompt = `You are a nutrition expert helping estimate calories for food and drinks. The user has described what they consumed.

User's input: "${foodDescription}"`;

    if (conversationContext) {
        prompt += `\n\n${conversationContext}`;
    }

    prompt += `

Please analyze this food/drink and provide:
1. A calorie estimate (provide a range if uncertain, e.g., 200-300 calories)
2. If you need clarification about portion size, preparation method, or specific variant, ask ONE specific question
3. A brief explanation of your estimate

IMPORTANT - MEAL HISTORY REFERENCES:
- If the user mentions "yesterday", "the same", "similar to what I had", or references a previous meal, look at the RECENT MEAL HISTORY above
- When referencing a previous meal, use the EXACT SAME calorie estimate that was logged
- For example, if user says "the same smoothie I had yesterday" and yesterday's history shows "strawberry banana smoothie (250-300 cal)", respond with the same 250-300 calorie range
- Acknowledge the reference in your analysis (e.g., "Same as yesterday's smoothie: 250-300 calories")

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
- Provide ranges when uncertain rather than asking unnecessary questions
- When user references a previous meal, prioritize consistency over re-estimation`;

    try {
        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
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
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({ error: 'Invalid API key. Please check your API key in Settings.' });
            }

            return res.status(response.status).json({
                error: `API request failed: ${response.statusText}`
            });
        }

        const data = await response.json();

        // Parse the response
        if (!data.content || !data.content[0] || !data.content[0].text) {
            return res.status(500).json({ error: 'Invalid response from Claude API' });
        }

        const text = data.content[0].text;

        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Could not parse calorie estimate from response' });
        }

        const estimate = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (
            typeof estimate.caloriesMin !== 'number' ||
            typeof estimate.caloriesMax !== 'number' ||
            typeof estimate.needsClarification !== 'boolean' ||
            typeof estimate.analysis !== 'string'
        ) {
            return res.status(500).json({ error: 'Invalid estimate format' });
        }

        // Send the parsed estimate back to the frontend
        res.json({
            caloriesMin: estimate.caloriesMin,
            caloriesMax: estimate.caloriesMax,
            needsClarification: estimate.needsClarification,
            clarificationQuestion: estimate.clarificationQuestion || null,
            analysis: estimate.analysis
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: `Failed to estimate calories: ${error.message}`
        });
    }
});

// Proxy endpoint for workout parsing
app.post('/api/parse-workout', async (req, res) => {
    const { apiKey, workoutDescription } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    if (!workoutDescription) {
        return res.status(400).json({ error: 'Workout description is required' });
    }

    const prompt = `You are a fitness expert. Parse the following natural-language workout description into structured exercise data.

User's input: "${workoutDescription}"

For each exercise, determine:
- name: exercise name
- type: "strength", "cardio", "flexibility", or "other"
- duration: duration in minutes (estimate if not specified)
- sets: number of sets (null if not applicable)
- reps: number of reps per set (null if not applicable)
- weight: weight used in lbs (null if not applicable)
- muscleGroups: array of muscle groups targeted (e.g., ["chest", "triceps"])

Also estimate:
- totalCaloriesBurned: estimated total calories burned for the entire workout
- totalDuration: total workout duration in minutes
- notes: any relevant observations

Respond in this exact JSON format:
{
    "exercises": [
        {
            "name": "Exercise Name",
            "type": "strength",
            "duration": 10,
            "sets": 3,
            "reps": 10,
            "weight": 135,
            "muscleGroups": ["chest", "triceps"]
        }
    ],
    "totalCaloriesBurned": 300,
    "totalDuration": 45,
    "notes": "Good upper body workout"
}

Important:
- Use common exercise names
- Estimate calories based on exercise type, duration, and intensity
- If duration isn't specified, estimate based on the exercises described
- Be reasonable with calorie estimates`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({ error: 'Invalid API key.' });
            }

            return res.status(response.status).json({
                error: `API request failed: ${response.statusText}`
            });
        }

        const data = await response.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
            return res.status(500).json({ error: 'Invalid response from Claude API' });
        }

        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Could not parse workout data from response' });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        res.json(parsed);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: `Failed to parse workout: ${error.message}` });
    }
});

// Proxy endpoint for health analysis
app.post('/api/analyze-health', async (req, res) => {
    const { apiKey, meals, weights, workouts } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    let dataContext = 'Here is the user\'s recent health data:\n\n';

    if (meals && meals.length > 0) {
        dataContext += '=== MEALS (Recent) ===\n';
        meals.forEach(m => {
            const cal = m.caloriesMin === m.caloriesMax ? `${m.caloriesMin}` : `${m.caloriesMin}-${m.caloriesMax}`;
            dataContext += `${m.date}: ${m.foodDescription} (${cal} cal)\n`;
        });
        dataContext += '\n';
    }

    if (weights && weights.length > 0) {
        dataContext += '=== WEIGHT LOG ===\n';
        weights.forEach(w => {
            dataContext += `${w.date}: ${w.weight} ${w.unit}\n`;
        });
        dataContext += '\n';
    }

    if (workouts && workouts.length > 0) {
        dataContext += '=== WORKOUTS ===\n';
        workouts.forEach(w => {
            const exercises = (w.exercises || []).map(e => e.name).join(', ');
            dataContext += `${w.date}: ${w.rawDescription || exercises} (${w.totalCaloriesBurned || 0} cal burned, ${w.totalDuration || 0} min)\n`;
        });
        dataContext += '\n';
    }

    const prompt = `You are a knowledgeable health advisor. Analyze the following health data and provide actionable insights.

${dataContext}

Provide your analysis in this exact JSON format:
{
    "summary": "A 2-3 sentence overall summary of the user's recent health trends",
    "observations": [
        "Observation about their data patterns (3-5 observations)"
    ],
    "dietSuggestions": [
        "Specific, actionable diet suggestions (2-4 suggestions)"
    ],
    "exerciseSuggestions": [
        "Specific, actionable exercise suggestions (2-4 suggestions)"
    ],
    "highlights": [
        {
            "type": "positive" or "attention",
            "text": "A notable highlight from the data"
        }
    ]
}

Important:
- Be encouraging but honest
- Base observations on actual data patterns, not assumptions
- Make suggestions specific and actionable
- If data is limited, note that and provide general guidance
- Highlights should call out things they're doing well (positive) or areas needing attention`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Anthropic API error:', response.status, errorText);

            if (response.status === 401) {
                return res.status(401).json({ error: 'Invalid API key.' });
            }

            return res.status(response.status).json({
                error: `API request failed: ${response.statusText}`
            });
        }

        const data = await response.json();

        if (!data.content || !data.content[0] || !data.content[0].text) {
            return res.status(500).json({ error: 'Invalid response from Claude API' });
        }

        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Could not parse analysis from response' });
        }

        const analysis = JSON.parse(jsonMatch[0]);
        res.json(analysis);

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: `Failed to analyze health data: ${error.message}` });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CalorieTracker backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🍔 API endpoint: http://localhost:${PORT}/api/estimate-calories`);
});
