"""
Main Application Entry Point
Sets up Flask server and registers blueprints
"""
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from config import init_db, close_db
from routes import pdf_bp, rag_bp
from routes.image_routes import image_bp
from routes.ai_routes import ai_bp

load_dotenv(verbose=False)

port = int(os.getenv('PORT', 8080))

app = Flask(__name__)
CORS(app)

# Increase max content length for large PDF uploads (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB in bytes

app.register_blueprint(pdf_bp)
app.register_blueprint(rag_bp)
app.register_blueprint(image_bp)
app.register_blueprint(ai_bp)

try:
    init_db()
except Exception as e:
    print(f"Warning: Could not connect to database: {e}")


@app.route('/')
def home():
    return {'message': 'Welcome to the API!', 'status': 'running'}


@app.route('/api/health')
def health():
    from config.database import db as database_instance
    db_status = 'connected' if database_instance.is_connected() else 'disconnected'
    return {
        'status': 'healthy',
        'database': db_status
    }


@app.route('/api/db-test')
def db_test():
    """Test database connection and return collection names"""
    try:
        from config import get_collection
        from config import get_db
        db = get_db()
        if db is None:
            return {
                'status': 'error',
                'message': 'Database not connected'
            }, 500
        
        collections = db.list_collection_names()
        
        return {
            'status': 'success',
            'database': str(db.name),
            'collections': collections,
            'message': 'Database is empty - no collections yet' if len(collections) == 0 else f'Found {len(collections)} collections'
        }
    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }, 500


@app.route('/api/db-init', methods=['POST'])
def db_init():
    """Initialize database with a test collection"""
    try:
        from datetime import datetime
        from config import get_collection
        test_collection = get_collection('test')
        
        result = test_collection.insert_one({
            'message': 'Database initialized successfully!',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0'
        })
        
        return {
            'status': 'success',
            'message': 'Database initialized with test collection',
            'collection': 'test',
            'document_id': str(result.inserted_id)
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }, 500


@app.teardown_appcontext
def shutdown_session(exception=None):
    close_db()


if __name__ == '__main__':
    print(f"Server is running on port {port}")
    debug_mode = os.getenv('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
