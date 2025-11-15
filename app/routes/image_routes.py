"""
Image Routes - Handle image upload, analysis, and processing
"""
from flask import Blueprint, request, jsonify, Response
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from services.image_service import get_image_metadata, analyze_image_with_ai, analyze_image_stream

image_bp = Blueprint('image', __name__, url_prefix='/api/image')

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@image_bp.route('/upload', methods=['POST'])
def upload_image():
    """
    Upload and analyze image file
    
    Expected: multipart/form-data with 'file' field
    Optional: 
    - 'analysis_type' (general, detailed, ocr, objects, scene, chart, document)
    - 'custom_prompt' (custom analysis prompt)
    - 'save_to_db' (true/false)
    
    Returns: JSON with image metadata and AI analysis
    """
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Get image metadata
        metadata_result = get_image_metadata(file)
        
        if not metadata_result['success']:
            return jsonify({
                'status': 'error',
                'message': f"Failed to read image: {metadata_result['error']}"
            }), 500
        
        # Get analysis type from request
        analysis_type = request.form.get('analysis_type', 'general')
        custom_prompt = request.form.get('custom_prompt', None)
        
        # Analyze image with AI
        file.seek(0)  # Reset file position
        analysis_result = analyze_image_with_ai(
            file,
            analysis_type=analysis_type,
            prompt_override=custom_prompt
        )
        
        if not analysis_result['success']:
            return jsonify({
                'status': 'error',
                'message': f"Image analysis failed: {analysis_result['error']}"
            }), 500
        
        # Prepare response data
        response_data = {
            'status': 'success',
            'filename': filename,
            'fileType': 'IMAGE',
            'metadata': {
                'width': metadata_result['width'],
                'height': metadata_result['height'],
                'format': metadata_result['format'],
                'mode': metadata_result['mode'],
                'file_size': metadata_result['file_size'],
                'aspect_ratio': metadata_result['aspect_ratio']
            },
            'analysis': {
                'type': analysis_type,
                'result': analysis_result['analysis']
            },
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Optional: Save to database
        save_to_db = request.form.get('save_to_db', 'false').lower() == 'true'
        if save_to_db:
            try:
                from services.db_service import save_pdf_data  # Reuse PDF service for now
                # Convert image to base64 for storage (or store file path)
                file.seek(0)
                import base64
                image_base64 = base64.b64encode(file.read()).decode('utf-8')
                
                db_result = save_pdf_data({
                    'filename': filename,
                    'text': analysis_result['analysis'],  # Store analysis as text
                    'page_count': 1,
                    'metadata': {
                        **metadata_result,
                        'type': 'image',
                        'analysis_type': analysis_type
                    },
                    'uploaded_at': datetime.now()
                })
                
                if db_result['success']:
                    response_data['db_id'] = str(db_result['id'])
            except Exception as e:
                print(f"[WARNING] Failed to save image to database: {e}")
                response_data['db_save_error'] = str(e)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@image_bp.route('/analyze-stream', methods=['POST'])
def analyze_image_stream_endpoint():
    """
    Upload image and get streaming AI analysis
    
    Expected: multipart/form-data with 'file' field
    Optional: 'analysis_type', 'custom_prompt'
    
    Returns: Server-Sent Events stream with analysis chunks
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': 'Invalid file'
            }), 400
        
        analysis_type = request.form.get('analysis_type', 'general')
        custom_prompt = request.form.get('custom_prompt', None)
        
        def generate():
            try:
                for chunk in analyze_image_stream(file, analysis_type, custom_prompt):
                    yield f"data: {chunk}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@image_bp.route('/metadata', methods=['POST'])
def get_image_metadata_endpoint():
    """
    Get only image metadata (faster, no AI analysis)
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': 'Invalid file'
            }), 400
        
        metadata_result = get_image_metadata(file)
        
        if not metadata_result['success']:
            return jsonify({
                'status': 'error',
                'message': metadata_result['error']
            }), 500
        
        return jsonify({
            'status': 'success',
            'filename': secure_filename(file.filename),
            'metadata': {
                'width': metadata_result['width'],
                'height': metadata_result['height'],
                'format': metadata_result['format'],
                'mode': metadata_result['mode'],
                'file_size': metadata_result['file_size'],
                'aspect_ratio': metadata_result['aspect_ratio']
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

