exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { apiKey, workoutDescription } = JSON.parse(event.body);

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    if (!workoutDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Workout description is required' })
      };
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
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid API key.' })
        };
      }

      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API request failed: ${response.statusText}` })
      };
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Claude API' })
      };
    }

    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Could not parse workout data from response' })
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to parse workout: ${error.message}` })
    };
  }
};
