import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables (silently fail if .env doesn't exist)
load_dotenv(verbose=False)

class GeminiConfig:
    """Google Gemini AI Configuration and Helper"""
    
    _instance = None
    _model = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Gemini configuration"""
        if cls._instance is None:
            cls._instance = super(GeminiConfig, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Gemini configuration"""
        if not hasattr(self, 'initialized'):
            self.api_key = os.getenv('GEMINI_API_KEY', '')
            self.model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
            self.initialized = True
            
            # Configure API key
            if self.api_key:
                genai.configure(api_key=self.api_key)
                print(f"[OK] Gemini AI configured with model: {self.model_name}")
            else:
                print("[WARNING] GEMINI_API_KEY not found in environment variables")
    
    def get_model(self, model_name=None):
        """
        Get Gemini generative model
        Args:
            model_name (str): Optional model name override
        Returns: GenerativeModel instance
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        
        model = model_name or self.model_name
        return genai.GenerativeModel(model)
    
    def generate_text(self, prompt, model_name=None, **kwargs):
        """
        Generate text using Gemini
        Args:
            prompt (str): The prompt to send to Gemini
            model_name (str): Optional model name override
            **kwargs: Additional generation parameters
        Returns: Generated text response
        """
        try:
            model = self.get_model(model_name)
            
            # Set default generation config
            generation_config = {
                'temperature': kwargs.get('temperature', 0.7),
                'top_p': kwargs.get('top_p', 0.95),
                'top_k': kwargs.get('top_k', 40),
                'max_output_tokens': kwargs.get('max_output_tokens', 8192),
            }
            
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            return response.text
            
        except Exception as e:
            print(f"[ERROR] Gemini generation error: {e}")
            raise
    
    def generate_text_stream(self, prompt, model_name=None, **kwargs):
        """
        Generate text using Gemini with streaming
        Args:
            prompt (str): The prompt to send to Gemini
            model_name (str): Optional model name override
            **kwargs: Additional generation parameters
        Yields: Text chunks as they are generated
        """
        try:
            model = self.get_model(model_name)
            
            # Set default generation config
            generation_config = {
                'temperature': kwargs.get('temperature', 0.7),
                'top_p': kwargs.get('top_p', 0.95),
                'top_k': kwargs.get('top_k', 40),
                'max_output_tokens': kwargs.get('max_output_tokens', 8192),
            }
            
            response = model.generate_content(
                prompt,
                generation_config=generation_config,
                stream=True
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"[ERROR] Gemini streaming error: {e}")
            raise
    
    def chat(self, messages, model_name=None, **kwargs):
        """
        Start a chat conversation with Gemini
        Args:
            messages (list): List of message dictionaries with 'role' and 'content'
            model_name (str): Optional model name override
            **kwargs: Additional generation parameters
        Returns: Chat response
        """
        try:
            model = self.get_model(model_name)
            chat = model.start_chat(history=[])
            
            # Send each message
            for message in messages:
                response = chat.send_message(message['content'])
            
            return response.text
            
        except Exception as e:
            print(f"[ERROR] Gemini chat error: {e}")
            raise
    
    def analyze_content(self, content, analysis_type='general', model_name=None, **kwargs):
        """
        Analyze content using Gemini
        Args:
            content (str): The content to analyze
            analysis_type (str): Type of analysis (general, sentiment, summary, etc.)
            model_name (str): Optional model name override
            **kwargs: Additional generation parameters
        Returns: Analysis result
        """
        prompts = {
            'general': f"Analyze the following content:\n\n{content}",
            'sentiment': f"Analyze the sentiment of the following content and provide a detailed breakdown:\n\n{content}",
            'summary': f"Provide a concise summary of the following content:\n\n{content}",
            'keywords': f"Extract the main keywords and topics from the following content:\n\n{content}",
            'insights': f"Provide key insights and actionable recommendations from the following content:\n\n{content}"
        }
        
        prompt = prompts.get(analysis_type, prompts['general'])
        return self.generate_text(prompt, model_name, **kwargs)
    
    def count_tokens(self, text, model_name=None):
        """
        Count tokens in text
        Args:
            text (str): Text to count tokens for
            model_name (str): Optional model name override
        Returns: Token count
        """
        try:
            model = self.get_model(model_name)
            return model.count_tokens(text).total_tokens
        except Exception as e:
            print(f"[ERROR] Token counting error: {e}")
            raise


# Initialize Gemini instance
gemini = GeminiConfig()

# Helper functions for easy access
def get_gemini_model(model_name=None):
    """Get Gemini model instance"""
    return gemini.get_model(model_name)

def generate_text(prompt, **kwargs):
    """Generate text using Gemini"""
    return gemini.generate_text(prompt, **kwargs)

def generate_text_stream(prompt, **kwargs):
    """Generate text with streaming"""
    return gemini.generate_text_stream(prompt, **kwargs)

def analyze_content(content, analysis_type='general', **kwargs):
    """Analyze content using Gemini"""
    return gemini.analyze_content(content, analysis_type, **kwargs)

def chat(messages, **kwargs):
    """Chat with Gemini"""
    return gemini.chat(messages, **kwargs)

def count_tokens(text, model_name=None):
    """Count tokens in text"""
    return gemini.count_tokens(text, model_name)

