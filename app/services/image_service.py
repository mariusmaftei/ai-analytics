"""
Image Service - Handle image analysis using Gemini Vision
"""
import io
import json
from PIL import Image
from config.gemini import get_gemini_model
from utils.text_cleaner import clean_ocr_text


def _load_image_from_bytes(image_bytes):
    return Image.open(io.BytesIO(image_bytes))


def _should_retry_ocr(text):
    normalized = (text or "").strip()
    if not normalized:
        return True
    if normalized.upper() == "[NO_TEXT]":
        return False
    words = normalized.split()
    return len(words) == 1 and len(normalized) <= 12


def _run_ocr_attempt(model, prompt_text, image_bytes):
    image = _load_image_from_bytes(image_bytes)
    response = model.generate_content([prompt_text, image])
    return response.text or ""


def _extract_ocr_text(model, image_bytes, prompt_text):
    raw_text = _run_ocr_attempt(model, prompt_text, image_bytes)
    raw_normalized = (raw_text or "").strip()
    cleaned_text = clean_ocr_text(raw_text)
    evaluation_text = cleaned_text or raw_normalized

    if _should_retry_ocr(evaluation_text):
        retry_prompt = (
            f"{prompt_text}\n\n"
            "IMPORTANT: Your previous attempt returned only "
            f"'{evaluation_text or '[empty]'}'. This is incomplete. "
            "Carefully inspect the entire image again and transcribe every single word "
            "in the correct order without stopping early."
        )
        retry_raw = _run_ocr_attempt(model, retry_prompt, image_bytes)
        retry_cleaned = clean_ocr_text(retry_raw)
        if retry_cleaned:
            raw_text = retry_raw
            cleaned_text = retry_cleaned
        elif retry_raw.strip():
            raw_text = retry_raw

    final_raw = (raw_text or "").strip()
    final_cleaned = clean_ocr_text(final_raw)
    return final_raw, (final_cleaned or "").strip()


def _derive_text_context_insights(model, image_bytes):
    prompt = """You are an OCR context analyst.
Describe WHERE the main text appears, HOW it looks, and WHAT surface it is on.
Return ONLY a compact JSON object with these keys:
{
  "position": "...",
  "font_style": "...",
  "source_surface": "...",
  "text_clarity": "..."
}
Use null for any field you cannot determine."""

    context = {}

    try:
        response = model.generate_content(
            [prompt, _load_image_from_bytes(image_bytes)]
        )
        raw_text = (response.text or "").strip()
        normalized = raw_text
        if normalized.startswith("```"):
            normalized = normalized.strip("`")
            normalized = normalized.replace("json", "", 1).strip()
        brace_start = normalized.find("{")
        brace_end = normalized.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            normalized = normalized[brace_start : brace_end + 1]
        context = json.loads(normalized)
    except Exception:
        context = {}

    return {
        "position": context.get("position"),
        "font_style": context.get("font_style"),
        "source_surface": context.get("source_surface"),
        "text_clarity": context.get("text_clarity"),
    }


def _parse_json_response(text):
    """Parse JSON from text response, handling markdown code fences and extra text."""
    if not text:
        return None
    
    normalized = text.strip()
    
    # Remove markdown code fences
    if normalized.startswith("```"):
        normalized = normalized.strip("`")
        if normalized.startswith("json"):
            normalized = normalized[4:].strip()
        elif normalized.startswith("JSON"):
            normalized = normalized[4:].strip()
    
    # Find JSON array or object
    bracket_start = normalized.find("[")
    bracket_end = normalized.rfind("]")
    brace_start = normalized.find("{")
    brace_end = normalized.rfind("}")
    
    if bracket_start != -1 and bracket_end != -1 and bracket_end > bracket_start:
        normalized = normalized[bracket_start : bracket_end + 1]
    elif brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        normalized = normalized[brace_start : brace_end + 1]
    
    try:
        return json.loads(normalized)
    except Exception as e:
        print(f"[JSON Parse Error] {str(e)}, text: {normalized[:200]}")
        return None

def _parse_general_analysis_response(text):
    """Parse general analysis response and extract structured data."""
    if not text:
        return None, None
    
    # Try to extract JSON from the response
    structured_data = _parse_json_response(text)
    
    # Also extract from text format as fallback
    key_attributes = {}
    summary = None
    
    if structured_data and isinstance(structured_data, dict):
        # Use JSON data if available
        if "keyAttributes" in structured_data:
            key_attributes = structured_data["keyAttributes"]
        if "summary" in structured_data:
            summary = structured_data["summary"]
    else:
        # Fallback: parse from text format
        lines = text.split('\n')
        in_key_attributes = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for summary
            if line.lower().startswith('summary:'):
                summary = line.split(':', 1)[1].strip() if ':' in line else None
                continue
            
            # Check for Key Attributes section
            if 'key attributes' in line.lower() or 'section: key attributes' in line.lower():
                in_key_attributes = True
                continue
            
            if in_key_attributes and ':' in line:
                # Parse field: value pairs
                parts = line.split(':', 1)
                if len(parts) == 2:
                    field = parts[0].strip().lower()
                    value = parts[1].strip()
                    
                    # Map field names to structured format
                    if 'image type' in field:
                        key_attributes['imageType'] = value
                    elif 'main subject' in field:
                        key_attributes['mainSubject'] = value
                    elif 'dominant color' in field:
                        key_attributes['dominantColors'] = value
                    elif 'layout structure' in field or 'layout' in field:
                        key_attributes['layoutStructure'] = value
                    elif 'overall mood' in field or 'mood' in field:
                        key_attributes['overallMood'] = value
                    elif 'lighting' in field:
                        key_attributes['lighting'] = value
    
    return {
        'summary': summary,
        'keyAttributes': key_attributes
    } if (summary or key_attributes) else None, text

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
        # Reset file position and buffer image bytes for reuse
        image_file.seek(0)
        image_bytes = image_file.read()
        image_file.seek(0)
        
        # Get Gemini model
        model = get_gemini_model()
        
        # Define analysis prompts based on type
        prompts = {
            'general': """You are a visual intelligence assistant. Analyze the image and provide a comprehensive analysis.

Provide your response in this format:

SECTION: General Overview
Summary: <one short paragraph describing the scene, subjects, context, and lighting>

SECTION: Key Attributes
Image Type: <photo, screenshot, illustration, document, etc.>
Main Subject: <primary person/object/focus>
Dominant Colors: <comma-separated palette>
Layout Structure: <composition or positioning>
Overall Mood: <emotional tone or atmosphere>
Lighting: <natural, artificial, soft, harsh, etc.>

Then provide a JSON object with this exact structure:
{
  "summary": "<overview text>",
  "keyAttributes": {
    "imageType": "<photo, screenshot, illustration, etc.>",
    "mainSubject": "<primary focus>",
    "dominantColors": "<comma-separated colors>",
    "layoutStructure": "<composition description>",
    "overallMood": "<emotional tone>",
    "lighting": "<lighting description>"
  }
}

CRITICAL REQUIREMENTS:
1. Provide the text sections first (for readability)
2. Then provide the JSON object with ALL 6 keyAttributes fields
3. Do not skip any fields - if unsure, provide your best estimate
4. Keep values concise but descriptive (typically 1-5 words)
5. The JSON must be valid and parseable
6. Field names in JSON must match exactly: imageType, mainSubject, dominantColors, layoutStructure, overallMood, lighting""",
            
            'detailed': """Provide a comprehensive analysis of this image including:
1. Detailed visual description
2. All objects, people, animals, or items visible
3. Text content (OCR) if any
4. Colors, lighting, and composition
5. Scene context and setting
6. Any notable patterns, symbols, or details
7. Potential use case or category""",
            
            'ocr': """You are an OCR extraction engine.
Return ONLY the literal text that appears in the image exactly as written.

Formatting rules:
- Output each distinct line of text exactly as it appears in the image.
- Keep the original word order and spacing for each line. If a line contains multiple words, include them all on the same line.
- Preserve punctuation and capitalization.
- Do NOT add introductions, summaries, labels, numbering, or extra commentary.
- Do NOT describe fonts, colors, locations, or confidence.
- If absolutely no text is visible, output the single token [NO_TEXT].

Example output (for an image whose sign says "Looking for a friend."):
Looking for a friend.""",
            
            'objects': """You are an object detection system. Return ONLY a JSON array of detected objects. No explanations, no markdown.

Return format (valid JSON array only):
[
  {"name": "object_name", "confidence": 0.XX, "color": "color_name", "size": "small|medium|large", "x": XXX, "y": YYY, "w": WWW, "h": HHH},
  ...
]

CRITICAL COORDINATE REQUIREMENTS:
- x = horizontal position from LEFT edge of image (0 = leftmost pixel)
- y = vertical position from TOP edge of image (0 = topmost pixel)  
- w = width of bounding box in pixels
- h = height of bounding box in pixels
- Coordinates must be EXACT pixel positions where the object appears in the image
- The bounding box (x, y, w, h) should tightly enclose the entire object
- Be precise: carefully measure where each object starts and ends
- Maximum 15 most prominent objects (prioritize by visibility and importance)
- Each object must have: name, confidence (0.0-1.0), color, size, x, y, w, h
- Return ONLY the JSON array, nothing else""",
            
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
        
        analysis_text = ""
        cleaned_text = None

        text_context = None

        if analysis_type == 'ocr':
            analysis_text, cleaned_text = _extract_ocr_text(model, image_bytes, prompt)
            text_context = _derive_text_context_insights(model, image_bytes)
        else:
            image_obj = _load_image_from_bytes(image_bytes)
            if analysis_type == 'objects':
                width, height = image_obj.size
                enhanced_prompt = f"{prompt}\n\nImage dimensions: {width} x {height} pixels.\n\nIMPORTANT: Use these exact dimensions for coordinates:\n- x can be from 0 to {width-1}\n- y can be from 0 to {height-1}\n- w and h must be positive and x+w <= {width}, y+h <= {height}\n- Measure coordinates carefully from the actual image pixels."
                response = model.generate_content([enhanced_prompt, image_obj])
                raw_response = response.text or ""
                print(f"[ObjectDetection] Raw response length: {len(raw_response)}")
                print(f"[ObjectDetection] Image size: {width}x{height}")
                
                # Parse JSON response
                objects_data = _parse_json_response(raw_response)
                if objects_data and isinstance(objects_data, list):
                    # Validate and log coordinates
                    for obj in objects_data:
                        if 'x' in obj and 'y' in obj and 'w' in obj and 'h' in obj:
                            print(f"[ObjectDetection] {obj.get('name', 'unknown')}: x={obj['x']}, y={obj['y']}, w={obj['w']}, h={obj['h']} (image: {width}x{height})")
                    analysis_text = json.dumps(objects_data)
                    print(f"[ObjectDetection] Parsed {len(objects_data)} objects")
                else:
                    # Fallback to raw text if JSON parsing fails
                    analysis_text = raw_response
                    print(f"[ObjectDetection] JSON parse failed, using raw text")
            elif analysis_type == 'general':
                response = model.generate_content([prompt, image_obj])
                raw_response = response.text or ""
                analysis_text = raw_response
                
                # Parse structured data from general analysis
                structured_data, _ = _parse_general_analysis_response(raw_response)
                if structured_data:
                    # Store structured data in a separate field
                    analysis_text = json.dumps({
                        'text': raw_response,
                        'structured': structured_data
                    })
                    print(f"[GeneralAnalysis] Parsed structured data: {structured_data}")
            else:
                response = model.generate_content([prompt, image_obj])
                analysis_text = response.text or ""

        result = {
            'success': True,
            'analysis': analysis_text,
            'analysis_type': analysis_type,
            'cleaned_analysis': cleaned_text,
            'text_context': text_context
        }
        
        # For general analysis, parse and include structured data
        if analysis_type == 'general':
            # If analysis_text is already JSON with structured data, extract it
            try:
                parsed = json.loads(analysis_text)
                if isinstance(parsed, dict) and 'structured' in parsed:
                    result['structured_data'] = parsed['structured']
                    result['analysis'] = parsed.get('text', analysis_text)  # Keep text for display
                else:
                    # Try parsing from raw text
                    structured_data, _ = _parse_general_analysis_response(analysis_text)
                    if structured_data:
                        result['structured_data'] = structured_data
            except (json.JSONDecodeError, TypeError):
                # Not JSON, try parsing from text
                structured_data, _ = _parse_general_analysis_response(analysis_text)
                if structured_data:
                    result['structured_data'] = structured_data
        
        return result
        
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
        # Reset file position and buffer bytes for reuse
        image_file.seek(0)
        image_bytes = image_file.read()
        image_file.seek(0)
        
        # Get Gemini model
        model = get_gemini_model()
        
        # Define prompts (same as analyze_image_with_ai)
        prompts = {
            'general': """You are a visual intelligence assistant. Analyze the image and provide a comprehensive analysis.

Provide your response in this format:

SECTION: General Overview
Summary: <one short paragraph describing the scene, subjects, context, and lighting>

SECTION: Key Attributes
Image Type: <photo, screenshot, illustration, document, etc.>
Main Subject: <primary person/object/focus>
Dominant Colors: <comma-separated palette>
Layout Structure: <composition or positioning>
Overall Mood: <emotional tone or atmosphere>
Lighting: <natural, artificial, soft, harsh, etc.>

Then provide a JSON object with this exact structure:
{
  "summary": "<overview text>",
  "keyAttributes": {
    "imageType": "<photo, screenshot, illustration, etc.>",
    "mainSubject": "<primary focus>",
    "dominantColors": "<comma-separated colors>",
    "layoutStructure": "<composition description>",
    "overallMood": "<emotional tone>",
    "lighting": "<lighting description>"
  }
}

CRITICAL REQUIREMENTS:
1. Provide the text sections first (for readability)
2. Then provide the JSON object with ALL 6 keyAttributes fields
3. Do not skip any fields - if unsure, provide your best estimate
4. Keep values concise but descriptive (typically 1-5 words)
5. The JSON must be valid and parseable
6. Field names in JSON must match exactly: imageType, mainSubject, dominantColors, layoutStructure, overallMood, lighting""",
            
            'detailed': """Provide a comprehensive analysis of this image including:
1. Detailed visual description
2. All objects, people, animals, or items visible
3. Text content (OCR) if any
4. Colors, lighting, and composition
5. Scene context and setting
6. Any notable patterns, symbols, or details
7. Potential use case or category""",
            
            'ocr': """You are an OCR extraction engine.
Return ONLY the literal text that appears in the image exactly as written.
Formatting rules:
- Output each distinct line of text on its own line.
- Preserve punctuation that appears in the image.
- Do NOT add introductions, summaries, labels, numbering, or extra commentary.
- Do NOT describe fonts, colors, or locations.
- If absolutely no text is visible, output the single token [NO_TEXT].
Example output (for an image with two lines):
First line of text
Second line here""",
            
            'objects': """You are an object detection system. Return ONLY a JSON array of detected objects. No explanations, no markdown.

Return format (valid JSON array only):
[
  {"name": "object_name", "confidence": 0.XX, "color": "color_name", "size": "small|medium|large", "x": XXX, "y": YYY, "w": WWW, "h": HHH},
  ...
]

CRITICAL COORDINATE REQUIREMENTS:
- x = horizontal position from LEFT edge of image (0 = leftmost pixel)
- y = vertical position from TOP edge of image (0 = topmost pixel)  
- w = width of bounding box in pixels
- h = height of bounding box in pixels
- Coordinates must be EXACT pixel positions where the object appears in the image
- The bounding box (x, y, w, h) should tightly enclose the entire object
- Be precise: carefully measure where each object starts and ends
- Maximum 15 most prominent objects (prioritize by visibility and importance)
- Each object must have: name, confidence (0.0-1.0), color, size, x, y, w, h
- Return ONLY the JSON array, nothing else""",
            
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
        
        if analysis_type == 'ocr':
            raw_text, cleaned_text = _extract_ocr_text(model, image_bytes, prompt)
            context = _derive_text_context_insights(model, image_bytes)
            print(f"[OCR] Raw text length: {len(raw_text or '')}, Content: {repr(raw_text[:200] if raw_text else '')}")
            print(f"[OCR] Cleaned text length: {len(cleaned_text or '')}, Content: {repr(cleaned_text[:200] if cleaned_text else '')}")
            yield (cleaned_text or raw_text or "").strip()
            yield f"[RAW_TEXT]{raw_text or ''}"
            yield f"[TEXT_CONTEXT]{json.dumps(context)}"
        else:
            image_obj = _load_image_from_bytes(image_bytes)
            if analysis_type == 'objects':
                width, height = image_obj.size
                enhanced_prompt = f"{prompt}\n\nImage dimensions: {width} x {height} pixels.\n\nIMPORTANT: Use these exact dimensions for coordinates:\n- x can be from 0 to {width-1}\n- y can be from 0 to {height-1}\n- w and h must be positive and x+w <= {width}, y+h <= {height}\n- Measure coordinates carefully from the actual image pixels."
                
                # For objects, collect full response first, then send clean JSON
                full_response = ""
                response = model.generate_content(
                    [enhanced_prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                
                # Parse and send clean JSON
                objects_data = _parse_json_response(full_response)
                if objects_data and isinstance(objects_data, list):
                    # Validate and log coordinates
                    for obj in objects_data:
                        if 'x' in obj and 'y' in obj and 'w' in obj and 'h' in obj:
                            print(f"[ObjectDetection Stream] {obj.get('name', 'unknown')}: x={obj['x']}, y={obj['y']}, w={obj['w']}, h={obj['h']} (image: {width}x{height})")
                    # Send clean JSON as a single chunk (route will wrap in SSE format)
                    json_str = json.dumps(objects_data)
                    yield f"[OBJECTS_JSON]{json_str}"
                else:
                    # Fallback: send raw response
                    yield full_response
            elif analysis_type == 'general':
                # For general analysis, collect full response then parse and send structured data
                full_response = ""
                response = model.generate_content(
                    [prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text  # Also stream the text for real-time display
                
                # After streaming, parse and send structured data
                structured_data, _ = _parse_general_analysis_response(full_response)
                if structured_data:
                    yield f"[GENERAL_JSON]{json.dumps(structured_data)}"
            else:
                response = model.generate_content(
                    [prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                
    except Exception as e:
        yield f"[ERROR] Image analysis failed: {str(e)}"

