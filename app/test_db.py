"""
Quick script to test MongoDB connection and create initial data
Run this: python app/test_db.py
"""

from dotenv import load_dotenv
from pathlib import Path
import os

# Load env from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, encoding='utf-8-sig')

from config import get_db, get_collection
from datetime import datetime

def test_database():
    """Test database connection and create initial collections"""
    print("=" * 60)
    print("MongoDB Connection Test")
    print("=" * 60)
    
    try:
        # Get database
        db = get_db()
        print(f"\n[OK] Connected to database: {db.name}")
        
        # Check existing collections
        existing_collections = db.list_collection_names()
        print(f"\nExisting collections: {existing_collections if existing_collections else 'None (empty database)'}")
        
        # Create test collection with sample data
        print("\n" + "-" * 60)
        print("Creating test data...")
        print("-" * 60)
        
        # 1. Users collection
        users = get_collection('users')
        user_result = users.insert_one({
            'name': 'Test User',
            'email': 'test@example.com',
            'role': 'admin',
            'created_at': datetime.now().isoformat()
        })
        print(f"[OK] Created 'users' collection - Document ID: {user_result.inserted_id}")
        
        # 2. Sessions collection
        sessions = get_collection('sessions')
        session_result = sessions.insert_one({
            'user_id': str(user_result.inserted_id),
            'session_type': 'test',
            'data': {
                'chapters': [],
                'analytics': {}
            },
            'created_at': datetime.now().isoformat()
        })
        print(f"[OK] Created 'sessions' collection - Document ID: {session_result.inserted_id}")
        
        # 3. Analytics collection
        analytics = get_collection('analytics')
        analytics_result = analytics.insert_one({
            'session_id': str(session_result.inserted_id),
            'metrics': {
                'page_views': 0,
                'interactions': 0
            },
            'timestamp': datetime.now().isoformat()
        })
        print(f"[OK] Created 'analytics' collection - Document ID: {analytics_result.inserted_id}")
        
        # List all collections now
        collections = db.list_collection_names()
        print(f"\n" + "=" * 60)
        print(f"[SUCCESS] Database '{db.name}' now has {len(collections)} collections:")
        for col in collections:
            count = db[col].count_documents({})
            print(f"  - {col}: {count} document(s)")
        
        print("=" * 60)
        print("[SUCCESS] Database initialization complete!")
        print("=" * 60)
        print(f"\nYou can now view your database in MongoDB Compass/Atlas")
        print(f"Database name: {db.name}")
        print(f"Collections: {', '.join(collections)}")
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_database()

