"""
Main Application Entry Point
Sets up Flask server and registers blueprints
"""
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from config import init_db, close_db
from routes import pdf_bp, rag_bp, audio_bp
from routes.image_routes import image_bp
from routes.ai_routes import ai_bp

load_dotenv(verbose=False)

port = int(os.getenv('PORT', 8080))

app = Flask(__name__)
CORS(app)

# Memory-optimized configuration for low-resource VPS
# Reduce max upload size to prevent memory issues (25MB instead of 50MB)
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25MB in bytes
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 300  # Cache static files for 5 minutes
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False  # Disable pretty printing to save memory

app.register_blueprint(pdf_bp)
app.register_blueprint(rag_bp)
app.register_blueprint(image_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(audio_bp)

try:
    init_db()
except Exception as e:
    print(f"Warning: Could not connect to database: {e}")


@app.route('/')
def home():
    return {'message': 'Welcome to the API!', 'status': 'running'}


@app.route('/api/health')
def health():
    import os
    from config.database import db as database_instance
    
    # Try to get memory usage if psutil is available
    memory_info = None
    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        memory_mb = memory_info.rss / 1024 / 1024
        
        # Get system memory
        try:
            system_memory = psutil.virtual_memory()
            system_total_mb = system_memory.total / 1024 / 1024
            system_used_mb = system_memory.used / 1024 / 1024
            system_percent = system_memory.percent
        except:
            system_memory = None
    except ImportError:
        memory_mb = None
        system_memory = None
    
    db_status = 'connected' if database_instance.is_connected() else 'disconnected'
    
    response = {
        'status': 'healthy',
        'database': db_status
    }
    
    if memory_mb is not None:
        response['memory'] = {
            'process_mb': round(memory_mb, 2),
            'system_total_mb': round(system_total_mb, 2) if system_memory else None,
            'system_used_mb': round(system_used_mb, 2) if system_memory else None,
            'system_percent': round(system_percent, 2) if system_memory else None
        }
    
    return response


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
