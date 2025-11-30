"""
PDF Processing Service
Uses PyMuPDF (fitz) - faster and more reliable than PyPDF2
"""
import fitz  # PyMuPDF
import io
from datetime import datetime

def _get_page_size(pdf_document):
    """Get page size from the first page"""
    try:
        if pdf_document.page_count > 0:
            page = pdf_document[0]
            rect = page.rect
            width = rect.width
            height = rect.height
            
            # Convert to points and determine standard size
            # Common sizes in points: A4 = 595x842, Letter = 612x792
            if abs(width - 595) < 10 and abs(height - 842) < 10:
                return "A4"
            elif abs(width - 842) < 10 and abs(height - 595) < 10:
                return "A4 (Landscape)"
            elif abs(width - 612) < 10 and abs(height - 792) < 10:
                return "Letter"
            elif abs(width - 792) < 10 and abs(height - 612) < 10:
                return "Letter (Landscape)"
            else:
                return f"{width:.0f} x {height:.0f} pt"
    except:
        pass
    return "Unknown"

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
        
        # Count paragraphs (split by double newlines or single newline after sentence)
        paragraphs = [p.strip() for p in full_text.split('\n\n') if p.strip()]
        if len(paragraphs) == 0:
            paragraphs = [p.strip() for p in full_text.split('\n') if p.strip()]
        paragraph_count = len(paragraphs)
        
        # Count images across all pages (before closing document)
        # Use get_images() with full=True to get all image references
        # Count unique images by xref to avoid counting the same image multiple times
        image_count = 0
        image_xrefs = set()  # Track unique images by xref to avoid duplicates
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            try:
                # Get all images (full=True includes images in XObjects and other embedded resources)
                image_list = page.get_images(full=True)
                for img in image_list:
                    xref = img[0]  # xref is the first element in the tuple
                    if xref not in image_xrefs:
                        image_xrefs.add(xref)
                        image_count += 1
            except Exception as e:
                # Fallback to basic get_images() if full=True fails
                try:
                    image_list = page.get_images()
                    for img in image_list:
                        xref = img[0]
                        if xref not in image_xrefs:
                            image_xrefs.add(xref)
                            image_count += 1
                except:
                    pass
        
        # Detect sections (headers/titles - lines that are short and often capitalized)
        sections = []
        lines = full_text.split('\n')
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            # Simple heuristic: short lines that might be section headers
            if (len(line_stripped) > 5 and len(line_stripped) < 100 and 
                (line_stripped[0].isupper() or line_stripped.isupper()) and
                not line_stripped.endswith('.') and
                not line_stripped.endswith(',') and
                i < len(lines) - 1 and len(lines[i+1].strip()) > 50):
                sections.append(line_stripped)
        
        # Remove duplicates while preserving order
        unique_sections = []
        seen = set()
        for section in sections:
            section_lower = section.lower()
            if section_lower not in seen:
                seen.add(section_lower)
                unique_sections.append(section)
        
        section_count = len(unique_sections)
        
        # Simple language detection (basic - can be enhanced)
        # Check for common English words
        common_english_words = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
        text_lower = full_text.lower()
        english_word_count = sum(1 for word in common_english_words if word in text_lower)
        detected_language = 'English' if english_word_count >= 3 else 'Unknown'
        
        # Close document
        pdf_document.close()
        
        return {
            'success': True,
            'text': full_text,
            'page_count': len(text_content),
            'pages': text_content,  # Detailed page-by-page text
            'paragraph_count': paragraph_count,
            'image_count': image_count,
            'section_count': section_count,
            'sections': unique_sections[:20],  # Limit to first 20 sections
            'detected_language': detected_language,
            'metadata': {
                'title': metadata.get('title', 'Unknown'),
                'author': metadata.get('author', 'Unknown'),
                'subject': metadata.get('subject', ''),
                'creator': metadata.get('creator', ''),
                'producer': metadata.get('producer', ''),
                'creation_date': metadata.get('creationDate', ''),
                'modification_date': metadata.get('modDate', ''),
                'keywords': metadata.get('keywords', ''),
                'pdf_version': f"{pdf_document.pdf_version() / 10.0:.1f}" if hasattr(pdf_document, 'pdf_version') else 'Unknown',
                'page_size': _get_page_size(pdf_document),
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


def extract_tables_from_pdf(file_stream):
    """
    Extract tables from PDF file using PyMuPDF and AI detection
    
    Args:
        file_stream: File stream from Flask request.files
        
    Returns:
        dict: {
            'tables': list of tables,
            'has_tables': bool,
            'success': bool,
            'error': str (if failed)
        }
    """
    try:
        # Read file into memory
        pdf_bytes = file_stream.read()
        file_stream.seek(0)  # Reset stream position
        
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        all_tables = []
        
        # Try to extract tables using PyMuPDF's find_tables method
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            
            # Try to find tables using find_tables (available in newer PyMuPDF versions)
            try:
                tables = page.find_tables()
                for table in tables:
                    try:
                        # Extract table data
                        table_data = table.extract()
                        if table_data and len(table_data) > 1:  # At least header + 1 row
                            all_tables.append({
                                'page': page_num + 1,
                                'data': table_data,
                                'rows': len(table_data),
                                'columns': len(table_data[0]) if table_data else 0
                            })
                    except Exception as e:
                        continue
            except AttributeError:
                # find_tables not available, will use AI detection instead
                pass
        
        pdf_document.close()
        
        # If no tables found with PyMuPDF, use AI to detect tables from text
        if not all_tables:
            extraction_result = extract_text_from_pdf(file_stream)
            if extraction_result['success'] and extraction_result['text']:
                tables_from_ai = detect_tables_with_ai(extraction_result['text'])
                if tables_from_ai:
                    all_tables = tables_from_ai
        
        return {
            'success': True,
            'tables': all_tables,
            'has_tables': len(all_tables) > 0,
            'table_count': len(all_tables)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'tables': [],
            'has_tables': False
        }


def detect_tables_with_ai(pdf_text):
    """
    Use AI to detect and extract tables from PDF text
    
    Args:
        pdf_text: Extracted PDF text
        
    Returns:
        list: List of detected tables
    """
    try:
        from config.gemini import generate_text
        
        # Create prompt for AI to detect and extract tables
        prompt = f"""Analyze the following PDF text and extract ALL tables you find.

For each table found, format it as a JSON array of arrays where:
- First array contains column headers
- Subsequent arrays contain data rows
- Use empty strings for missing cells

If you find tables, return ONLY valid JSON in this format:
{{
  "tables": [
    {{
      "page": 1,
      "headers": ["Column1", "Column2", "Column3"],
      "rows": [
        ["Value1", "Value2", "Value3"],
        ["Value4", "Value5", "Value6"]
      ]
    }}
  ]
}}

If no tables are found, return: {{"tables": []}}

PDF Text:
{pdf_text[:10000]}  # Limit to first 10000 chars to avoid token limits
"""
        
        ai_response = generate_text(prompt, temperature=0.3)
        
        # Try to parse JSON from AI response
        import json
        import re
        
        # First, try to find JSON object in the response
        # Look for JSON object that contains "tables" key
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"tables"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        json_match = re.search(json_pattern, ai_response, re.DOTALL)
        
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                tables = []
                for table in parsed.get('tables', []):
                    # Convert to our format
                    table_data = []
                    if table.get('headers'):
                        table_data.append(table['headers'])
                    if table.get('rows'):
                        table_data.extend(table['rows'])
                    
                    if table_data:
                        tables.append({
                            'page': table.get('page', 1),
                            'data': table_data,
                            'rows': len(table_data),
                            'columns': len(table_data[0]) if table_data else 0
                        })
                return tables
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract tables manually
                pass
        
        # Fallback: Try to parse the entire response as JSON
        try:
            parsed = json.loads(ai_response.strip())
            if 'tables' in parsed:
                tables = []
                for table in parsed.get('tables', []):
                    table_data = []
                    if table.get('headers'):
                        table_data.append(table['headers'])
                    if table.get('rows'):
                        table_data.extend(table['rows'])
                    
                    if table_data:
                        tables.append({
                            'page': table.get('page', 1),
                            'data': table_data,
                            'rows': len(table_data),
                            'columns': len(table_data[0]) if table_data else 0
                        })
                return tables
        except json.JSONDecodeError:
            pass
        
        return []
        
    except Exception as e:
        print(f"AI table detection error: {e}")
        return []


def analyze_pdf_with_ai(pdf_text, analysis_type='summary'):
    """
    Analyze PDF text using Gemini AI
    
    Args:
        pdf_text: Extracted PDF text
        analysis_type: 'summary', 'keywords', 'insights', 'table_extraction'
        
    Returns:
        str: AI analysis result
    """
    from config import analyze_content
    
    # Use the existing Gemini integration
    return analyze_content(pdf_text, analysis_type)

