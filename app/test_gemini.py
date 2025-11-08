"""
Test Google Gemini AI integration
Run this: python app/test_gemini.py
"""

from dotenv import load_dotenv
from pathlib import Path

# Load env from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, encoding='utf-8-sig')

from config import generate_text, analyze_content, count_tokens
import os

def test_gemini():
    """Test Gemini AI functionality"""
    print("=" * 60)
    print("Google Gemini AI Test")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key:
        print("\n[ERROR] GEMINI_API_KEY not found in environment variables")
        print("Please add your Gemini API key to the .env file:")
        print("GEMINI_API_KEY=your_api_key_here")
        print("\nGet your API key from: https://makersuite.google.com/app/apikey")
        return
    
    model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
    print(f"\n[OK] API Key configured")
    print(f"[OK] Using model: {model}")
    
    try:
        # Test 1: Simple text generation
        print("\n" + "-" * 60)
        print("Test 1: Simple Text Generation")
        print("-" * 60)
        
        prompt1 = "Say 'Hello! Gemini AI is working!' in a creative way."
        print(f"Prompt: {prompt1}")
        print("\nResponse:")
        response1 = generate_text(prompt1, max_output_tokens=100)
        print(response1)
        
        # Test 2: Content analysis
        print("\n" + "-" * 60)
        print("Test 2: Content Analysis (Sentiment)")
        print("-" * 60)
        
        content = "This product is amazing! I love using it every day. The quality is outstanding."
        print(f"Content: {content}")
        print("\nAnalysis:")
        analysis = analyze_content(content, analysis_type='sentiment')
        print(analysis)
        
        # Test 3: Token counting
        print("\n" + "-" * 60)
        print("Test 3: Token Counting")
        print("-" * 60)
        
        test_text = "This is a test to count tokens in Gemini."
        tokens = count_tokens(test_text)
        print(f"Text: {test_text}")
        print(f"Tokens: {tokens}")
        
        # Success
        print("\n" + "=" * 60)
        print("[SUCCESS] All Gemini AI tests passed!")
        print("=" * 60)
        print("\nYour Gemini AI integration is ready to use!")
        
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        
        if "API_KEY_INVALID" in str(e) or "invalid API key" in str(e).lower():
            print("\n[HINT] Your API key might be invalid. Please check:")
            print("1. Get a valid API key from: https://makersuite.google.com/app/apikey")
            print("2. Update your .env file with: GEMINI_API_KEY=your_api_key")

if __name__ == '__main__':
    test_gemini()


