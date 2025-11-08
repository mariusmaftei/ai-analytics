# Google Gemini AI Setup Guide

## 🚀 Getting Started

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API key" or "Create API key"
4. Copy your API key

### 2. Add to Environment Variables

Add these lines to your `.env` file in the project root:

```bash
# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Available Models:
- **gemini-2.0-flash-exp** - Latest experimental, fastest (recommended)
- **gemini-1.5-flash** - Fast, cost-effective
- **gemini-1.5-pro** - More capable, higher quality

## 🧪 Testing Your Setup

Run the test script:

```bash
python app/test_gemini.py
```

## 📡 API Endpoints

### 1. Test Gemini Connection
```bash
GET /api/ai/test
```

### 2. Generate Text
```bash
POST /api/ai/generate
Content-Type: application/json

{
  "prompt": "Write a short poem about AI",
  "temperature": 0.7,
  "max_output_tokens": 2048
}
```

### 3. Generate with Streaming
```bash
POST /api/ai/generate-stream
Content-Type: application/json

{
  "prompt": "Tell me a story"
}
```

### 4. Analyze Content
```bash
POST /api/ai/analyze
Content-Type: application/json

{
  "content": "Your text to analyze",
  "type": "sentiment"
}
```

**Analysis Types:**
- `general` - General analysis
- `sentiment` - Sentiment analysis
- `summary` - Content summary
- `keywords` - Extract keywords
- `insights` - Get insights and recommendations

## 💻 Using in Your Code

```python
from config import generate_text, analyze_content, generate_text_stream

# Generate text
response = generate_text("What is AI?")
print(response)

# Analyze content
analysis = analyze_content(
    "This product is great!", 
    analysis_type='sentiment'
)
print(analysis)

# Stream responses
for chunk in generate_text_stream("Tell me a story"):
    print(chunk, end='', flush=True)
```

## 🔧 Advanced Configuration

### Custom Generation Parameters

```python
from config import generate_text

response = generate_text(
    prompt="Your prompt here",
    temperature=0.9,        # Creativity (0-1)
    top_p=0.95,            # Nucleus sampling
    top_k=40,              # Top-k sampling
    max_output_tokens=4096 # Max response length
)
```

### Direct Model Access

```python
from config import get_gemini_model

model = get_gemini_model('gemini-1.5-pro')
response = model.generate_content("Your prompt")
print(response.text)
```

### Chat Conversations

```python
from config import chat

messages = [
    {'role': 'user', 'content': 'Hello!'},
    {'role': 'assistant', 'content': 'Hi there!'},
    {'role': 'user', 'content': 'What is AI?'}
]

response = chat(messages)
print(response)
```

## 🎯 Use Cases for Your AI Analytics App

1. **Content Analysis**: Analyze user-generated content for sentiment, topics, etc.
2. **Summarization**: Generate summaries of long documents or sessions
3. **Insights Generation**: Extract actionable insights from analytics data
4. **Natural Language Interface**: Allow users to query data using natural language
5. **Report Generation**: Automatically generate analytics reports
6. **Data Interpretation**: Explain complex data patterns in simple terms

## 🔒 Security Notes

- ⚠️ **Never commit your API key to version control**
- Keep your `.env` file in `.gitignore`
- Use environment variables in production
- Monitor your API usage and costs
- Consider rate limiting for production apps

## 📚 Additional Resources

- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing Information](https://ai.google.dev/pricing)
- [Model Comparison](https://ai.google.dev/models/gemini)

## 🐛 Troubleshooting

### "API_KEY_INVALID" Error
- Verify your API key is correct
- Check if the API key is enabled
- Ensure no extra spaces in the .env file

### "Resource Exhausted" Error
- You've hit rate limits
- Wait a few minutes and try again
- Consider upgrading your quota

### Import Errors
- Make sure you installed: `pip install google-generativeai`
- Check that you're in the correct virtual environment



