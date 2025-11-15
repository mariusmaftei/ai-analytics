from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
import os
from config import init_db, close_db, get_db, generate_text, generate_text_stream, analyze_content
from routes import pdf_bp
from routes.rag_routes import rag_bp
from routes.image_routes import image_bp
from services.insight_service import build_csv_insight_prompt, build_document_insight_prompt

# Load environment variables
load_dotenv()

port = int(os.getenv('PORT', 8080))

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register blueprints
app.register_blueprint(pdf_bp)
app.register_blueprint(rag_bp)
app.register_blueprint(image_bp)

# Initialize database connection
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
        db = get_db()
        if db is None:
            return {
                'status': 'error',
                'message': 'Database not connected'
            }, 500
        
        # Get collection names
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
        
        # Insert a test document
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

# Gemini AI Endpoints
@app.route('/api/ai/generate', methods=['POST'])
def ai_generate():
    """Generate text using Gemini AI (non-streaming)"""
    try:
        data = request.json
        user_message = data.get('message') or data.get('prompt')  # Support both for backward compatibility
        
        if not user_message:
            return {
                'status': 'error',
                'message': 'Message is required'
            }, 400
        
        # Optional parameters
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_output_tokens', 8192)
        user_name = data.get('user_name', 'User')
        is_greeting = data.get('is_greeting', False)
        
        # Build the full prompt with system context (SERVER-SIDE)
        if is_greeting:
            system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and JSON file analysis.

The user's name is {user_name}. This is the FIRST message - greet them warmly: "Hello {user_name}! How can I help you?"

Keep it simple, don't mention PDF/CSV/JSON yet.

User: {user_message}

Greet them naturally:"""
        else:
            system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and JSON file analysis.

The user's name is {user_name}. This is a CONTINUING conversation.
- DO NOT greet again
- DO NOT use their name unless they ask "Who am I?" or say goodbye
- Just respond naturally to their message

User: {user_message}

Respond helpfully:"""
        
        # Generate text
        response = generate_text(
            system_prompt, 
            temperature=temperature,
            max_output_tokens=max_tokens
        )
        
        return {
            'status': 'success',
            'response': response,
            'model': os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }, 500

@app.route('/api/ai/generate-stream', methods=['POST'])
def ai_generate_stream():
    """Generate text using Gemini AI with streaming"""
    try:
        data = request.json
        user_message = data.get('message') or data.get('prompt')  # Support both for backward compatibility
        
        if not user_message:
            return {
                'status': 'error',
                'message': 'Message is required'
            }, 400
        
        # Get optional user context from request
        user_name = data.get('user_name', 'User')
        is_greeting = data.get('is_greeting', False)  # Frontend tells us if this is the first message
        
        # Build the full prompt with system context (SERVER-SIDE)
        if is_greeting:
            # This is the first message - use name in greeting
            system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and JSON file analysis.

The user's name is {user_name}. This is the FIRST message - greet them warmly: "Hello {user_name}! How can I help you?"

Keep it simple, don't mention PDF/CSV/JSON yet.

User: {user_message}

Greet them naturally:"""
        else:
            # Continuing conversation - DON'T use name unless asked
            system_prompt = f"""You are an AI Analysis Assistant specializing in PDF, CSV, and JSON file analysis.

The user's name is {user_name}. This is a CONTINUING conversation.
- DO NOT greet again
- DO NOT use their name unless they ask "Who am I?" or say goodbye
- Just respond naturally to their message

User: {user_message}

Respond helpfully:"""
        
        def generate():
            try:
                for chunk in generate_text_stream(system_prompt):
                    yield f"data: {chunk}\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }, 500

@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    """Analyze content using Gemini AI"""
    try:
        data = request.json
        content = data.get('content')
        analysis_type = data.get('type', 'general')
        
        if not content:
            return {
                'status': 'error',
                'message': 'Content is required'
            }, 400
        
        # Analyze content
        result = analyze_content(content, analysis_type)
        
        return {
            'status': 'success',
            'analysis': result,
            'type': analysis_type
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }, 500

@app.route('/api/ai/test', methods=['GET'])
def ai_test():
    """Test Gemini AI connection"""
    try:
        test_prompt = "Say 'Hello! Gemini is working!' in a friendly way."
        response = generate_text(test_prompt, max_output_tokens=100)
        
        return {
            'status': 'success',
            'message': 'Gemini AI is working!',
            'response': response,
            'model': os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }, 500

@app.route('/api/ai/generate-insights-stream', methods=['POST'])
def ai_generate_insights_stream():
    """Generate insights with streaming - prompts built server-side for security"""
    try:
        data = request.json
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Request body is required'
            }), 400
        
        file_type = data.get('fileType', '').upper()
        print(f"[INSIGHT] Generating insights for file type: {file_type}")
        
        if file_type == 'CSV':
            # CSV insight generation
            csv_data = data.get('data', [])
            columns = data.get('columns', [])
            metadata = data.get('metadata', {})
            
            print(f"[INSIGHT] CSV data: {len(csv_data) if csv_data else 0} rows, {len(columns) if columns else 0} columns")
            
            if not csv_data or not columns:
                return jsonify({
                    'status': 'error',
                    'message': 'CSV data and columns are required'
                }), 400
            
            # Build prompt server-side
            try:
                prompt = build_csv_insight_prompt(csv_data, columns, metadata)
                print(f"[INSIGHT] Prompt built successfully, length: {len(prompt)}")
            except Exception as e:
                print(f"[INSIGHT] Error building CSV prompt: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error building prompt: {str(e)}'
                }), 500
        else:
            # Document insight generation
            document_text = data.get('text', '')
            metadata = data.get('metadata', {})
            tables = data.get('tables', [])
            
            print(f"[INSIGHT] Document text length: {len(document_text) if document_text else 0}, tables: {len(tables) if tables else 0}")
            
            if not document_text:
                return jsonify({
                    'status': 'error',
                    'message': 'Document text is required for non-CSV files'
                }), 400
            
            # Build prompt server-side
            try:
                prompt = build_document_insight_prompt(document_text, metadata, tables)
                print(f"[INSIGHT] Prompt built successfully, length: {len(prompt)}")
            except Exception as e:
                print(f"[INSIGHT] Error building document prompt: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error building prompt: {str(e)}'
                }), 500
        
        # Optional parameters
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 2048)
        
        print(f"[INSIGHT] Starting generation with temperature={temperature}, max_tokens={max_tokens}")
        
        def generate():
            try:
                chunk_count = 0
                for chunk in generate_text_stream(prompt, temperature=temperature, max_output_tokens=max_tokens):
                    if chunk:
                        chunk_count += 1
                        yield f"data: {chunk}\n\n"
                print(f"[INSIGHT] Generation complete. Sent {chunk_count} chunks")
            except Exception as e:
                error_msg = f"[ERROR] {str(e)}"
                print(f"[INSIGHT] Generation error: {error_msg}")
                yield f"data: {error_msg}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[INSIGHT] Endpoint error: {str(e)}")
        print(f"[INSIGHT] Traceback: {error_trace}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Cleanup database connection on shutdown
@app.teardown_appcontext
def shutdown_session(exception=None):
    close_db()

if __name__ == '__main__':
    print(f"Server is running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)

