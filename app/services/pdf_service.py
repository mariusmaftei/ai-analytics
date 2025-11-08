"""
PDF Processing Service
Uses PyMuPDF (fitz) - faster and more reliable than PyPDF2
"""
import fitz  # PyMuPDF
import io
from datetime import datetime

def extract_text_from_pdf(file_stream):
    """
    Extract text from PDF file
    
    Args:
        file_stream: File stream from Flask request.files
        
    Returns:
        dict: {
            'text': str,
            'page_count': int,
            'metadata': dict,
            'success': bool,
            'error': str (if failed)
        }
    """
    try:
        # Read file into memory
        pdf_bytes = file_stream.read()
        
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Extract text from all pages
        text_content = []
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text = page.get_text()
            
            # Clean the text
            cleaned_text = text.strip()
            if cleaned_text:
                text_content.append({
                    'page': page_num + 1,
                    'text': cleaned_text
                })
        
        # Get metadata
        metadata = pdf_document.metadata
        
        # Combine all text
        full_text = "\n\n".join([item['text'] for item in text_content])
        
        # Close document
        pdf_document.close()
        
        return {
            'success': True,
            'text': full_text,
            'page_count': len(text_content),
            'pages': text_content,  # Detailed page-by-page text
            'metadata': {
                'title': metadata.get('title', 'Unknown'),
                'author': metadata.get('author', 'Unknown'),
                'subject': metadata.get('subject', ''),
                'creator': metadata.get('creator', ''),
                'producer': metadata.get('producer', ''),
                'creation_date': metadata.get('creationDate', ''),
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'page_count': 0
        }


def extract_pdf_metadata(file_stream):
    """
    Extract only metadata from PDF (faster than full text extraction)
    
    Args:
        file_stream: File stream from Flask request.files
        
    Returns:
        dict: PDF metadata
    """
    try:
        pdf_bytes = file_stream.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        metadata = {
            'page_count': pdf_document.page_count,
            'title': pdf_document.metadata.get('title', 'Unknown'),
            'author': pdf_document.metadata.get('author', 'Unknown'),
            'subject': pdf_document.metadata.get('subject', ''),
            'file_size': len(pdf_bytes),
            'extracted_at': datetime.now().isoformat()
        }
        
        pdf_document.close()
        return {'success': True, 'metadata': metadata}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}


def analyze_pdf_with_ai(pdf_text, analysis_type='summary'):
    """
    Analyze PDF text using Gemini AI
    
    Args:
        pdf_text: Extracted PDF text
        analysis_type: 'summary', 'keywords', 'insights'
        
    Returns:
        str: AI analysis result
    """
    from config import analyze_content
    
    # Use the existing Gemini integration
    return analyze_content(pdf_text, analysis_type)

