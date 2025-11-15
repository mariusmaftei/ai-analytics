"""
Database Service - Handle PDF data storage
"""
from datetime import datetime
from config import get_collection

def save_pdf_data(pdf_data):
    """
    Save PDF extraction data to MongoDB
    
    Args:
        pdf_data: dict with filename, text, metadata, etc.
        
    Returns:
        dict: {'success': bool, 'id': str, 'error': str}
    """
    try:
        # Get PDF collection
        pdf_collection = get_collection('pdfs')
        if pdf_collection is None:
            return {
                'success': False,
                'error': 'Database not connected'
            }
        
        # Prepare document
        document = {
            'filename': pdf_data.get('filename'),
            'text': pdf_data.get('text'),
            'page_count': pdf_data.get('page_count'),
            'metadata': pdf_data.get('metadata', {}),
            'uploaded_at': pdf_data.get('uploaded_at', datetime.now()),
            'character_count': len(pdf_data.get('text', '')),
            'word_count': len(pdf_data.get('text', '').split()),
            'created_at': datetime.now()
        }
        
        # Insert into database
        result = pdf_collection.insert_one(document)
        
        return {
            'success': True,
            'id': result.inserted_id
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_pdf_by_id(pdf_id):
    """Get PDF data by ID"""
    try:
        from bson import ObjectId
        pdf_collection = get_collection('pdfs')
        if pdf_collection is None:
            return {'success': False, 'error': 'Database not connected'}
        
        pdf = pdf_collection.find_one({'_id': ObjectId(pdf_id)})
        
        if pdf:
            pdf['_id'] = str(pdf['_id'])  # Convert ObjectId to string
            return {'success': True, 'data': pdf}
        else:
            return {'success': False, 'error': 'PDF not found'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_all_pdfs(limit=50):
    """Get all PDFs (metadata only, not full text)"""
    try:
        pdf_collection = get_collection('pdfs')
        if pdf_collection is None:
            return {'success': False, 'error': 'Database not connected'}
        
        pdfs = list(pdf_collection.find(
            {},
            {
                'filename': 1,
                'page_count': 1,
                'uploaded_at': 1,
                'word_count': 1,
                'metadata.title': 1,
                'metadata.author': 1
            }
        ).sort('uploaded_at', -1).limit(limit))
        
        # Convert ObjectId to string
        for pdf in pdfs:
            pdf['_id'] = str(pdf['_id'])
        
        return {'success': True, 'data': pdfs, 'count': len(pdfs)}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}


def delete_pdf(pdf_id):
    """Delete PDF by ID"""
    try:
        from bson import ObjectId
        pdf_collection = get_collection('pdfs')
        if pdf_collection is None:
            return {'success': False, 'error': 'Database not connected'}
        
        result = pdf_collection.delete_one({'_id': ObjectId(pdf_id)})
        
        if result.deleted_count > 0:
            return {'success': True, 'message': 'PDF deleted'}
        else:
            return {'success': False, 'error': 'PDF not found'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

