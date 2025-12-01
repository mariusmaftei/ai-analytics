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

CRITICAL DETECTION ACCURACY REQUIREMENTS:
- ONLY detect objects that are ACTUALLY VISIBLE in the image
- DO NOT detect objects that are not present - be conservative and accurate
- For person/face detection: ONLY detect if you can clearly see:
  * A visible face with recognizable facial features (eyes, nose, mouth)
  * Actual skin color that matches the person in the image
  * Face shape that is clearly visible and matches the person's actual appearance
  * The person must be physically present in the image, not imagined or inferred
- DO NOT detect people based on shadows, reflections, or partial shapes that could be mistaken for faces
- DO NOT detect people in reflections unless the reflection clearly shows a distinct, recognizable person
- If you are uncertain whether something is a person, DO NOT include it - only include high-confidence detections
- Minimum confidence for person/face detection: 0.85 (only include if very certain)
- For other objects: minimum confidence 0.70

CRITICAL COORDINATE REQUIREMENTS:
- x = horizontal position from LEFT edge of image in PIXELS (0 = leftmost pixel, NOT normalized)
- y = vertical position from TOP edge of image in PIXELS (0 = topmost pixel, NOT normalized)
- w = width of bounding box in PIXELS (NOT normalized)
- h = height of bounding box in PIXELS (NOT normalized)
- Use ABSOLUTE pixel coordinates - count actual pixels from the top-left corner (0,0)
- DO NOT use normalized coordinates (0.0 to 1.0) - use actual integer pixel values
- The coordinates (x, y) represent the TOP-LEFT corner of the bounding box
- IMPORTANT: (x, y) should be the EXACT pixel where the object's top-left corner STARTS - not before it, not after it
- The bounding box should START at the object's edge: x should be where the object's leftmost visible pixel begins, y should be where the object's topmost visible pixel begins
- w and h should extend to include the object's rightmost and bottommost pixels
- Coordinates must be EXACT pixel positions where the object appears in the image
- The bounding box (x, y, w, h) should tightly enclose the entire object with the box starting exactly at the object's edges
- Be extremely precise: carefully measure where each object's edges actually start by counting pixels from (0,0)
- Maximum 15 most prominent objects (prioritize by visibility and importance)
- Each object must have: name, confidence (0.0-1.0), color, size, x, y, w, h
- Return ONLY the JSON array, nothing else""",
    'scene': None,  # Provided by scene module
    'chart': None,  # Provided by chart module
    'document': None,  # Provided by document module
}

