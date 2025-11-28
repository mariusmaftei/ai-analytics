PROMPTS = {
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
    'ocr': None,  # Provided by ocr module
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
    'scene': None,  # Provided by scene module
    'chart': None,  # Provided by chart module
    'document': None,  # Provided by document module
}

