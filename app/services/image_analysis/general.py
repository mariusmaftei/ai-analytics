from . import common

PROMPT = """You are a visual intelligence assistant. Analyze the image and provide a comprehensive analysis.

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
6. Field names in JSON must match exactly: imageType, mainSubject, dominantColors, layoutStructure, overallMood, lighting"""


def parse_response(text):
    if not text:
        return None, None

    structured_data = common.parse_json_response(text)
    key_attributes = {}
    summary = None

    if structured_data and isinstance(structured_data, dict):
        key_attributes = structured_data.get("keyAttributes", {})
        summary = structured_data.get("summary")
    else:
        lines = text.split("\n")
        in_key_attributes = False

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if line.lower().startswith("summary:"):
                summary = line.split(":", 1)[1].strip() if ":" in line else None
                continue

            if "key attributes" in line.lower() or "section: key attributes" in line.lower():
                in_key_attributes = True
                continue

            if in_key_attributes and ":" in line:
                parts = line.split(":", 1)
                if len(parts) == 2:
                    field = parts[0].strip().lower()
                    value = parts[1].strip()

                    if "image type" in field:
                        key_attributes["imageType"] = value
                    elif "main subject" in field:
                        key_attributes["mainSubject"] = value
                    elif "dominant color" in field:
                        key_attributes["dominantColors"] = value
                    elif "layout structure" in field or "layout" in field:
                        key_attributes["layoutStructure"] = value
                    elif "overall mood" in field or "mood" in field:
                        key_attributes["overallMood"] = value
                    elif "lighting" in field:
                        key_attributes["lighting"] = value

    parsed = {"summary": summary, "keyAttributes": key_attributes}
    return (parsed if (summary or key_attributes) else None), text

