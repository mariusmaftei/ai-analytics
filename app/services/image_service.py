"""
Image Service - Handle image analysis using Gemini Vision
"""
import io
from PIL import Image
from config.gemini import get_gemini_model

def get_image_metadata(image_file):
    """
    Extract metadata from image file
    Args:
        image_file: File-like object (from Flask request.files)
    Returns:
        dict: Image metadata (dimensions, format, size, etc.)
    """
    try:
        # Read image file
        image_file.seek(0)
        image = Image.open(image_file)
        
        # Get image info
        width, height = image.size
        format_name = image.format or 'Unknown'
        mode = image.mode
        
        # Get file size
        image_file.seek(0, 2)  # Seek to end
        file_size = image_file.tell()
        image_file.seek(0)  # Reset to beginning
        
        return {
            'success': True,
            'width': width,
            'height': height,
            'format': format_name,
            'mode': mode,
            'file_size': file_size,
            'aspect_ratio': round(width / height, 2) if height > 0 else 0
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def analyze_image_with_ai(image_file, analysis_type='general', prompt_override=None):
    """
    Analyze image using Gemini Vision API
    Args:
        image_file: File-like object (from Flask request.files)
        analysis_type: Type of analysis (general, detailed, ocr, objects, scene)
        prompt_override: Custom prompt to override default analysis prompts
    Returns:
        dict: Analysis results
    """
    try:
        # Reset file position
        image_file.seek(0)
        
        # Read image data
        image_bytes = image_file.read()
        image_file.seek(0)
        
        # Get Gemini model
        model = get_gemini_model()
        
        # Define analysis prompts based on type
        prompts = {
            'general': """Analyze this image and provide:
1. A detailed description of what you see
2. Main objects, people, or elements present
3. Colors, composition, and visual style
4. Any text visible in the image
5. Overall context and setting""",
            
            'detailed': """Provide a comprehensive analysis of this image including:
1. Detailed visual description
2. All objects, people, animals, or items visible
3. Text content (OCR) if any
4. Colors, lighting, and composition
5. Scene context and setting
6. Any notable patterns, symbols, or details
7. Potential use case or category""",
            
            'ocr': """Extract all text from this image. List:
1. All visible text content
2. Text locations (if possible)
3. Font styles or sizes (if identifiable)
4. Any handwritten text
5. Numbers, dates, or codes present""",
            
            'objects': """Identify and list all objects in this image:
1. List all objects, people, animals, or items
2. Their approximate locations (left, right, center, etc.)
3. Any text or labels visible
4. Count of similar items
5. Relationships between objects""",
            
            'scene': """Analyze the scene in this image:
1. What type of scene is this? (indoor/outdoor, nature/urban, etc.)
2. Time of day or lighting conditions
3. Weather or environmental conditions
4. Mood or atmosphere
5. Activities or actions taking place
6. Geographic or cultural context (if identifiable)""",
            
            'chart': """Analyze this chart, graph, or diagram:
1. Type of chart/graph (bar, line, pie, etc.)
2. Data being presented
3. Key values and trends
4. Labels and axes
5. Insights or conclusions from the data
6. Any annotations or notes""",
            
            'document': """Analyze this document image:
1. Document type (form, letter, invoice, etc.)
2. All text content
3. Structure and layout
4. Key information (dates, names, numbers)
5. Fields or sections present
6. Any signatures or stamps"""
        }
        
        # Use custom prompt or default based on analysis type
        prompt = prompt_override or prompts.get(analysis_type, prompts['general'])
        
        # Prepare image for Gemini
        # Gemini accepts PIL Image or bytes
        image_file.seek(0)
        pil_image = Image.open(image_file)
        
        # Generate analysis
        response = model.generate_content([prompt, pil_image])
        
        return {
            'success': True,
            'analysis': response.text,
            'analysis_type': analysis_type
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def analyze_image_stream(image_file, analysis_type='general', prompt_override=None):
    """
    Analyze image with streaming response
    Args:
        image_file: File-like object
        analysis_type: Type of analysis
        prompt_override: Custom prompt
    Yields:
        str: Analysis text chunks
    """
    try:
        # Reset file position
        image_file.seek(0)
        
        # Get Gemini model
        model = get_gemini_model()
        
        # Define prompts (same as analyze_image_with_ai)
        prompts = {
            'general': """Analyze this image and provide:
1. A detailed description of what you see
2. Main objects, people, or elements present
3. Colors, composition, and visual style
4. Any text visible in the image
5. Overall context and setting""",
            
            'detailed': """Provide a comprehensive analysis of this image including:
1. Detailed visual description
2. All objects, people, animals, or items visible
3. Text content (OCR) if any
4. Colors, lighting, and composition
5. Scene context and setting
6. Any notable patterns, symbols, or details
7. Potential use case or category""",
            
            'ocr': """Extract all text from this image. List:
1. All visible text content
2. Text locations (if possible)
3. Font styles or sizes (if identifiable)
4. Any handwritten text
5. Numbers, dates, or codes present""",
            
            'objects': """Identify and list all objects in this image:
1. List all objects, people, animals, or items
2. Their approximate locations (left, right, center, etc.)
3. Any text or labels visible
4. Count of similar items
5. Relationships between objects""",
            
            'scene': """Analyze the scene in this image:
1. What type of scene is this? (indoor/outdoor, nature/urban, etc.)
2. Time of day or lighting conditions
3. Weather or environmental conditions
4. Mood or atmosphere
5. Activities or actions taking place
6. Geographic or cultural context (if identifiable)""",
            
            'chart': """Analyze this chart, graph, or diagram:
1. Type of chart/graph (bar, line, pie, etc.)
2. Data being presented
3. Key values and trends
4. Labels and axes
5. Insights or conclusions from the data
6. Any annotations or notes""",
            
            'document': """Analyze this document image:
1. Document type (form, letter, invoice, etc.)
2. All text content
3. Structure and layout
4. Key information (dates, names, numbers)
5. Fields or sections present
6. Any signatures or stamps"""
        }
        
        prompt = prompt_override or prompts.get(analysis_type, prompts['general'])
        
        # Prepare image
        image_file.seek(0)
        pil_image = Image.open(image_file)
        
        # Stream response
        response = model.generate_content(
            [prompt, pil_image],
            stream=True
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text
                
    except Exception as e:
        yield f"[ERROR] Image analysis failed: {str(e)}"

