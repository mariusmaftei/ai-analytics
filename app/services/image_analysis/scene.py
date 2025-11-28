from . import common

PROMPT = """You are a scene analysis expert. Analyze this image and provide a comprehensive scene breakdown.

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

SECTION: Objects & Furniture Context
Key Elements: <comma-separated keywords like: blue desk, monitor, desk chair, laptop, cat, lamp, window>
Spatial Layout: <describe arrangement: on desk, next to person, in background, etc.>
Furniture: <comma-separated furniture items like: desk, chair, table, bookshelf>

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
6. Use key-value format for structured sections (Field Name: value)"""


def parse_response(text):
    if not text:
        return None

    structured_data = common.parse_json_response(text)
    if structured_data and isinstance(structured_data, dict):
        print(f"[SceneAnalysis Parser] Found JSON data: {list(structured_data.keys())}")
        return structured_data

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

        if line.upper().startswith('SECTION:'):
            section_name = line[8:].strip()
            current_section = section_name.lower().strip().rstrip('.:;')
            print(f"[SceneAnalysis Parser] Found section: '{section_name}' (normalized: '{current_section}')")
            continue

        key_value_match = None
        if current_section:
            key_value_match = common.match_key_value(line)

        if key_value_match and current_section:
            key, value = key_value_match
            if not value or value.upper() in ['N/A', 'NONE', 'UNKNOWN']:
                continue

            section_lower = current_section

            if 'scene summary' in section_lower or 'summary' == section_lower:
                result['sceneSummary'] = (
                    f"{result['sceneSummary']} {value}".strip()
                    if result['sceneSummary']
                    else value
                )
            elif 'environment' in section_lower:
                result['environment'][key] = value
            elif 'lighting' in section_lower or 'atmosphere' in section_lower:
                result['lighting'][key] = value
            elif 'activity' in section_lower or 'human context' in section_lower:
                result['activity'][key] = value
            elif 'objects' in section_lower or 'furniture' in section_lower:
                result['objects'][key] = value
            elif 'interpretation' in section_lower:
                result['interpretation'] = (
                    f"{result['interpretation']} {value}".strip()
                    if result['interpretation']
                    else value
                )
            elif 'metadata' in section_lower:
                result['metadata'][key] = value
            elif 'tags' in section_lower:
                tags = [t.strip() for t in value.split(',') if t.strip()]
                result['tags'].extend(tags)
        elif current_section:
            section_lower = current_section
            if 'scene summary' in section_lower or 'summary' == section_lower:
                result['sceneSummary'] = (
                    f"{result['sceneSummary']} {line}".strip()
                    if result['sceneSummary']
                    else line
                )
            elif 'interpretation' in section_lower:
                result['interpretation'] = (
                    f"{result['interpretation']} {line}".strip()
                    if result['interpretation']
                    else line
                )
            elif 'tags' in section_lower:
                tags = [t.strip() for t in line.split(',') if t.strip()]
                result['tags'].extend(tags)

    for key in list(result.keys()):
        value = result[key]
        if not value:
            result.pop(key)

    final_result = result if result else None
    if final_result:
        print(f"[SceneAnalysis Parser] Returning result with {len(final_result)} sections")
    else:
        print(f"[SceneAnalysis Parser] No valid data found, returning None")

    return final_result

