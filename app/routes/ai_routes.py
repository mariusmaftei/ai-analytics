"""
AI Routes - Handle AI chat, generation, and analysis endpoints
"""
from flask import Blueprint, request, jsonify, Response
import os
from config import generate_text, generate_text_stream, analyze_content
from services.ai_prompt_service import build_chat_prompt, build_streaming_chat_prompt
from services.insight_service import build_csv_insight_prompt, build_document_insight_prompt

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@ai_bp.route('/generate', methods=['POST'])
def ai_generate():
    """Generate text using Gemini AI (non-streaming)"""
    try:
        data = request.json
        user_message = data.get('message') or data.get('prompt')
        
        if not user_message:
            return {
                'status': 'error',
                'message': 'Message is required'
            }, 400
        
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_output_tokens', 8192)
        user_name = data.get('user_name', 'User')
        is_greeting = data.get('is_greeting', False)
        
        system_prompt = build_chat_prompt(user_message, user_name, is_greeting)
        
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


@ai_bp.route('/generate-stream', methods=['POST'])
def ai_generate_stream():
    """Generate text using Gemini AI with streaming"""
    try:
        data = request.json
        user_message = data.get('message') or data.get('prompt')
        
        if not user_message:
            return {
                'status': 'error',
                'message': 'Message is required'
            }, 400
        
        user_name = data.get('user_name')
        is_greeting = data.get('is_greeting', False)
        
        system_prompt = build_streaming_chat_prompt(user_message, user_name, is_greeting)
        
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


@ai_bp.route('/analyze', methods=['POST'])
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


@ai_bp.route('/test', methods=['GET'])
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


@ai_bp.route('/generate-insights-stream', methods=['POST'])
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
            csv_data = data.get('data', [])
            columns = data.get('columns', [])
            metadata = data.get('metadata', {})
            analysis_type = data.get('analysisType', 'overview')
            
            print(f"[INSIGHT] CSV data: {len(csv_data) if csv_data else 0} rows, {len(columns) if columns else 0} columns, analysis_type: {analysis_type}")
            
            if not csv_data or not columns:
                return jsonify({
                    'status': 'error',
                    'message': 'CSV data and columns are required'
                }), 400
            
            try:
                prompt = build_csv_insight_prompt(csv_data, columns, metadata, analysis_type)
                print(f"[INSIGHT] Prompt built successfully, length: {len(prompt)}, type: {analysis_type}")
            except Exception as e:
                print(f"[INSIGHT] Error building CSV prompt: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error building prompt: {str(e)}'
                }), 500
        else:
            document_text = data.get('text', '')
            metadata = data.get('metadata', {})
            tables = data.get('tables', [])
            
            print(f"[INSIGHT] Document text length: {len(document_text) if document_text else 0}, tables: {len(tables) if tables else 0}")
            
            if not document_text:
                return jsonify({
                    'status': 'error',
                    'message': 'Document text is required for non-CSV files'
                }), 400
            
            try:
                analysis_type = data.get('analysisType', 'overview')
                prompt = build_document_insight_prompt(document_text, metadata, tables, analysis_type)
                print(f"[INSIGHT] Prompt built successfully, length: {len(prompt)}, analysis_type: {analysis_type}")
            except Exception as e:
                print(f"[INSIGHT] Error building document prompt: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error building prompt: {str(e)}'
                }), 500
        
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

