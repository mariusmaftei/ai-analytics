"""
AI Prompt Service - Builds prompts for AI interactions
"""
import os


def build_chat_prompt(user_message, user_name="User", is_greeting=False):
    """
    Build prompt for chat interactions
    
    Args:
        user_message: The user's message
        user_name: The user's name (optional)
        is_greeting: Whether this is the first message
    
    Returns:
        str: Formatted system prompt
    """
    if is_greeting:
        system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and Image file analysis.

The user's name is {user_name}. This is the FIRST message - greet them warmly: "Hello {user_name}! How can I help you?"

Keep it simple, don't mention PDF/CSV/Image yet.

User: {user_message}

Greet them naturally:"""
    else:
        system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and Image file analysis.

The user's name is {user_name}. This is a CONTINUING conversation.
- DO NOT greet again
- DO NOT use their name unless they ask "Who am I?" or say goodbye
- Just respond naturally to their message

User: {user_message}

Respond helpfully:"""
    
    return system_prompt


def build_streaming_chat_prompt(user_message, user_name=None, is_greeting=False):
    """
    Build prompt for streaming chat interactions
    
    Args:
        user_message: The user's message
        user_name: The user's name (optional)
        is_greeting: Whether this is the first message
    
    Returns:
        str: Formatted system prompt
    """
    if is_greeting:
        if user_name:
            greeting = f"Hello {user_name}! How can I help you?"
        else:
            greeting = "Hello! How can I help you today?"
        
        system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and Image file analysis.

This is the FIRST message - greet them warmly with: "{greeting}"

Keep it simple, don't mention PDF/CSV/Image yet.

User: {user_message}

Greet them naturally:"""
    else:
        system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and Image file analysis.

This is a CONTINUING conversation.
- DO NOT greet again
- DO NOT use their name unless they ask "Who am I?" or say goodbye
- Just respond naturally to their message

User: {user_message}

Respond helpfully:"""
    
    return system_prompt

