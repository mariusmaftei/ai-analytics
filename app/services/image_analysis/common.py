import io
import json
import re
from PIL import Image


def load_image_from_bytes(image_bytes):
    """Return a Pillow Image from raw bytes."""
    return Image.open(io.BytesIO(image_bytes))


def strip_code_fences(text: str) -> str:
    """Remove markdown code fences from model output."""
    if not text:
        return text
    normalized = text.strip()
    if normalized.startswith("```"):
        normalized = normalized.strip("`")
        if normalized.lower().startswith("json"):
            normalized = normalized[4:].strip()
    return normalized


def parse_json_response(text):
    """Parse JSON from a text response, handling markdown fences and extra characters."""
    if not text:
        return None

    normalized = strip_code_fences(text)

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
    except Exception as exc:
        print(f"[JSON Parse Error] {exc}, text: {normalized[:200]}")
        return None


def match_key_value(line: str):
    """Return (key, value) if the string looks like 'key: value'."""
    if not line:
        return None
    match = re.match(r"^([^:\-–]+?)\s*[:\-–]\s*(.+)$", line)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None

