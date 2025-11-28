import json
from ..image_analysis import common
from utils.text_cleaner import clean_ocr_text

PROMPT = """You are an OCR extraction engine.
Return ONLY the literal text that appears in the image exactly as written.

Formatting rules:
- Output each distinct line of text exactly as it appears in the image.
- Keep the original word order and spacing for each line. If a line contains multiple words, include them all on the same line.
- Preserve punctuation and capitalization.
- Do NOT add introductions, summaries, labels, numbering, or extra commentary.
- Do NOT describe fonts, colors, locations, or confidence.
- If absolutely no text is visible, output the single token [NO_TEXT].

Example output (for an image whose sign says "Looking for a friend."):
Looking for a friend."""


def _should_retry_ocr(text):
    normalized = (text or "").strip()
    if not normalized:
        return True
    if normalized.upper() == "[NO_TEXT]":
        return False
    words = normalized.split()
    return len(words) == 1 and len(normalized) <= 12


def _run_ocr_attempt(model, prompt_text, image_bytes):
    image = common.load_image_from_bytes(image_bytes)
    response = model.generate_content([prompt_text, image])
    return response.text or ""


def extract_ocr_text(model, image_bytes, prompt_text):
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


def derive_text_context(model, image_bytes):
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
            [prompt, common.load_image_from_bytes(image_bytes)]
        )
        raw_text = (response.text or "").strip()
        normalized = common.strip_code_fences(raw_text)
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

