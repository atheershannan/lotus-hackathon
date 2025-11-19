# 🤖 OpenAI API Setup for AI Routing

The `/route` endpoint uses OpenAI to intelligently route requests to the appropriate microservice.

## Prerequisites

- Node.js 18+ (has built-in `fetch` API)
- OpenAI API key

## Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (you won't be able to see it again!)

## Configuration

### Option 1: Environment Variables (Recommended)

Add to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```

### Option 2: Railway Environment Variables

When deploying to Railway, add these in the Railway Dashboard:
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - Model to use (default: `gpt-3.5-turbo`)
- `OPENAI_API_URL` - API endpoint (default: OpenAI's official endpoint)

## How It Works

1. **Request comes in** to `/route` with a query/intent
2. **Service context** is built from registered microservices
3. **AI prompt** is created with:
   - Available services and their purposes
   - User's query/intent
   - Request context (method, path, body)
4. **OpenAI API** is called to determine the best service
5. **Routing decision** is returned with:
   - Selected service name
   - Confidence score
   - Reasoning
   - Service endpoint details

## Fallback Behavior

If OpenAI API is unavailable or fails:
- Falls back to **rule-based routing** (keyword matching)
- Returns all available services for manual selection
- Logs the error for debugging

## Example Usage

### POST /route

```json
{
  "query": "I need to get user profile information",
  "method": "GET",
  "path": "/api/users/123"
}
```

**Response:**
```json
{
  "success": true,
  "routing": {
    "serviceName": "user-service",
    "confidence": 0.95,
    "reasoning": "The query is about user profiles, which matches the user-service",
    "service": {
      "endpoint": "http://localhost:3001",
      "version": "1.0.0",
      "status": "active"
    }
  }
}
```

### GET /route?q=process payment

**Response:**
```json
{
  "success": true,
  "routing": {
    "serviceName": "payment-service",
    "confidence": 0.92,
    "reasoning": "Payment processing request matches payment-service",
    "service": {
      "endpoint": "http://localhost:3003",
      "version": "2.1.0",
      "status": "active"
    }
  }
}
```

## Cost Considerations

- Uses `gpt-3.5-turbo` by default (cost-effective)
- Limited to 200 tokens per request
- Temperature set to 0.3 for consistent routing decisions
- Consider caching routing decisions for repeated queries

## Testing Without API Key

If you don't have an OpenAI API key:
- The service will automatically fall back to rule-based routing
- You can still test the endpoint, but routing will be based on simple keyword matching
- Register services first via `/register` for routing to work

## Troubleshooting

### Error: "OPENAI_API_KEY environment variable is not set"
- Add `OPENAI_API_KEY` to your `.env` file
- Restart the service

### Error: "OpenAI API error: 401"
- Check that your API key is correct
- Ensure the key hasn't expired

### Error: "OpenAI API error: 429"
- You've hit the rate limit
- Wait a moment and try again
- Consider upgrading your OpenAI plan

### Routing returns fallback
- Check OpenAI API status
- Verify API key is valid
- Check service logs for detailed error messages

## Security Notes

⚠️ **Never commit your API key to Git!**
- Use `.env` file (already in `.gitignore`)
- Use Railway environment variables for production
- Rotate keys if exposed

---

**Ready to use AI routing!** 🚀


