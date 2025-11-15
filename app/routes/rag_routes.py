"""
RAG Routes - Endpoints for Retrieval-Augmented Generation
"""

from flask import Blueprint, request, Response, jsonify
from services.rag_service import rag_query, rag_query_sync

rag_bp = Blueprint('rag', __name__)

@rag_bp.route('/api/rag/query', methods=['POST'])
def rag_query_endpoint():
    """RAG query endpoint with streaming"""
    try:
        data = request.json
        user_query = data.get('query') or data.get('message')
        
        if not user_query:
            return jsonify({
                'status': 'error',
                'message': 'Query is required'
            }), 400
        
        document_id = data.get('document_id')
        top_k = data.get('top_k', 5)
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 2048)
        
        def generate():
            try:
                for chunk in rag_query(
                    user_query=user_query,
                    document_id=document_id,
                    top_k=top_k,
                    temperature=temperature,
                    max_tokens=max_tokens
                ):
                    yield f"data: {chunk}\n\n"
            except Exception as e:
                yield f"data: [ERROR] {str(e)}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@rag_bp.route('/api/rag/query-sync', methods=['POST'])
def rag_query_sync_endpoint():
    """RAG query endpoint without streaming"""
    try:
        data = request.json
        user_query = data.get('query') or data.get('message')
        
        if not user_query:
            return jsonify({
                'status': 'error',
                'message': 'Query is required'
            }), 400
        
        document_id = data.get('document_id')
        top_k = data.get('top_k', 5)
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 2048)
        
        answer = rag_query_sync(
            user_query=user_query,
            document_id=document_id,
            top_k=top_k,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return jsonify({
            'status': 'success',
            'answer': answer
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

