# CalorieTracker Backend Server

This is a simple Express.js proxy server that handles API calls to Anthropic's Claude API.

## Why is this needed?

Web browsers block direct API calls to Anthropic due to CORS (Cross-Origin Resource Sharing) security policies. This server acts as a proxy, making the API calls on behalf of the frontend.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Server will run on:**
   - http://localhost:3000
   - Health check: http://localhost:3000/health
   - API endpoint: http://localhost:3000/api/estimate-calories

## Development

Keep this server running while developing the frontend. You'll need two terminal windows:
- **Terminal 1**: Backend server (this folder)
- **Terminal 2**: Frontend (VS Code Live Server)

## Endpoints

### GET /health
Health check endpoint to verify server is running.

**Response:**
```json
{
  "status": "Server is running!"
}
```

### POST /api/estimate-calories
Proxy endpoint for calorie estimation.

**Request body:**
```json
{
  "apiKey": "your-anthropic-api-key",
  "foodDescription": "scrambled eggs",
  "conversationContext": "optional previous context"
}
```

**Response:**
```json
{
  "caloriesMin": 200,
  "caloriesMax": 250,
  "needsClarification": false,
  "clarificationQuestion": null,
  "analysis": "Two scrambled eggs typically contain..."
}
```

## Security Note

⚠️ This server is for LOCAL DEVELOPMENT ONLY. For production:
- Deploy to Netlify/Vercel with serverless functions
- Or implement proper authentication/rate limiting
- Never expose API keys in client-side code
