"""
Image Service - Handle image analysis using Gemini Vision
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
                width, height = image_obj.size
                enhanced_prompt = (
                    f"{prompt}\n\nImage dimensions: {width} x {height} pixels.\n\n"
                    "IMPORTANT: Use these exact dimensions for coordinates:\n"
                    f"- x can be from 0 to {width - 1}\n"
                    f"- y can be from 0 to {height - 1}\n"
                    "- w and h must be positive and x+w <= width, y+h <= height\n"
                    "- Measure coordinates carefully from the actual image pixels."
                )
                response = model.generate_content([enhanced_prompt, image_obj])
                raw_response = response.text or ""
                objects_data = analysis_common.parse_json_response(raw_response)
                if objects_data and isinstance(objects_data, list):
                    analysis_text = json.dumps(objects_data)
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
            width, height = image_obj.size
            enhanced_prompt = (
                f"{prompt}\n\nImage dimensions: {width} x {height} pixels.\n\n"
                "IMPORTANT: Use these exact dimensions for coordinates:\n"
                f"- x can be from 0 to {width - 1}\n"
                f"- y can be from 0 to {height - 1}\n"
                "- w and h must be positive and x+w <= width, y+h <= height\n"
                "- Measure coordinates carefully from the actual image pixels."
            )
            full_response = ""
            response = model.generate_content([enhanced_prompt, image_obj], stream=True)
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text

            objects_data = analysis_common.parse_json_response(full_response)
            if objects_data and isinstance(objects_data, list):
                yield f"[OBJECTS_JSON]{json.dumps(objects_data)}"
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

