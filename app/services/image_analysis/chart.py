from . import common

PROMPT = """You are a chart interpretation engine. Analyze the image and return results using this exact template.

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
Overall Notes: <one sentence on limitations>"""


def parse_response(text):
    if not text:
        return None

    structured_data = common.parse_json_response(text)
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
        key_value_match = common.match_key_value(line)

        if 'chart summary' in section_lower or section_lower == 'summary':
            result['summary'] = (
                f"{result['summary']} {line}".strip()
                if result['summary']
                else line
            )
            continue

        if 'chart type' in section_lower or 'structure' in section_lower:
            if key_value_match:
                key, value = key_value_match
                result['chartType'][key] = value
            else:
                notes = result['chartType'].setdefault('Notes', '')
                result['chartType']['Notes'] = f"{notes} {line}".strip()
            continue

        if 'axis' in section_lower or 'axes' in section_lower or 'label' in section_lower:
            if key_value_match:
                key, value = key_value_match
                result['axes'][key] = value
            continue

        if 'data' in section_lower or 'point' in section_lower or 'table' in section_lower:
            entry = {}
            segments = [seg.strip() for seg in line.split('|') if seg.strip()]
            if segments:
                for seg in segments:
                    seg_match = common.match_key_value(seg)
                    if seg_match:
                        entry[seg_match[0]] = seg_match[1]
            elif key_value_match:
                entry[key_value_match[0]] = key_value_match[1]

            if entry:
                result['dataPoints'].append(entry)
            continue

        if 'insight' in section_lower or 'interpretation' in section_lower:
            insight_text = line.lstrip('-•').strip()
            if insight_text:
                result['insights'].append(insight_text)
            continue

        if 'confidence' in section_lower or 'quality' in section_lower:
            if key_value_match:
                key, value = key_value_match
                result['confidence'][key] = value
            continue

        if 'structure' in section_lower:
            if key_value_match:
                key, value = key_value_match
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

    for key in ['summary', 'chartType', 'axes', 'dataPoints', 'insights', 'structure', 'confidence']:
        if key in result and not result[key]:
            result.pop(key)

    if not result:
        print("[ChartAnalysis Parser] No structured data parsed")
        return None

    result['chartPresent'] = True
    print(f"[ChartAnalysis Parser] Extracted keys: {list(result.keys())}")
    return result

