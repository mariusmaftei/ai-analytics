"""
PDF Routes - Handle PDF upload, extraction, and analysis
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from services.pdf_service import extract_text_from_pdf, extract_pdf_metadata, analyze_pdf_with_ai

pdf_bp = Blueprint('pdf', __name__, url_prefix='/api/pdf')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@pdf_bp.route('/upload', methods=['POST'])
def upload_pdf():
    """
    Upload and process PDF file
    
    Expected: multipart/form-data with 'file' field
    Optional: 'analysis_type' (summary, keywords, insights)
    
    Returns: JSON with extracted text, metadata, and optional AI analysis
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
                'message': 'Invalid file type. Only PDF files are allowed.'
            }), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Extract text from PDF
        extraction_result = extract_text_from_pdf(file)
        
        if not extraction_result['success']:
            return jsonify({
                'status': 'error',
                'message': f"Failed to extract PDF: {extraction_result['error']}"
            }), 500
        
        # Prepare response data
        response_data = {
            'status': 'success',
            'filename': filename,
            'text': extraction_result['text'],
            'page_count': extraction_result['page_count'],
            'metadata': extraction_result['metadata'],
            'extracted_at': datetime.now().isoformat(),
            'character_count': len(extraction_result['text']),
            'word_count': len(extraction_result['text'].split())
        }
        
        # Optional: Get analysis type from request
        analysis_type = request.form.get('analysis_type', None)
        
        if analysis_type and extraction_result['text']:
            try:
                analysis = analyze_pdf_with_ai(extraction_result['text'], analysis_type)
                response_data['ai_analysis'] = {
                    'type': analysis_type,
                    'result': analysis
                }
            except Exception as e:
                response_data['ai_analysis'] = {
                    'error': str(e)
                }
        
        # Optional: Save to database
        save_to_db = request.form.get('save_to_db', 'false').lower() == 'true'
        
        if save_to_db:
            from services.db_service import save_pdf_data
            db_result = save_pdf_data({
                'filename': filename,
                'text': extraction_result['text'],
                'page_count': extraction_result['page_count'],
                'metadata': extraction_result['metadata'],
                'uploaded_at': datetime.now()
            })
            response_data['db_id'] = str(db_result['id']) if db_result['success'] else None
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@pdf_bp.route('/metadata', methods=['POST'])
def get_pdf_metadata():
    """
    Get only PDF metadata (faster than full extraction)
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
        
        metadata_result = extract_pdf_metadata(file)
        
        if not metadata_result['success']:
            return jsonify({
                'status': 'error',
                'message': metadata_result['error']
            }), 500
        
        return jsonify({
            'status': 'success',
            'filename': secure_filename(file.filename),
            'metadata': metadata_result['metadata']
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@pdf_bp.route('/analyze', methods=['POST'])
def analyze_pdf():
    """
    Upload PDF and get AI analysis directly
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
        
        file = request.files['file']
        analysis_type = request.form.get('analysis_type', 'summary')
        
        if not allowed_file(file.filename):
            return jsonify({
                'status': 'error',
                'message': 'Invalid file type'
            }), 400
        
        # Extract text
        extraction = extract_text_from_pdf(file)
        
        if not extraction['success']:
            return jsonify({
                'status': 'error',
                'message': extraction['error']
            }), 500
        
        # Analyze with AI
        analysis = analyze_pdf_with_ai(extraction['text'], analysis_type)
        
        return jsonify({
            'status': 'success',
            'filename': secure_filename(file.filename),
            'analysis_type': analysis_type,
            'analysis': analysis,
            'page_count': extraction['page_count'],
            'word_count': len(extraction['text'].split())
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

