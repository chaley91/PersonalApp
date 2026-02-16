exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { apiKey, meals, weights, workouts } = JSON.parse(event.body);

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'API key is required' })
      };
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
        body: JSON.stringify({ error: 'Could not parse analysis from response' })
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysis)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to analyze health data: ${error.message}` })
    };
  }
};
