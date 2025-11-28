import re
from . import common

PROMPT = """You are a document analysis engine. Examine the uploaded document image and return the findings using the exact template below.

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


def _set_metadata_value(sections, key, line):
    if not line:
        return
    existing = sections['metadata'].get(key)
    sections['metadata'][key] = f"{existing} {line}".strip() if existing else line


def parse_response(text):
    if not text:
        return None

    structured_data = common.parse_json_response(text)
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

        key_value_match = common.match_key_value(line)

        if 'document summary' in current_section or current_section == 'document summary':
            sections['summary'] = (
                f"{sections['summary']} {line}".strip()
                if sections['summary']
                else line
            )
            continue

        if 'document metadata' in current_section or 'metadata' in current_section:
            if key_value_match:
                key, value = key_value_match
                sections['metadata'][key] = value
            elif line:
                sections['metadata'].setdefault(current_section.title(), line)
            continue

        if 'document type' in current_section:
            _set_metadata_value(sections, 'Document Type', line)
            continue

        if 'language' in current_section:
            _set_metadata_value(sections, 'Language', line)
            continue

        if 'pages' in current_section:
            _set_metadata_value(sections, 'Pages', line)
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
                    'label': key_value_match[0],
                    'value': key_value_match[1]
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

