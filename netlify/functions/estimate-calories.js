const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { apiKey, foodDescription, conversationContext } = JSON.parse(event.body);

    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    if (!foodDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Food description is required' })
      };
    }

    // Build the prompt
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
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid API key. Please check your API key in Settings.' })
        };
      }

      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API request failed: ${response.statusText}` })
      };
    }

    const data = await response.json();

    // Parse the response
    if (!data.content || !data.content[0] || !data.content[0].text) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid response from Claude API' })
      };
    }

    const text = data.content[0].text;

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Could not parse calorie estimate from response' })
      };
    }

    const estimate = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      typeof estimate.caloriesMin !== 'number' ||
      typeof estimate.caloriesMax !== 'number' ||
      typeof estimate.needsClarification !== 'boolean' ||
      typeof estimate.analysis !== 'string'
    ) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid estimate format' })
      };
    }

    // Return the estimate
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caloriesMin: estimate.caloriesMin,
        caloriesMax: estimate.caloriesMax,
        needsClarification: estimate.needsClarification,
        clarificationQuestion: estimate.clarificationQuestion || null,
        analysis: estimate.analysis
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to estimate calories: ${error.message}` })
    };
  }
};
