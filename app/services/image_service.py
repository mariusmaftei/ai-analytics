"""
Image Service - Handle image analysis using Gemini Vision and YOLO
"""
import json
from PIL import Image

from config.gemini import get_gemini_model
from services.image_analysis import (
    common as analysis_common,
    ocr as ocr_analysis,
    general as general_analysis,
    scene as scene_analysis,
    chart as chart_analysis,
    document as document_analysis,
    prompts as prompt_store,
)

# Try to import YOLO detection (optional)
try:
    from services.image_analysis import yolo_detection
    YOLO_AVAILABLE = yolo_detection.is_yolo_available()
except ImportError:
    YOLO_AVAILABLE = False
    print("[INFO] YOLO detection not available. Install with: pip install ultralytics")


DEFAULT_PROMPTS = {
    "general": general_analysis.PROMPT,
    "detailed": prompt_store.PROMPTS["detailed"],
    "ocr": ocr_analysis.PROMPT,
    "objects": prompt_store.PROMPTS["objects"],
    "scene": scene_analysis.PROMPT,
    "chart": chart_analysis.PROMPT,
    "document": document_analysis.PROMPT,
}

STREAM_MARKERS = {
    "general": "[GENERAL_JSON]",
    "scene": "[SCENE_JSON]",
    "chart": "[CHART_JSON]",
    "document": "[DOCUMENT_JSON]",
}


def _get_prompt(analysis_type: str) -> str:
    return DEFAULT_PROMPTS.get(analysis_type, DEFAULT_PROMPTS["general"])


def _parse_structured_data(analysis_type: str, text: str):
    if not text:
        return None

    if analysis_type == "general":
        parsed, _ = general_analysis.parse_response(text)
        return parsed
    if analysis_type == "scene":
        return scene_analysis.parse_response(text)
    if analysis_type == "chart":
        return chart_analysis.parse_response(text)
    if analysis_type == "document":
        return document_analysis.parse_response(text)
    return None


def get_image_metadata(image_file):
    """
    Extract metadata from image file
    Args:
        image_file: File-like object (from Flask request.files)
    Returns:
        dict: Image metadata (dimensions, format, size, etc.)
    """
    try:
        image_file.seek(0)
        image = Image.open(image_file)

        width, height = image.size
        format_name = image.format or "Unknown"
        mode = image.mode

        image_file.seek(0, 2)
        file_size = image_file.tell()
        image_file.seek(0)

        return {
            "success": True,
            "width": width,
            "height": height,
            "format": format_name,
            "mode": mode,
            "file_size": file_size,
            "aspect_ratio": round(width / height, 2) if height > 0 else 0,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
        }


def analyze_image_with_ai(image_file, analysis_type="general", prompt_override=None):
    """
    Analyze image using Gemini Vision API
    Args:
        image_file: File-like object (from Flask request.files)
        analysis_type: Type of analysis (general, detailed, ocr, objects, scene, chart, document)
        prompt_override: Custom prompt to override default analysis prompts
    Returns:
        dict: Analysis results
    """
    try:
        image_file.seek(0)
        image_bytes = image_file.read()
        image_file.seek(0)

        model = get_gemini_model()
        prompt = prompt_override or _get_prompt(analysis_type)

        cleaned_text = None
        text_context = None
        structured_data = None
        analysis_text = ""

        if analysis_type == "ocr":
            raw_text, cleaned_text = ocr_analysis.extract_ocr_text(
                model, image_bytes, prompt
            )
            text_context = ocr_analysis.derive_text_context(model, image_bytes)
            analysis_text = raw_text
        else:
            image_obj = analysis_common.load_image_from_bytes(image_bytes)

            if analysis_type == "objects":
                # Use YOLO if available, otherwise fall back to Gemini
                print(f"[DEBUG] Object detection requested. YOLO_AVAILABLE: {YOLO_AVAILABLE}")
                if YOLO_AVAILABLE:
                    try:
                        print("[INFO] Using YOLO for object detection...")
                        # Use YOLO for accurate object detection
                        detected_objects = yolo_detection.detect_objects_yolo(
                            image_bytes, 
                            confidence_threshold=0.25,  # Lower threshold since YOLO is more accurate
                            person_only=False
                        )
                        print(f"[INFO] YOLO detected {len(detected_objects)} objects")
                        # Filter person detections with higher threshold
                        filtered_objects = []
                        for obj in detected_objects:
                            obj_name_lower = str(obj.get('name', '')).lower()
                            is_person = 'person' in obj_name_lower
                            confidence = float(obj.get('confidence', 0.0))
                            
                            # Apply stricter threshold for persons
                            if is_person and confidence < 0.50:  # YOLO is more accurate, can use lower threshold
                                continue
                            if not is_person and confidence < 0.25:
                                continue
                            
                            filtered_objects.append(obj)
                        
                        print(f"[INFO] YOLO filtered to {len(filtered_objects)} objects after confidence filtering")
                        analysis_text = json.dumps(filtered_objects)
                    except Exception as e:
                        print(f"[ERROR] YOLO detection failed, falling back to Gemini: {e}")
                        import traceback
                        traceback.print_exc()
                        # Fall through to Gemini detection
                        analysis_text = ""  # Will trigger Gemini fallback
                
                # Fallback to Gemini if YOLO not available or failed
                if not YOLO_AVAILABLE or analysis_text == "":
                    if not YOLO_AVAILABLE:
                        print("[WARNING] YOLO not available, using Gemini for object detection")
                    else:
                        print("[WARNING] YOLO failed or returned empty, using Gemini for object detection")
                    width, height = image_obj.size
                    enhanced_prompt = (
                        f"{prompt}\n\n"
                        f"IMAGE DIMENSIONS: {width} pixels wide × {height} pixels tall\n\n"
                        "CRITICAL DETECTION ACCURACY - READ CAREFULLY:\n"
                        "- ONLY detect objects that are ACTUALLY VISIBLE in this specific image\n"
                        "- For person/face detection: ONLY include if you can clearly see:\n"
                        "  * Visible facial features (eyes, nose, mouth) that are clearly recognizable\n"
                        "  * Actual skin color that matches the person visible in the image\n"
                        "  * Face shape that is clearly visible and matches the person's actual appearance\n"
                        "  * The person must be physically present, not a shadow, reflection, or imagined\n"
                        "- DO NOT detect people in reflections unless the reflection shows a distinct, clearly visible person\n"
                        "- DO NOT detect based on partial shapes, shadows, or ambiguous patterns\n"
                        "- If uncertain, DO NOT include - only include high-confidence detections (minimum 0.85 for persons)\n"
                        "- Be conservative: fewer accurate detections are better than false positives\n\n"
                        "CRITICAL COORDINATE REQUIREMENTS:\n"
                        f"- The image is EXACTLY {width} pixels wide and {height} pixels tall\n"
                        f"- x coordinate: integer from 0 to {width - 1} (0 = leftmost pixel, {width - 1} = rightmost pixel)\n"
                        f"- y coordinate: integer from 0 to {height - 1} (0 = topmost pixel, {height - 1} = bottommost pixel)\n"
                        f"- w (width): positive integer, must satisfy: x + w ≤ {width}\n"
                        f"- h (height): positive integer, must satisfy: y + h ≤ {height}\n"
                        "- The coordinates (x, y) represent the TOP-LEFT corner of the bounding box\n"
                        "- IMPORTANT: (x, y) should be the EXACT pixel where the object's top-left corner STARTS - not before it, not after it\n"
                        "- The bounding box should START at the object's edge: x should be where the object's leftmost visible pixel begins, y should be where the object's topmost visible pixel begins\n"
                        "- w and h should extend to include the object's rightmost and bottommost pixels\n"
                        "- Use ABSOLUTE pixel coordinates - count actual pixels from the top-left corner (0,0)\n"
                        "- DO NOT use normalized coordinates (0.0 to 1.0) - use actual integer pixel values\n"
                        "- DO NOT scale coordinates - use the exact pixel position in the {width}x{height} image\n"
                        "- Example for a {width}x{height} image: If a person's head starts 174 pixels from left and 389 pixels from top, use x=174, y=389\n"
                        "- Another example: If an object is in the center-right, it might be at x={width//2}, y={height//2}\n"
                        "- Be extremely precise: visually measure where each object's edges actually start by counting pixels from (0,0)\n"
                        "- The bounding box should tightly enclose the entire object with the box starting exactly at the object's edges"
                    )
                    response = model.generate_content([enhanced_prompt, image_obj])
                    raw_response = response.text or ""
                    objects_data = analysis_common.parse_json_response(raw_response)
                    if objects_data and isinstance(objects_data, list):
                        filtered_objects = []
                        for obj in objects_data:
                            # Filter out low-confidence person/face detections
                            obj_name_lower = str(obj.get('name', '')).lower()
                            is_person = 'person' in obj_name_lower or 'face' in obj_name_lower or 'human' in obj_name_lower
                            confidence = float(obj.get('confidence', 0.0))
                            
                            # Apply stricter confidence thresholds
                            if is_person and confidence < 0.85:
                                continue  # Skip low-confidence person detections
                            if not is_person and confidence < 0.70:
                                continue  # Skip low-confidence other object detections
                            
                            if 'x' in obj and 'y' in obj and 'w' in obj and 'h' in obj:
                                x_val = float(obj['x'])
                                y_val = float(obj['y'])
                                w_val = float(obj['w'])
                                h_val = float(obj['h'])
                                
                                if x_val < 1.0 and y_val < 1.0 and w_val < 1.0 and h_val < 1.0:
                                    x_val = x_val * width
                                    y_val = y_val * height
                                    w_val = w_val * width
                                    h_val = h_val * height
                                
                                obj['x'] = max(0, min(int(x_val), width - 1))
                                obj['y'] = max(0, min(int(y_val), height - 1))
                                obj['w'] = max(1, min(int(w_val), width - obj['x']))
                                obj['h'] = max(1, min(int(h_val), height - obj['y']))
                                
                                filtered_objects.append(obj)
                        analysis_text = json.dumps(filtered_objects)
                    else:
                        analysis_text = raw_response
            else:
                response = model.generate_content([prompt, image_obj])
                analysis_text = response.text or ""
                structured_data = _parse_structured_data(analysis_type, analysis_text)

        result = {
            "success": True,
            "analysis": analysis_text,
            "analysis_type": analysis_type,
            "cleaned_analysis": cleaned_text,
            "text_context": text_context,
        }

        if structured_data:
            result["structured_data"] = structured_data

        return result

    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
        }


def analyze_image_stream(image_file, analysis_type="general", prompt_override=None):
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
        image_file.seek(0)
        image_bytes = image_file.read()
        image_file.seek(0)

        model = get_gemini_model()
        prompt = prompt_override or _get_prompt(analysis_type)

        if analysis_type == "ocr":
            raw_text, cleaned_text = ocr_analysis.extract_ocr_text(
                model, image_bytes, prompt
            )
            context = ocr_analysis.derive_text_context(model, image_bytes)
            yield (cleaned_text or raw_text or "").strip()
            yield f"[RAW_TEXT]{raw_text or ''}"
            yield f"[TEXT_CONTEXT]{json.dumps(context)}"
            return

        image_obj = analysis_common.load_image_from_bytes(image_bytes)

        if analysis_type == "objects":
            # Use YOLO if available, otherwise fall back to Gemini
            if YOLO_AVAILABLE:
                try:
                    # Use YOLO for accurate object detection
                    detected_objects = yolo_detection.detect_objects_yolo(
                        image_bytes, 
                        confidence_threshold=0.25,
                        person_only=False
                    )
                    # Filter person detections with higher threshold
                    filtered_objects = []
                    for obj in detected_objects:
                        obj_name_lower = str(obj.get('name', '')).lower()
                        is_person = 'person' in obj_name_lower
                        confidence = float(obj.get('confidence', 0.0))
                        
                        # Apply stricter threshold for persons
                        if is_person and confidence < 0.50:  # YOLO is more accurate, can use lower threshold
                            continue
                        if not is_person and confidence < 0.25:
                            continue
                        
                        filtered_objects.append(obj)
                    
                    yield f"[OBJECTS_JSON]{json.dumps(filtered_objects)}"
                    return
                except Exception as e:
                    print(f"[WARNING] YOLO detection failed, falling back to Gemini: {e}")
                    # Fall through to Gemini detection
            
            # Fallback to Gemini if YOLO not available or failed
            width, height = image_obj.size
            enhanced_prompt = (
                f"{prompt}\n\n"
                f"IMAGE DIMENSIONS: {width} pixels wide × {height} pixels tall\n\n"
                "CRITICAL DETECTION ACCURACY - READ CAREFULLY:\n"
                "- ONLY detect objects that are ACTUALLY VISIBLE in this specific image\n"
                "- For person/face detection: ONLY include if you can clearly see:\n"
                "  * Visible facial features (eyes, nose, mouth) that are clearly recognizable\n"
                "  * Actual skin color that matches the person visible in the image\n"
                "  * Face shape that is clearly visible and matches the person's actual appearance\n"
                "  * The person must be physically present, not a shadow, reflection, or imagined\n"
                "- DO NOT detect people in reflections unless the reflection shows a distinct, clearly visible person\n"
                "- DO NOT detect based on partial shapes, shadows, or ambiguous patterns\n"
                "- If uncertain, DO NOT include - only include high-confidence detections (minimum 0.85 for persons)\n"
                "- Be conservative: fewer accurate detections are better than false positives\n\n"
                "CRITICAL COORDINATE REQUIREMENTS:\n"
                f"- The image is EXACTLY {width} pixels wide and {height} pixels tall\n"
                f"- x coordinate: integer from 0 to {width - 1} (0 = leftmost pixel, {width - 1} = rightmost pixel)\n"
                f"- y coordinate: integer from 0 to {height - 1} (0 = topmost pixel, {height - 1} = bottommost pixel)\n"
                f"- w (width): positive integer, must satisfy: x + w ≤ {width}\n"
                f"- h (height): positive integer, must satisfy: y + h ≤ {height}\n"
                "- The coordinates (x, y) represent the TOP-LEFT corner of the bounding box\n"
                "- IMPORTANT: (x, y) should be the EXACT pixel where the object's top-left corner STARTS - not before it, not after it\n"
                "- The bounding box should START at the object's edge: x should be where the object's leftmost visible pixel begins, y should be where the object's topmost visible pixel begins\n"
                "- w and h should extend to include the object's rightmost and bottommost pixels\n"
                "- Use ABSOLUTE pixel coordinates - count actual pixels from the top-left corner (0,0)\n"
                "- DO NOT use normalized coordinates (0.0 to 1.0) - use actual integer pixel values\n"
                "- DO NOT scale coordinates - use the exact pixel position in the {width}x{height} image\n"
                "- Example for a {width}x{height} image: If a person's head starts 174 pixels from left and 389 pixels from top, use x=174, y=389\n"
                "- Another example: If an object is in the center-right, it might be at x={width//2}, y={height//2}\n"
                "- Be extremely precise: visually measure where each object's edges actually start by counting pixels from (0,0)\n"
                "- The bounding box should tightly enclose the entire object with the box starting exactly at the object's edges"
            )
            full_response = ""
            response = model.generate_content([enhanced_prompt, image_obj], stream=True)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text

            objects_data = analysis_common.parse_json_response(full_response)
            if objects_data and isinstance(objects_data, list):
                filtered_objects = []
                for obj in objects_data:
                    # Filter out low-confidence person/face detections
                    obj_name_lower = str(obj.get('name', '')).lower()
                    is_person = 'person' in obj_name_lower or 'face' in obj_name_lower or 'human' in obj_name_lower
                    confidence = float(obj.get('confidence', 0.0))
                    
                    # Apply stricter confidence thresholds
                    if is_person and confidence < 0.85:
                        continue  # Skip low-confidence person detections
                    if not is_person and confidence < 0.70:
                        continue  # Skip low-confidence other object detections
                    
                    if 'x' in obj and 'y' in obj and 'w' in obj and 'h' in obj:
                        x_val = float(obj['x'])
                        y_val = float(obj['y'])
                        w_val = float(obj['w'])
                        h_val = float(obj['h'])
                        
                        if x_val < 1.0 and y_val < 1.0 and w_val < 1.0 and h_val < 1.0:
                            x_val = x_val * width
                            y_val = y_val * height
                            w_val = w_val * width
                            h_val = h_val * height
                        
                        obj['x'] = max(0, min(int(x_val), width - 1))
                        obj['y'] = max(0, min(int(y_val), height - 1))
                        obj['w'] = max(1, min(int(w_val), width - obj['x']))
                        obj['h'] = max(1, min(int(h_val), height - obj['y']))
                        
                        filtered_objects.append(obj)
                yield f"[OBJECTS_JSON]{json.dumps(filtered_objects)}"
            else:
                yield full_response
            return

        full_response = ""
        response = model.generate_content([prompt, image_obj], stream=True)
        for chunk in response:
            if chunk.text:
                full_response += chunk.text
                yield chunk.text

        structured_data = _parse_structured_data(analysis_type, full_response)
        marker = STREAM_MARKERS.get(analysis_type)
        if marker and structured_data:
            yield f"{marker}{json.dumps(structured_data)}"

    except Exception as exc:
        yield f"[ERROR] Image analysis failed: {str(exc)}"

