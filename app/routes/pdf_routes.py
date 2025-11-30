"""
PDF Routes - Handle PDF upload, extraction, and analysis
"""
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
import os

from services.pdf_service import extract_text_from_pdf, extract_pdf_metadata, analyze_pdf_with_ai, extract_tables_from_pdf

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
            # Check if it's a limit error (400) or processing error (500)
            error_message = extraction_result.get('error', 'Failed to extract PDF')
            is_limit_error = any(keyword in error_message.lower() for keyword in ['exceeds', 'limit', 'maximum', 'beta'])
            status_code = 400 if is_limit_error else 500
            
            return jsonify({
                'status': 'error',
                'message': error_message,
                'error_type': 'limit_exceeded' if is_limit_error else 'processing_error'
            }), status_code
        
        # Extract tables from PDF
        file.seek(0)  # Reset file stream position
        tables_result = extract_tables_from_pdf(file)
        
        # Prepare response data
        # Use word_count from extraction_result if available, otherwise calculate
        word_count = extraction_result.get('word_count', len(extraction_result['text'].split()))
        
        response_data = {
            'status': 'success',
            'filename': filename,
            'text': extraction_result['text'],
            'page_count': extraction_result['page_count'],
            'metadata': extraction_result['metadata'],
            'extracted_at': datetime.now().isoformat(),
            'character_count': len(extraction_result['text']),
            'word_count': word_count,
            'paragraph_count': extraction_result.get('paragraph_count', 0),
            'image_count': extraction_result.get('image_count', 0),
            'section_count': extraction_result.get('section_count', 0),
            'sections': extraction_result.get('sections', []),
            'detected_language': extraction_result.get('detected_language', 'Unknown'),
            'tables': tables_result.get('tables', []) if tables_result.get('success') else [],
            'has_tables': tables_result.get('has_tables', False) if tables_result.get('success') else False,
            'table_count': tables_result.get('table_count', 0) if tables_result.get('success') else 0
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
        
        document_id = None
        if save_to_db:
            from services.db_service import save_pdf_data
            db_result = save_pdf_data({
                'filename': filename,
                'text': extraction_result['text'],
                'page_count': extraction_result['page_count'],
                'metadata': extraction_result['metadata'],
                'uploaded_at': datetime.now()
            })
            document_id = str(db_result['id']) if db_result['success'] else None
            response_data['db_id'] = document_id
        
        # RAG: Chunk and embed document for vector search
        enable_rag = request.form.get('enable_rag', 'true').lower() == 'true'
        if enable_rag and extraction_result['text']:
            try:
                from services.chunking_service import chunk_document
                from services.embedding_service import generate_embeddings_batch
                from services.pinecone_service import store_chunks
                
                # Generate document ID if not saved to DB
                if not document_id:
                    import uuid
                    document_id = str(uuid.uuid4())
                
                # Chunk the document
                chunks = chunk_document(
                    text=extraction_result['text'],
                    metadata={
                        'filename': filename,
                        'page_count': extraction_result['page_count'],
                        **extraction_result['metadata']
                    },
                    chunk_size=500,
                    overlap=50
                )
                
                # Check embedding configuration
                from services.pinecone_service import pinecone_service
                use_pinecone_embeddings = pinecone_service.use_pinecone_embeddings
                index_dimension = pinecone_service.dimension
                
                # Generate embeddings for chunks
                chunk_texts = [chunk['text'] for chunk in chunks]
                
                if use_pinecone_embeddings and index_dimension == 1024:
                    # Use Pinecone Inference API to generate 1024-dim embeddings
                    try:
                        from services.pinecone_embedding_service import generate_pinecone_embeddings_batch
                        print("[INFO] Using Pinecone Inference API for embeddings (1024 dimensions)")
                        embeddings = generate_pinecone_embeddings_batch(chunk_texts)
                    except Exception as e:
                        print(f"[WARN] Pinecone Inference API failed: {e}")
                        print(f"[WARN] Error details: {str(e)}")
                        raise ValueError(f"Failed to generate Pinecone embeddings: {str(e)}")
                else:
                    # Use Google embeddings (768 dimensions) - default
                    print(f"[INFO] Using Google text-embedding-004 for embeddings ({index_dimension} dimensions)")
                    embeddings = generate_embeddings_batch(chunk_texts)
                
                # Validate embeddings match chunks
                if len(embeddings) != len(chunks):
                    print(f"[ERROR] Embedding count mismatch: {len(embeddings)} embeddings for {len(chunks)} chunks")
                    raise ValueError(f"Failed to generate embeddings: got {len(embeddings)} embeddings for {len(chunks)} chunks")
                
                # Store in Pinecone (will use integrated embeddings if enabled)
                rag_result = store_chunks(
                    document_id=document_id,
                    chunks=chunks,
                    embeddings=embeddings  # None if using integrated embeddings
                )
                
                response_data['rag'] = {
                    'enabled': True,
                    'document_id': document_id,
                    'chunks_created': len(chunks),
                    'vectors_stored': rag_result.get('vectors_stored', 0) if rag_result.get('success') else 0,
                    'success': rag_result.get('success', False)
                }
                
            except Exception as e:
                print(f"[WARNING] RAG processing failed: {e}")
                response_data['rag'] = {
                    'enabled': True,
                    'error': str(e),
                    'success': False
                }
        
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
            error_message = metadata_result.get('error', 'Failed to extract metadata')
            is_limit_error = any(keyword in error_message.lower() for keyword in ['exceeds', 'limit', 'maximum', 'beta'])
            status_code = 400 if is_limit_error else 500
            
            return jsonify({
                'status': 'error',
                'message': error_message,
                'error_type': 'limit_exceeded' if is_limit_error else 'processing_error'
            }), status_code
        
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
            error_message = extraction.get('error', 'Failed to extract PDF')
            is_limit_error = any(keyword in error_message.lower() for keyword in ['exceeds', 'limit', 'maximum', 'beta'])
            status_code = 400 if is_limit_error else 500
            
            return jsonify({
                'status': 'error',
                'message': error_message,
                'error_type': 'limit_exceeded' if is_limit_error else 'processing_error'
            }), status_code
        
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

