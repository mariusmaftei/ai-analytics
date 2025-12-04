"""
Audio Routes - Handle audio upload, transcription, and analysis
"""
from flask import Blueprint, request, jsonify, Response
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from services.audio_service import get_audio_metadata, transcribe_audio, analyze_audio_with_ai, analyze_audio_stream

audio_bp = Blueprint('audio', __name__, url_prefix='/api/audio')

# Allowed audio extensions
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'aac'}

# Maximum file size for audio (10MB - smaller than images/PDFs)
MAX_AUDIO_SIZE_MB = 10
MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@audio_bp.route('/upload', methods=['POST'])
def upload_audio():
    """
    Upload and analyze audio file
    
    Expected: multipart/form-data with 'file' field
    Optional: 
    - 'analysis_type' (overview, transcription, summary, content, sentiment, keywords, speakers, actions, timeline, metadata)
    - 'save_to_db' (true/false)
    
    Returns: JSON with audio metadata, transcription, and AI analysis
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
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_AUDIO_SIZE_BYTES:
            size_mb = file_size / (1024 * 1024)
            return jsonify({
                'status': 'error',
                'message': f'File size ({size_mb:.1f}MB) exceeds maximum allowed size ({MAX_AUDIO_SIZE_MB}MB)'
            }), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Get audio metadata
        file.seek(0)
        metadata_result = get_audio_metadata(file)
        
        if not metadata_result['success']:
            return jsonify({
                'status': 'error',
                'message': f"Failed to read audio: {metadata_result['error']}"
            }), 500
        
        # Transcribe audio
        file.seek(0)
        transcription_result = transcribe_audio(file)
        
        if not transcription_result['success']:
            return jsonify({
                'status': 'error',
                'message': f"Audio transcription failed: {transcription_result['error']}"
            }), 500
        
        # Get analysis type from request
        analysis_type = request.form.get('analysis_type', 'overview')
        
        # Analyze with AI - even if transcript is empty, we can analyze metadata
        analysis_result = None
        transcript_text = transcription_result.get('transcript', '')
        is_empty_transcript = transcription_result.get('is_empty', False) or not transcript_text
        
        if transcription_result['success']:
            if is_empty_transcript:
                # Generate insights based on metadata when transcript is empty
                print("[AUDIO] Empty transcript detected - generating metadata-based insights")
                # Use a placeholder that indicates no transcription available
                transcript_text = "[No transcription available - audio may contain music, background noise, or unsupported language]"
            
            analysis_result = analyze_audio_with_ai(
                transcript_text,
                metadata_result,
                transcription_result,
                analysis_type=analysis_type
            )
        
        # Prepare response data
        response_data = {
            'status': 'success',
            'filename': filename,
            'fileType': 'AUDIO',
            'metadata': {
                'duration': transcription_result.get('duration', metadata_result.get('duration', 0)),
                'format': metadata_result.get('format', 'unknown'),
                'file_size': metadata_result.get('file_size', file_size),
                'fileSize': metadata_result.get('file_size', file_size),  # Also include camelCase for frontend
                'sample_rate': metadata_result.get('sample_rate'),
                'channels': metadata_result.get('channels'),
                'bitrate': metadata_result.get('bitrate'),
                # Audio analysis metrics (calculated by audio_analysis_metrics.py)
                'loudness': metadata_result.get('loudness'),
                'peak_level': metadata_result.get('peak_level'),
                'noise_level': metadata_result.get('noise_level'),
                'dynamic_range': metadata_result.get('dynamic_range')
            },
            'transcription': {
                'text': transcription_result.get('transcript', ''),
                'segments': transcription_result.get('segments', []),
                'language': transcription_result.get('language', 'unknown'),
                'word_count': transcription_result.get('word_count', len(transcription_result.get('transcript', '').split()) if transcription_result.get('transcript') else 0),
                'sentiment': transcription_result.get('sentiment', []),
                'duration': transcription_result.get('duration', 0)
            },
            'analysis': {
                'type': analysis_type,
                'result': analysis_result.get('analysis', '') if analysis_result else None
            } if analysis_result else None,
            'uploaded_at': datetime.now().isoformat()
        }
        
        # Optional: Save to database
        save_to_db = request.form.get('save_to_db', 'false').lower() == 'true'
        if save_to_db:
            try:
                from services.db_service import save_pdf_data
                db_result = save_pdf_data({
                    'filename': filename,
                    'text': transcription_result.get('transcript', ''),
                    'page_count': 1,
                    'metadata': {
                        **metadata_result,
                        'type': 'audio',
                        'analysis_type': analysis_type
                    },
                    'uploaded_at': datetime.now()
                })
                
                if db_result['success']:
                    response_data['db_id'] = str(db_result['id'])
            except Exception as e:
                print(f"[WARNING] Failed to save audio to database: {e}")
                response_data['db_save_error'] = str(e)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@audio_bp.route('/analyze-stream', methods=['POST'])
def analyze_audio_stream_endpoint():
    """
    Upload audio and get streaming AI analysis
    
    Expected: multipart/form-data with 'file' field
    Optional: 'analysis_type'
    
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
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_AUDIO_SIZE_BYTES:
            size_mb = file_size / (1024 * 1024)
            return jsonify({
                'status': 'error',
                'message': f'File size ({size_mb:.1f}MB) exceeds maximum ({MAX_AUDIO_SIZE_MB}MB)'
            }), 400
        
        analysis_type = request.form.get('analysis_type', 'overview')
        
        # Read file into memory
        from io import BytesIO
        file.seek(0)
        file_data = file.read()
        file_stream = BytesIO(file_data)
        
        def generate():
            try:
                for chunk in analyze_audio_stream(file_stream, analysis_type):
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


@audio_bp.route('/metadata', methods=['POST'])
def get_audio_metadata_endpoint():
    """
    Get only audio metadata (faster, no transcription)
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
        
        metadata_result = get_audio_metadata(file)
        
        if not metadata_result['success']:
            return jsonify({
                'status': 'error',
                'message': metadata_result['error']
            }), 500
        
        return jsonify({
            'status': 'success',
            'filename': secure_filename(file.filename),
            'metadata': {
                'duration': metadata_result.get('duration', 0),
                'format': metadata_result.get('format', 'unknown'),
                'file_size': metadata_result.get('file_size', 0),
                'sample_rate': metadata_result.get('sample_rate'),
                'channels': metadata_result.get('channels'),
                'bitrate': metadata_result.get('bitrate'),
                # Audio analysis metrics (calculated by audio_analysis_metrics.py)
                'loudness': metadata_result.get('loudness'),
                'peak_level': metadata_result.get('peak_level'),
                'noise_level': metadata_result.get('noise_level'),
                'dynamic_range': metadata_result.get('dynamic_range')
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

