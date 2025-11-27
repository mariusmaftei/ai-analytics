"""
Image Service - Handle image analysis using Gemini Vision
"""
import io
import json
import re
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

def _parse_scene_analysis_response(text):
    """Parse scene analysis response and extract structured data."""
    if not text:
        return None
    
    # Try to extract JSON from the response first
    structured_data = _parse_json_response(text)
    if structured_data and isinstance(structured_data, dict):
        print(f"[SceneAnalysis Parser] Found JSON data: {list(structured_data.keys())}")
        return structured_data
    
    # Parse from text format with SECTION: headers
    result = {
        'sceneSummary': None,
        'environment': {},
        'lighting': {},
        'activity': {},
        'objects': {},
        'interpretation': None,
        'metadata': {},
        'tags': []
    }
    
    current_section = None
    lines = text.split('\n')
    
    print(f"[SceneAnalysis Parser] Parsing {len(lines)} lines of text")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for section headers (more flexible matching)
        if line.upper().startswith('SECTION:'):
            section_name = line[8:].strip()
            # Normalize section name - remove extra whitespace, handle variations
            current_section = section_name.lower().strip()
            # Remove any trailing colons or extra punctuation
            current_section = current_section.rstrip('.:;')
            print(f"[SceneAnalysis Parser] Found section: '{section_name}' (normalized: '{current_section}')")
            continue
        
        # Parse key-value pairs within sections (support :, -, – separators)
        key_value_match = None
        if current_section:
            key_value_match = re.match(r'^([^:\-–]+?)\s*[:\-–]\s*(.+)$', line)
        
        if key_value_match and current_section:
            key = key_value_match.group(1).strip()
            value = key_value_match.group(2).strip()
            
            # Skip empty values
            if not value or value.upper() in ['N/A', 'NONE', 'UNKNOWN']:
                continue
            
            # Normalize current_section for matching
            section_lower = current_section.lower() if current_section else ''
            
            if 'scene summary' in section_lower or 'summary' == section_lower:
                if not result['sceneSummary']:
                    result['sceneSummary'] = value
                else:
                    result['sceneSummary'] += ' ' + value
            elif 'environment' in section_lower or section_lower == 'environment':
                result['environment'][key] = value
                print(f"[SceneAnalysis Parser] Added to environment: {key} = {value}")
            elif 'lighting' in section_lower or 'atmosphere' in section_lower:
                result['lighting'][key] = value
            elif 'activity' in section_lower or 'human context' in section_lower:
                result['activity'][key] = value
            elif 'objects' in section_lower or 'furniture' in section_lower:
                result['objects'][key] = value
            elif 'interpretation' in section_lower:
                if not result['interpretation']:
                    result['interpretation'] = value
                else:
                    result['interpretation'] += ' ' + value
            elif 'metadata' in section_lower:
                result['metadata'][key] = value
            elif 'tags' in section_lower:
                # Tags might be comma-separated
                tags = [t.strip() for t in value.split(',') if t.strip()]
                result['tags'].extend(tags)
        elif current_section:
            # Handle multi-line content (like Scene Summary or Interpretation)
            section_lower = current_section.lower() if current_section else ''
            if 'scene summary' in section_lower or 'summary' == section_lower:
                if not result['sceneSummary']:
                    result['sceneSummary'] = line
                else:
                    result['sceneSummary'] += ' ' + line
            elif 'interpretation' in section_lower:
                if not result['interpretation']:
                    result['interpretation'] = line
                else:
                    result['interpretation'] += ' ' + line
            elif 'tags' in section_lower:
                tags = [t.strip() for t in line.split(',') if t.strip()]
                result['tags'].extend(tags)
    
    # Log what was parsed
    print(f"[SceneAnalysis Parser] Parsed result:")
    print(f"  - sceneSummary: {result['sceneSummary'] is not None}")
    print(f"  - environment: {len(result['environment'])} fields - {list(result['environment'].keys())}")
    print(f"  - lighting: {len(result['lighting'])} fields")
    print(f"  - activity: {len(result['activity'])} fields")
    print(f"  - objects: {len(result['objects'])} fields")
    print(f"  - interpretation: {result['interpretation'] is not None}")
    print(f"  - metadata: {len(result['metadata'])} fields")
    print(f"  - tags: {len(result['tags'])} tags")
    
    # Clean up empty sections
    if not result['sceneSummary']:
        result.pop('sceneSummary')
    if not result['environment']:
        result.pop('environment')
    if not result['lighting']:
        result.pop('lighting')
    if not result['activity']:
        result.pop('activity')
    if not result['objects']:
        result.pop('objects')
    if not result['interpretation']:
        result.pop('interpretation')
    if not result['metadata']:
        result.pop('metadata')
    if not result['tags']:
        result.pop('tags')
    
    final_result = result if any(result.values()) else None
    if final_result:
        print(f"[SceneAnalysis Parser] Returning result with {len(final_result)} sections")
    else:
        print(f"[SceneAnalysis Parser] No valid data found, returning None")
    
    return final_result

def _parse_chart_analysis_response(text):
    """Parse chart analysis response into structured data."""
    if not text:
        return None

    structured_data = _parse_json_response(text)
    if structured_data and isinstance(structured_data, dict):
        print(f"[ChartAnalysis Parser] Found JSON data keys: {list(structured_data.keys())}")
        return structured_data

    result = {
        'summary': None,
        'chartType': {},
        'axes': {},
        'dataPoints': [],
        'insights': [],
        'structure': {},
        'confidence': {}
    }

    current_section = None
    lines = text.split('\n')
    print(f"[ChartAnalysis Parser] Parsing {len(lines)} lines of text")

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        if line.upper().startswith('SECTION:'):
            section_name = line[8:].strip()
            current_section = section_name.lower()
            print(f"[ChartAnalysis Parser] Found section: '{section_name}'")
            continue

        if not current_section:
            continue

        section_lower = current_section.lower()
        key_value_match = re.match(r'^([^:\-–]+?)\s*[:\-–]\s*(.+)$', line)

        if 'chart summary' in section_lower or section_lower == 'summary':
            if result['summary']:
                result['summary'] += ' ' + line
            else:
                result['summary'] = line
            continue

        if 'chart type' in section_lower or 'structure' in section_lower:
            if key_value_match:
                key = key_value_match.group(1).strip()
                value = key_value_match.group(2).strip()
                result['chartType'][key] = value
            else:
                result['chartType'].setdefault('Notes', '')
                result['chartType']['Notes'] = (result['chartType']['Notes'] + ' ' + line).strip()
            continue

        if 'axis' in section_lower or 'axes' in section_lower or 'label' in section_lower:
            if key_value_match:
                key = key_value_match.group(1).strip()
                value = key_value_match.group(2).strip()
                result['axes'][key] = value
            continue

        if 'data' in section_lower or 'point' in section_lower or 'table' in section_lower:
            entry = {}
            segments = [seg.strip() for seg in line.split('|') if seg.strip()]
            if segments:
                for seg in segments:
                    seg_match = re.match(r'^([^:\-–]+?)\s*[:\-–]\s*(.+)$', seg)
                    if seg_match:
                        seg_key = seg_match.group(1).strip()
                        seg_value = seg_match.group(2).strip()
                        entry[seg_key] = seg_value
            elif key_value_match:
                entry[key_value_match.group(1).strip()] = key_value_match.group(2).strip()

            if entry:
                result['dataPoints'].append(entry)
            continue

        if 'insight' in section_lower or 'interpretation' in section_lower:
            insight_text = line.lstrip('-•').strip() if line[0:1] in ('-', '•') else line
            if insight_text:
                result['insights'].append(insight_text)
            continue

        if 'confidence' in section_lower or 'quality' in section_lower:
            if key_value_match:
                key = key_value_match.group(1).strip()
                value = key_value_match.group(2).strip()
                result['confidence'][key] = value
            continue

        if 'structure' in section_lower:
            if key_value_match:
                key = key_value_match.group(1).strip()
                value = key_value_match.group(2).strip()
                result['structure'][key] = value
            else:
                result['structure'].setdefault('Notes', [])
                result['structure']['Notes'].append(line)
            continue

    summary_text = (result.get('summary') or '').lower()
    chart_type_values = ' '.join(result.get('chartType', {}).values()).lower()
    possible_no_chart = [
        'no chart',
        'not a chart',
        'no graph',
        'no diagram',
        'image contains no chart',
        'no chart present'
    ]
    has_chart_data = bool(result.get('dataPoints'))
    chart_present = True

    if any(phrase in summary_text for phrase in possible_no_chart):
        chart_present = False
    elif chart_type_values in ('n/a', 'none', 'not applicable', 'not present', 'unknown'):
        if not has_chart_data:
            chart_present = False

    if not chart_present:
        summary_value = result.get('summary') or "Model reported no chart present in this image."
        print("[ChartAnalysis Parser] Model indicated no chart present.")
        return {'chartPresent': False, 'summary': summary_value}

    # Cleanup
    if not result['summary']:
        result.pop('summary')
    if not result['chartType']:
        result.pop('chartType')
    if not result['axes']:
        result.pop('axes')
    if not result['dataPoints']:
        result.pop('dataPoints')
    if not result['insights']:
        result.pop('insights')
    if not result['structure']:
        result.pop('structure')
    if not result['confidence']:
        result.pop('confidence')

    if not result:
        print("[ChartAnalysis Parser] No structured data parsed")
        return None

    result['chartPresent'] = True
    print(f"[ChartAnalysis Parser] Extracted keys: {list(result.keys())}")
    return result

def _parse_document_analysis_response(text):
    """Parse structured document analysis."""
    if not text:
        return None

    structured_data = _parse_json_response(text)
    if structured_data and isinstance(structured_data, dict):
        print(f"[DocumentAnalysis Parser] Found JSON data keys: {list(structured_data.keys())}")
        return structured_data

    sections = {
        'summary': None,
        'metadata': {},
        'structure': [],
        'fields': [],
        'quality': [],
        'recommendations': [],
        'notes': []
    }

    current_section = None
    lines = text.split('\n')

    print(f"[DocumentAnalysis Parser] Parsing {len(lines)} lines")

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        if line.upper().startswith('SECTION:'):
            current_section = line[8:].strip().lower()
            print(f"[DocumentAnalysis Parser] Found section: {current_section}")
            continue

        heading_with_number = re.match(r'^\s*\*{0,2}\d+\.?\s*(.+?)\*{0,2}:?\s*$', line)
        bold_heading = re.match(r'^\s*\*\*(.+?)\*\*:?$', line)
        if heading_with_number or bold_heading:
            heading_text = heading_with_number.group(1) if heading_with_number else bold_heading.group(1)
            current_section = heading_text.strip().lower()
            print(f"[DocumentAnalysis Parser] Found heading section: {current_section}")
            continue

        if not current_section:
            continue

        key_value_match = re.match(r'^([^:\-–]+?)\s*[:\-–]\s*(.+)$', line)

        if 'document summary' in current_section or current_section == 'document summary':
            if sections['summary']:
                sections['summary'] += ' ' + line
            else:
                sections['summary'] = line
            continue

        if 'document metadata' in current_section or 'metadata' in current_section:
            if key_value_match:
                key = key_value_match.group(1).strip()
                value = key_value_match.group(2).strip()
                sections['metadata'][key] = value
            elif line:
                sections['metadata'].setdefault(current_section.title(), line)
            continue

        if 'document type' in current_section:
            if line:
                existing = sections['metadata'].get('Document Type')
                sections['metadata']['Document Type'] = f"{existing} {line}".strip() if existing else line
            continue

        if 'language' in current_section:
            if line:
                existing = sections['metadata'].get('Language')
                sections['metadata']['Language'] = f"{existing} {line}".strip() if existing else line
            continue

        target_list = None
        if 'structure' in current_section:
            target_list = sections['structure']
        elif 'field' in current_section:
            target_list = sections['fields']
        elif 'quality' in current_section or 'completeness' in current_section:
            target_list = sections['quality']
        elif 'recommendation' in current_section or 'next step' in current_section:
            target_list = sections['recommendations']
        elif 'additional note' in current_section or 'notes' in current_section:
            target_list = sections['notes']

        if target_list is not None:
            if key_value_match and target_list is sections['fields']:
                target_list.append({
                    'label': key_value_match.group(1).strip(),
                    'value': key_value_match.group(2).strip()
                })
            else:
                cleaned = line.lstrip('-•*').strip()
                if cleaned:
                    target_list.append(cleaned)

    if not sections['summary']:
        sections['summary'] = text.strip()
    if not sections['metadata']:
        sections.pop('metadata')
    if not sections['structure']:
        sections.pop('structure')
    if not sections['fields']:
        sections.pop('fields')
    if not sections['quality']:
        sections.pop('quality')
    if not sections['recommendations']:
        sections.pop('recommendations')
    if not sections['notes']:
        sections.pop('notes')

    if not sections:
        print("[DocumentAnalysis Parser] No structured data parsed")
        return None

    print(f"[DocumentAnalysis Parser] Extracted keys: {list(sections.keys())}")
    return sections

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
            
            'scene': """You are a scene analysis expert. Analyze this image and provide a comprehensive scene breakdown.

Provide your response in this EXACT format with SECTION: headers:

SECTION: Scene Summary
<A concise 2-4 line paragraph describing the scene, main elements, and immediate context>

SECTION: Environment
Indoor / Outdoor: <indoor or outdoor>
Room Type: <bedroom, office, studio, kitchen, living room, etc. or N/A if outdoor>
Clean / Cluttered: <clean, cluttered, organized, messy, etc.>
Style: <modern, rustic, minimal, cozy, industrial, etc.>
Keywords: <comma-separated keywords like: indoor, office, clean, modern, organized, spacious>

SECTION: Lighting & Atmosphere
Lighting Type: <warm lighting, cool lighting, natural light, artificial light, etc.>
Light Sources: <lamp, window, screen, overhead, etc.>
Mood: <cozy, calm, focused, dramatic, energetic, etc.>
Time of Day: <morning, afternoon, evening, night, or inferred time>
Keywords: <comma-separated keywords like: warm lighting, natural light, cozy, evening, lamp, window>

SECTION: Activity / Human Context
Person Present: <yes or no>
Activity: <sitting, working, relaxing, interacting, etc.>
Body Language: <relaxed, focused, engaged, etc.>
Interaction: <using laptop, reading, with pet, etc.>
Keywords: <comma-separated keywords like: working, sitting, relaxed, using laptop, focused, with pet>

IMPORTANT for Environment, Lighting & Atmosphere, and Activity / Human Context:
- Keywords field should contain SHORT keywords (1-2 words each)
- Use format: "keyword1, keyword2, keyword3" (comma-separated)
- Maximum 6 keywords per section - provide exactly 4-6 most relevant keywords
- Each keyword should be concise (e.g., "indoor", "warm lighting", "working", "relaxed")
- Do NOT write long descriptive sentences in Keywords field
- Only include the most important/relevant keywords for each section

SECTION: Objects & Furniture Context
Key Elements: <comma-separated keywords like: blue desk, monitor, desk chair, laptop, cat, lamp, window>
Spatial Layout: <describe arrangement: on desk, next to person, in background, etc.>
Furniture: <comma-separated furniture items like: desk, chair, table, bookshelf>

IMPORTANT for Objects & Furniture Context:
- Key Elements and Furniture should be SHORT keywords (1-3 words each)
- Use format: "item1, item2, item3" (comma-separated)
- Each item should be a noun phrase like "blue desk", "computer monitor", "desk chair"
- Do NOT write long descriptive sentences - only list the objects as keywords
- Maximum 2-3 words per object (e.g., "blue desk" not "a blue desk that is positioned")

SECTION: Scene Interpretation
<A paragraph (3-5 sentences) interpreting the scene's meaning, context, and what it represents>

SECTION: Scene Metadata
Scene Type: <Indoor / Outdoor>
Time of Day (inferred): <morning, afternoon, evening, night, or unknown>
Weather Influence: <sunny, cloudy, rainy, none, etc.>
Motion: <static, dynamic, none detected>

SECTION: Tags
<comma-separated tags like: indoor, cozy, cat, working, laptop, warm lighting, desk setup>

CRITICAL REQUIREMENTS:
1. Use EXACT section names as shown above
2. Provide all sections even if some fields are "N/A" or "unknown"
3. Keep Scene Summary to 2-4 lines maximum
4. Scene Interpretation should be a thoughtful paragraph
5. Tags should be relevant keywords separated by commas
6. Use key-value format for structured sections (Field Name: value)""",
            
            'chart': """You are a chart interpretation engine. Analyze the image and return results using this exact template.

SECTION: Chart Summary
<Two concise sentences describing the chart intent, timeframe, data source, and standout trend>

SECTION: Chart Type & Structure
Chart Type: <bar, line, pie, area, scatter, etc.>
Orientation: <horizontal, vertical, radial, mixed>
Value Focus: <what the chart measures>
Units: <currency, percentage, count, etc.>
Confidence: <High | Medium | Low>
Notes: <short note about legend, stacking, grouped bars, etc.>

SECTION: Axes & Labels
X-Axis: <label + unit or "Not labeled">
Y-Axis: <label + unit or "Not labeled">
Axis Labels: <present / missing + brief description>
Units: <restate primary unit if visible>
Annotations: <text labels, reference lines, callouts>

SECTION: Extracted Data Points
Point 1: Category: <label> | Value: <number + unit> | Percent: <value or N/A> | Delta: <+/- value or N/A>
Point 2: ...
(Provide at least 4 points when visible, maximum 8. Maintain the same pipe-separated format.)

SECTION: AI Insights
- Bullet describing dominant segment or trend
- Bullet describing underperforming segment
- Bullet highlighting comparisons, growth/decline, or seasonality

SECTION: Chart Structure
- Colors: <number of colors + notable hues>
- Legend: <present/absent + content>
- Gridlines: <present/absent + style>
- Readability: <Excellent | Good | Fair | Poor + reason>
- Other Notes: <any extra structural cues>

SECTION: Confidence & Quality
Data Extraction Confidence: <0.00-1.00>
Label Detection: <Excellent | Good | Fair | Poor>
Axis Readability: <Excellent | Good | Fair | Poor>
Color Grouping Accuracy: <Excellent | Good | Fair | Poor>
Overall Notes: <one sentence on limitations>""",
            
            'document': """You are a document analysis engine. Examine the uploaded document image and return the findings using the exact template below.

SECTION: Document Summary
<Concise overview including document type, purpose, notable contents, and general condition>

SECTION: Document Metadata
Document Type: <invoice, contract, letter, ID, etc.>
Pages: <number if visible, otherwise estimate or "Unknown">
Language: <English, Spanish, etc.>
Capture Quality: <Excellent | Good | Fair | Poor + short reason>
Confidence: <0.00-1.00>

SECTION: Structure & Layout
- Bullet describing page layout (columns, margins, headers, footers)
- Bullet describing main sections or hierarchy
- Bullet describing notable visual elements (tables, stamps, logos)

SECTION: Extracted Fields
Field 1: <Field Label> — <Value>
Field 2: ...
(Provide at least 5 key/value pairs when visible. Use "Field: N/A" if truly unreadable.)

SECTION: Quality & Completeness
- Bullet about readability issues, glare, skew, or occlusions
- Bullet about missing sections or incomplete capture
- Bullet about legibility of handwriting/signatures

SECTION: Recommendations
- Bullet describing suggested next action (e.g., re-scan, verify signature, extract totals)
- Bullet describing formatting or filing steps

SECTION: Additional Notes
<Any other context such as stamps, signatures, handwriting, dates, or warnings>"""
        }
        
        # Use custom prompt or default based on analysis type
        prompt = prompt_override or prompts.get(analysis_type, prompts['general'])
        
        analysis_text = ""
        cleaned_text = None

        text_context = None
        chart_structured_data = None
        document_structured_data = None

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
            elif analysis_type == 'scene':
                response = model.generate_content([prompt, image_obj])
                analysis_text = response.text or ""
                print(f"[SceneAnalysis] Response length: {len(analysis_text)}")
                print(f"[SceneAnalysis] Response preview: {analysis_text[:500] if analysis_text else 'Empty'}")
            elif analysis_type == 'chart':
                response = model.generate_content([prompt, image_obj])
                analysis_text = response.text or ""
                print(f"[ChartAnalysis] Response length: {len(analysis_text)}")
                print(f"[ChartAnalysis] Response preview: {analysis_text[:400] if analysis_text else 'Empty'}")
                chart_structured_data = _parse_chart_analysis_response(analysis_text)
                if chart_structured_data:
                    print(f"[ChartAnalysis] Parsed structured chart data keys: {list(chart_structured_data.keys())}")
            elif analysis_type == 'document':
                response = model.generate_content([prompt, image_obj])
                analysis_text = response.text or ""
                print(f"[DocumentAnalysis] Response length: {len(analysis_text)}")
                print(f"[DocumentAnalysis] Response preview: {analysis_text[:500] if analysis_text else 'Empty'}")
                document_structured_data = _parse_document_analysis_response(analysis_text)
                if document_structured_data:
                    print(f"[DocumentAnalysis] Parsed structured doc data keys: {list(document_structured_data.keys())}")
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
        elif analysis_type == 'chart' and chart_structured_data:
            result['structured_data'] = chart_structured_data
        elif analysis_type == 'document' and document_structured_data:
            result['structured_data'] = document_structured_data
        
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
            
            'scene': """You are a scene analysis expert. Analyze this image and provide a comprehensive scene breakdown.

Provide your response in this EXACT format with SECTION: headers:

SECTION: Scene Summary
<A concise 2-4 line paragraph describing the scene, main elements, and immediate context>

SECTION: Environment
Indoor / Outdoor: <indoor or outdoor>
Room Type: <bedroom, office, studio, kitchen, living room, etc. or N/A if outdoor>
Clean / Cluttered: <clean, cluttered, organized, messy, etc.>
Style: <modern, rustic, minimal, cozy, industrial, etc.>
Keywords: <comma-separated keywords like: indoor, office, clean, modern, organized, spacious>

SECTION: Lighting & Atmosphere
Lighting Type: <warm lighting, cool lighting, natural light, artificial light, etc.>
Light Sources: <lamp, window, screen, overhead, etc.>
Mood: <cozy, calm, focused, dramatic, energetic, etc.>
Time of Day: <morning, afternoon, evening, night, or inferred time>
Keywords: <comma-separated keywords like: warm lighting, natural light, cozy, evening, lamp, window>

SECTION: Activity / Human Context
Person Present: <yes or no>
Activity: <sitting, working, relaxing, interacting, etc.>
Body Language: <relaxed, focused, engaged, etc.>
Interaction: <using laptop, reading, with pet, etc.>
Keywords: <comma-separated keywords like: working, sitting, relaxed, using laptop, focused, with pet>

IMPORTANT for Environment, Lighting & Atmosphere, and Activity / Human Context:
- Keywords field should contain SHORT keywords (1-2 words each)
- Use format: "keyword1, keyword2, keyword3" (comma-separated)
- Maximum 6 keywords per section - provide exactly 4-6 most relevant keywords
- Each keyword should be concise (e.g., "indoor", "warm lighting", "working", "relaxed")
- Do NOT write long descriptive sentences in Keywords field
- Only include the most important/relevant keywords for each section

SECTION: Objects & Furniture Context
Key Elements: <comma-separated keywords like: blue desk, monitor, desk chair, laptop, cat, lamp, window>
Spatial Layout: <describe arrangement: on desk, next to person, in background, etc.>
Furniture: <comma-separated furniture items like: desk, chair, table, bookshelf>

IMPORTANT for Objects & Furniture Context:
- Key Elements and Furniture should be SHORT keywords (1-3 words each)
- Use format: "item1, item2, item3" (comma-separated)
- Each item should be a noun phrase like "blue desk", "computer monitor", "desk chair"
- Do NOT write long descriptive sentences - only list the objects as keywords
- Maximum 2-3 words per object (e.g., "blue desk" not "a blue desk that is positioned")

SECTION: Scene Interpretation
<A paragraph (3-5 sentences) interpreting the scene's meaning, context, and what it represents>

SECTION: Scene Metadata
Scene Type: <Indoor / Outdoor>
Time of Day (inferred): <morning, afternoon, evening, night, or unknown>
Weather Influence: <sunny, cloudy, rainy, none, etc.>
Motion: <static, dynamic, none detected>

SECTION: Tags
<comma-separated tags like: indoor, cozy, cat, working, laptop, warm lighting, desk setup>

CRITICAL REQUIREMENTS:
1. Use EXACT section names as shown above
2. Provide all sections even if some fields are "N/A" or "unknown"
3. Keep Scene Summary to 2-4 lines maximum
4. Scene Interpretation should be a thoughtful paragraph
5. Tags should be relevant keywords separated by commas
6. Use key-value format for structured sections (Field Name: value)""",
            
            'chart': """You are a chart interpretation engine. Analyze the image and return results using this exact template.

SECTION: Chart Summary
<Two concise sentences describing the chart intent, timeframe, data source, and standout trend>

SECTION: Chart Type & Structure
Chart Type: <bar, line, pie, area, scatter, etc.>
Orientation: <horizontal, vertical, radial, mixed>
Value Focus: <what the chart measures>
Units: <currency, percentage, count, etc.>
Confidence: <High | Medium | Low>
Notes: <short note about legend, stacking, grouped bars, etc.>

SECTION: Axes & Labels
X-Axis: <label + unit or "Not labeled">
Y-Axis: <label + unit or "Not labeled">
Axis Labels: <present / missing + brief description>
Units: <restate primary unit if visible>
Annotations: <text labels, reference lines, callouts>

SECTION: Extracted Data Points
Point 1: Category: <label> | Value: <number + unit> | Percent: <value or N/A> | Delta: <+/- value or N/A>
Point 2: ...
(Provide at least 4 points when visible, maximum 8. Maintain the same pipe-separated format.)

SECTION: AI Insights
- Bullet describing dominant segment or trend
- Bullet describing underperforming segment
- Bullet highlighting comparisons, growth/decline, or seasonality

SECTION: Chart Structure
- Colors: <number of colors + notable hues>
- Legend: <present/absent + content>
- Gridlines: <present/absent + style>
- Readability: <Excellent | Good | Fair | Poor + reason>
- Other Notes: <any extra structural cues>

SECTION: Confidence & Quality
Data Extraction Confidence: <0.00-1.00>
Label Detection: <Excellent | Good | Fair | Poor>
Axis Readability: <Excellent | Good | Fair | Poor>
Color Grouping Accuracy: <Excellent | Good | Fair | Poor>
Overall Notes: <one sentence on limitations>""",
            
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
            elif analysis_type == 'scene':
                # For scene analysis, collect full response first, then parse and send structured data
                full_response = ""
                response = model.generate_content(
                    [prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text  # Stream for real-time display
                
                print(f"[SceneAnalysis Stream] Full response length: {len(full_response)}")
                print(f"[SceneAnalysis Stream] Response preview: {full_response[:500] if full_response else 'Empty'}")
                
                # Parse and send structured data
                scene_data = _parse_scene_analysis_response(full_response)
                if scene_data:
                    print(f"[SceneAnalysis Stream] Parsed scene data keys: {list(scene_data.keys())}")
                    if 'environment' in scene_data:
                        print(f"[SceneAnalysis Stream] Environment data: {scene_data['environment']}")
                    yield f"[SCENE_JSON]{json.dumps(scene_data)}"
                    print(f"[SceneAnalysis Stream] Sent structured data via SCENE_JSON marker")
                else:
                    print(f"[SceneAnalysis Stream] WARNING: Failed to parse scene data from response")
            elif analysis_type == 'chart':
                full_response = ""
                response = model.generate_content(
                    [prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text

                print(f"[ChartAnalysis Stream] Full response length: {len(full_response)}")
                print(f"[ChartAnalysis Stream] Response preview: {full_response[:500] if full_response else 'Empty'}")

                chart_data = _parse_chart_analysis_response(full_response)
                if chart_data:
                    print(f"[ChartAnalysis Stream] Parsed chart data keys: {list(chart_data.keys())}")
                    yield f"[CHART_JSON]{json.dumps(chart_data)}"
                    print("[ChartAnalysis Stream] Sent structured chart data via CHART_JSON marker")
                else:
                    print("[ChartAnalysis Stream] WARNING: Failed to parse chart data from response")
            elif analysis_type == 'document':
                full_response = ""
                response = model.generate_content(
                    [prompt, image_obj],
                    stream=True
                )
                for chunk in response:
                    if chunk.text:
                        full_response += chunk.text
                        yield chunk.text

                print(f"[DocumentAnalysis Stream] Full response length: {len(full_response)}")
                print(f"[DocumentAnalysis Stream] Response preview: {full_response[:500] if full_response else 'Empty'}")

                document_data = _parse_document_analysis_response(full_response)
                if document_data:
                    print(f"[DocumentAnalysis Stream] Parsed document data keys: {list(document_data.keys())}")
                    yield f"[DOCUMENT_JSON]{json.dumps(document_data)}"
                    print("[DocumentAnalysis Stream] Sent structured doc data via DOCUMENT_JSON marker")
                else:
                    print("[DocumentAnalysis Stream] WARNING: Failed to parse document data from response")
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

