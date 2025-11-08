"""
Example: Using MongoDB + Gemini AI Together
This demonstrates how to use both systems in your application
"""

from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

# Load env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, encoding='utf-8-sig')

from config import get_collection, generate_text, analyze_content

def example_analytics_workflow():
    """
    Example: Analyze user feedback and store insights in MongoDB
    """
    print("=" * 60)
    print("Example: AI-Powered Analytics Workflow")
    print("=" * 60)
    
    # Sample user feedback
    feedback_text = """
    I've been using this platform for a month now and I'm really impressed.
    The interface is intuitive and the features are powerful. However, I think
    the loading time could be improved. Overall, it's been a great experience
    and I would recommend it to others.
    """
    
    try:
        print("\n[1] Analyzing user feedback with Gemini AI...")
        print(f"Feedback: {feedback_text.strip()}")
        
        # Analyze sentiment
        sentiment_analysis = analyze_content(
            feedback_text, 
            analysis_type='sentiment'
        )
        
        print("\n[2] AI Sentiment Analysis:")
        print(sentiment_analysis)
        
        # Extract keywords
        print("\n[3] Extracting keywords...")
        keywords_analysis = analyze_content(
            feedback_text,
            analysis_type='keywords'
        )
        print(keywords_analysis)
        
        # Store in MongoDB
        print("\n[4] Storing results in MongoDB...")
        feedback_collection = get_collection('feedback')
        
        result = feedback_collection.insert_one({
            'original_feedback': feedback_text.strip(),
            'sentiment_analysis': sentiment_analysis,
            'keywords': keywords_analysis,
            'timestamp': datetime.now().isoformat(),
            'processed': True
        })
        
        print(f"[OK] Stored in database with ID: {result.inserted_id}")
        
        # Retrieve and verify
        print("\n[5] Verifying data in MongoDB...")
        stored_doc = feedback_collection.find_one({'_id': result.inserted_id})
        print(f"[OK] Retrieved document with {len(stored_doc.keys())} fields")
        
        # Generate summary report
        print("\n[6] Generating insights report with Gemini...")
        report_prompt = f"""
        Based on this user feedback analysis, create a brief executive summary:
        
        Feedback: {feedback_text.strip()}
        
        Sentiment Analysis: {sentiment_analysis}
        
        Provide:
        1. Overall sentiment (positive/negative/neutral)
        2. Key points mentioned
        3. Action items for the team
        """
        
        report = generate_text(report_prompt, max_output_tokens=500)
        print("\n[7] Executive Summary:")
        print("-" * 60)
        print(report)
        print("-" * 60)
        
        # Update document with report
        feedback_collection.update_one(
            {'_id': result.inserted_id},
            {'$set': {'executive_summary': report}}
        )
        
        print("\n" + "=" * 60)
        print("[SUCCESS] Workflow completed!")
        print("=" * 60)
        print("\nWhat happened:")
        print("1. ✓ Analyzed user feedback with Gemini AI")
        print("2. ✓ Extracted sentiment and keywords")
        print("3. ✓ Stored results in MongoDB")
        print("4. ✓ Generated executive summary")
        print("5. ✓ Updated database with insights")
        
    except Exception as e:
        print(f"\n[ERROR] Workflow failed: {e}")
        import traceback
        traceback.print_exc()


def example_session_analysis():
    """
    Example: Analyze user session data and generate insights
    """
    print("\n\n" + "=" * 60)
    print("Example: Session Analytics with AI")
    print("=" * 60)
    
    try:
        # Get sessions collection
        sessions = get_collection('sessions')
        
        # Get recent sessions
        recent_sessions = list(sessions.find().limit(3))
        
        if not recent_sessions:
            print("\n[INFO] No sessions found in database")
            print("Run 'python app/test_db.py' first to create sample data")
            return
        
        print(f"\n[1] Found {len(recent_sessions)} recent sessions")
        
        # Analyze each session
        for idx, session in enumerate(recent_sessions, 1):
            print(f"\n[{idx}] Analyzing session: {session.get('_id')}")
            
            # Generate insights about the session
            session_prompt = f"""
            Analyze this user session data and provide insights:
            
            Session Type: {session.get('session_type', 'unknown')}
            User ID: {session.get('user_id', 'unknown')}
            Created: {session.get('created_at', 'unknown')}
            Data: {session.get('data', {})}
            
            Provide:
            1. Session quality assessment
            2. User engagement level
            3. Recommendations for improvement
            """
            
            insights = generate_text(session_prompt, max_output_tokens=300)
            print(insights)
            
            # Store insights back to database
            sessions.update_one(
                {'_id': session['_id']},
                {'$set': {
                    'ai_insights': insights,
                    'analyzed_at': datetime.now().isoformat()
                }}
            )
        
        print("\n" + "=" * 60)
        print("[SUCCESS] Session analysis complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] Analysis failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    print("\n🚀 AI Analytics Platform - Example Usage\n")
    
    # Check if API key is configured
    import os
    if not os.getenv('GEMINI_API_KEY'):
        print("[WARNING] GEMINI_API_KEY not found!")
        print("Please add your API key to .env file to run AI features")
        print("You can still use MongoDB features.\n")
    
    # Run examples
    example_analytics_workflow()
    
    # Uncomment to run session analysis
    # example_session_analysis()


