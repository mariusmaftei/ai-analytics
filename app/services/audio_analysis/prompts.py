"""
Audio Analysis Prompts
Build prompts for different audio analysis types
"""
from typing import Dict


def build_audio_insight_prompt(transcript: str, metadata: Dict, transcription_data: Dict, analysis_type: str = 'overview'):
    """
    Build prompt for audio analysis based on analysis type
    
    Args:
        transcript: Transcribed text
        metadata: Audio metadata (duration, format, etc.)
        transcription_data: Full transcription data from AssemblyAI
        analysis_type: Type of analysis (overview, transcription, summary, content, sentiment, keywords, speakers, actions, timeline, metadata)
        
    Returns:
        str: Formatted prompt for Gemini
    """
    duration = metadata.get('duration', 0)
    format_type = metadata.get('format', 'unknown')
    file_size = metadata.get('file_size', 0)
    
    # Get additional data from transcription
    segments = transcription_data.get('segments', [])
    language = transcription_data.get('language', 'unknown')
    speakers = transcription_data.get('speakers', [])
    chapters = transcription_data.get('chapters', [])
    sentiment_data = transcription_data.get('sentiment', [])
    entities = transcription_data.get('entities', [])
    
    # Get word count from transcription data if available, otherwise count from transcript
    word_count = transcription_data.get('word_count', len(transcript.split()) if transcript else 0)
    
    if analysis_type == 'overview':
        return _build_overview_prompt(transcript, duration, format_type, file_size, language, word_count, len(speakers) if speakers else 0)
    
    elif analysis_type == 'transcription':
        return _build_transcription_prompt(transcript, segments)
    
    elif analysis_type == 'summary':
        return _build_summary_prompt(transcript, duration, word_count)
    
    elif analysis_type == 'content':
        return _build_content_analysis_prompt(transcript, chapters, duration)
    
    elif analysis_type == 'sentiment':
        return _build_sentiment_prompt(transcript, sentiment_data, segments, duration)
    
    elif analysis_type == 'keywords':
        return _build_keywords_prompt(transcript, entities)
    
    elif analysis_type == 'speakers':
        return _build_speakers_prompt(transcript, segments, speakers)
    
    elif analysis_type == 'actions':
        return _build_actions_prompt(transcript, duration)
    
    elif analysis_type == 'timeline':
        return _build_timeline_prompt(transcript, segments, chapters, duration)
    
    elif analysis_type == 'metadata':
        return _build_metadata_prompt(metadata, transcription_data)
    
    else:
        # Default to overview
        return _build_overview_prompt(transcript, duration, format_type, file_size, language, word_count, len(speakers) if speakers else 0)


def _build_overview_prompt(transcript: str, duration: float, format_type: str, file_size: int, language: str, word_count: int, speaker_count: int):
    """Build overview analysis prompt"""
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    file_size_mb = file_size / (1024 * 1024) if file_size else 0
    
    # Check if transcript is empty or placeholder
    is_empty = not transcript or transcript.startswith("[No transcription available")
    
    if is_empty:
        prompt = f"""You are analyzing an audio file. The transcription service was unable to extract text from this audio file.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "fileInfo": {{
    "fileType": "Audio",
    "format": "{format_type.upper()}",
    "duration": "{duration_min} minutes {duration_sec} seconds",
    "fileSize": "{file_size_mb:.2f} MB",
    "language": "{language}",
    "wordCount": null,
    "speakersDetected": null,
    "contentType": "string (Music|Instrumental|Background Audio|etc.)"
  }},
  "description": {{
    "artist": "Unknown",
    "album": "N/A",
    "typeOfMusic": "string or null",
    "genre": "string or null",
    "description": "string (2-3 sentence description)"
  }},
  "keyThemes": ["string"],
  "statistics": {{
    "speakingRate": "N/A",
    "averageWordsPerMinute": "N/A",
    "totalSpeakingTime": "{duration_min}:{duration_sec:02d}",
    "pausesAndSilence": "Unable to determine"
  }}
}}

This could be due to music/instrumental content, background noise, unsupported language, or audio format issues.
"""
    else:
        prompt = f"""You are analyzing an audio file. Provide a comprehensive overview analysis.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "fileInfo": {{
    "fileType": "Audio",
    "format": "{format_type.upper()}",
    "duration": "{duration_min} minutes {duration_sec} seconds",
    "fileSize": "{file_size_mb:.2f} MB",
    "language": "{language}",
    "wordCount": {word_count},
    "speakersDetected": {speaker_count},
    "contentType": "string (Meeting|Interview|Podcast|Lecture|Voice Memo|Music|etc.)"
  }},
  "description": {{
    "artist": "string (CRITICAL: Extract COMPLETE and FULL artist/performer name including BOTH first name AND last name. If only first name mentioned, try to identify complete name from context. If no artist mentioned, use 'Unknown')",
    "album": "string or 'N/A'",
    "typeOfMusic": "string (Classical|Pop|Rock|Jazz|Religious|Instrumental|Speech|etc.) or null",
    "genre": "string or null",
    "description": "string (2-3 sentence description of what the audio is about, who performs it, and key characteristics)"
  }},
  "keyThemes": ["string (3-5 main themes or topics discussed)"],
  "statistics": {{
    "speakingRate": "string (Calculate: word_count / (duration / 60) if duration > 0, else 'N/A', format as 'XXX words/minute')",
    "averageWordsPerMinute": "string (Calculate: word_count / (duration / 60) if duration > 0, else 'N/A')",
    "totalSpeakingTime": "{duration_min}:{duration_sec:02d}",
    "pausesAndSilence": "string (Estimate based on transcript or 'Unable to determine')"
  }}
}}

Requirements:
- Extract complete artist/performer name (first + last name) from transcript
- Calculate speaking rate and words per minute from actual data
- Identify content type, themes, and purpose
- All fields can be null if not available

Transcript:
{transcript[:5000]}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_transcription_prompt(transcript: str, segments: list):
    """Build transcription display prompt"""
    prompt = f"""Format this audio transcription with timestamps and clear structure.

Return the transcription in this format:

SECTION: Full Transcript
[Complete transcript text]

SECTION: Timestamped Segments
[For each segment, format as:]
[MM:SS - MM:SS] [Speaker if available]: [Text]

Example:
[00:00 - 00:15] Speaker 1: Welcome everyone to today's meeting.

{transcript[:10000]}

Segments Data:
{str(segments[:20]) if segments else 'No segments available'}

Format the transcription clearly with proper timestamps.
"""
    return prompt


def _build_summary_prompt(transcript: str, duration: float, word_count: int):
    """Build summary analysis prompt - Returns JSON format"""
    duration_min = int(duration // 60)
    
    # Check if transcript is empty or contains only music/no speech
    is_empty_or_music = not transcript or len(transcript.strip()) < 10 or transcript.strip().lower() in [
        "[no transcription available - audio may contain music, background noise, or unsupported language]",
        "no transcription available",
        "no speech detected"
    ]
    
    if is_empty_or_music:
        prompt = f"""This audio contains no spoken content or lyrics.

Duration: {duration_min} minutes
Word Count: {word_count}

CRITICAL: You MUST return ONLY valid JSON. Return this structure:
{{
  "executiveSummary": "This audio contains no spoken content or lyrics, so a summary is not available.",
  "keyPoints": []
}}
"""
        return prompt
    
    prompt = f"""Analyze this audio transcript and provide a SUMMARY.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "executiveSummary": "string (3-6 sentence narrative paragraph describing what the audio is about, topics discussed, purpose/context, overall message, and optional tone)",
  "keyPoints": [
    "string (main topics, decisions, facts, ideas, themes, or action items)"
  ]
}}

Requirements:
- Executive Summary: Write a 3-6 sentence narrative paragraph (NOT bullet points)
- Key Points: Create an array of 5-10 clear and concise key points
- The Summary is NOT a transcription, NOT metadata, NOT sentiment
- It is a CONDENSED EXPLANATION of what the audio is about
- Include main topics, major decisions, important facts, key ideas, themes, and action items

Duration: {duration_min} minutes
Word Count: {word_count}

Transcript:
{transcript[:8000]}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_content_analysis_prompt(transcript: str, chapters: list, duration: float):
    """Build content analysis prompt - Returns JSON format"""
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Analyze the content structure and themes of this audio transcription.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "topicClusters": [
    {{
      "topic": "string",
      "description": "string or null",
      "keywords": ["string"] or null
    }}
  ],
  "discussionFlow": [
    {{
      "timestamp": "string (MM:SS format) or null",
      "topic": "string",
      "description": "string or null"
    }}
  ],
  "keyConcepts": [
    "string"
  ]
}}

Requirements:
- Create topic clusters/buckets with descriptions and related keywords
- Create a timeline showing how topics progress over time
- Identify key concepts mentioned in the audio
- All arrays can be empty if no data is found

Duration: {duration_min} minutes {duration_sec} seconds

Transcript:
{transcript[:8000]}

Chapters: {str(chapters[:10]) if chapters else 'None'}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_sentiment_prompt(transcript: str, sentiment_data: list, segments: list, duration: float = 0):
    """Build sentiment analysis prompt - Returns JSON format"""
    # Use provided duration, or calculate from segments if available, otherwise estimate from transcript
    if duration and duration > 0:
        duration_sec = duration
    elif segments and len(segments) > 0:
        duration_sec = segments[-1].get('end', 0) if segments else 0
    else:
        # Estimate: assume average speaking rate of 150 words per minute
        word_count = len(transcript.split()) if transcript else 0
        duration_sec = (word_count / 150) * 60 if word_count > 0 else 0
    
    duration_min = int(duration_sec // 60)
    duration_sec_remainder = int(duration_sec % 60)
    total_seconds = int(duration_sec)
    
    prompt = f"""Analyze the sentiment and emotional tone of this audio transcription.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "overallSentiment": {{
    "label": "string (Positive|Negative|Neutral)",
    "score": number (0.0-1.0)
  }},
  "emotionBreakdown": [
    {{
      "emotion": "string (Joy|Calmness|Sadness|Fear|Anger|etc.)",
      "percentage": number (0-100),
      "intensity": number (0.0-1.0) or null
    }}
  ],
  "sentimentTimeline": [
    {{
      "timestamp": "string (MM:SS format)",
      "sentiment": "string",
      "score": number (0.0-1.0) or null,
      "transcript": "string or null"
    }}
  ]
}}

Requirements:
- Calculate overall sentiment score (0.0-1.0) and label (Positive/Negative/Neutral)
- Break down emotions with percentages that add up to approximately 100%
- Create sentiment timeline entries covering the ENTIRE duration from 00:00 to {duration_min}:{duration_sec_remainder:02d}
- Divide timeline into logical segments (10-30 second intervals, or longer if sentiment is consistent)
- The last entry MUST end at or near {duration_min}:{duration_sec_remainder:02d}
- Include enough entries to cover the full duration (aim for 10-20 entries for longer audio)
- All arrays can be empty if no data is found

Duration: {duration_min} minutes {duration_sec_remainder} seconds ({total_seconds} seconds total)

Transcript:
{transcript[:8000]}

Sentiment Data: {str(sentiment_data[:10]) if sentiment_data else 'None'}
Segments: {str(segments[:5]) if segments else 'None'}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_keywords_prompt(transcript: str, entities: list):
    """Build keywords extraction prompt - Returns JSON format"""
    prompt = f"""Extract keywords and important terms from this audio transcription.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "keywords": [
    {{
      "keyword": "string",
      "relevanceScore": 0.0-1.0,
      "frequency": number,
      "firstOccurrence": "MM:SS" or null
    }}
  ],
  "keyPhrases": [
    {{
      "phrase": "string",
      "relevanceScore": 0.0-1.0,
      "frequency": number
    }}
  ],
  "namedEntities": [
    {{
      "entity": "string",
      "type": "PERSON|ORGANIZATION|LOCATION|PRODUCT" or null,
      "frequency": number
    }}
  ],
  "keywordClusters": [
    {{
      "clusterName": "string",
      "keywords": ["string"],
      "description": "string" or null
    }}
  ]
}}

Requirements:
- Extract the 10-15 most important keywords
- Calculate relevance scores (0.0-1.0) based on frequency and importance
- Include first occurrence timestamp in MM:SS format if available
- Group related keywords into clusters
- Identify named entities (people, organizations, locations, products)
- All arrays can be empty if no data is found

Transcript:
{transcript[:8000]}

Entities: {str(entities[:20]) if entities else 'None'}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_speakers_prompt(transcript: str, segments: list, speakers: list):
    """Build speaker analysis prompt - Returns JSON format"""
    duration = 0
    if segments and len(segments) > 0:
        duration = segments[-1].get('end', 0) if segments else 0
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Analyze the speakers and their participation in this audio transcription.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "speakers": [
    {{
      "speakerId": "string (e.g., 'Speaker A', 'Speaker B')",
      "speakerLabel": "string or null",
      "speakingTime": number (seconds),
      "percentage": number (0-100),
      "segments": number or null,
      "avgSegmentLength": number (seconds) or null,
      "notes": "string or null"
    }}
  ],
  "timeline": [
    {{
      "startTime": number (seconds),
      "endTime": number (seconds),
      "speakerId": "string",
      "transcript": "string or null"
    }}
  ],
  "conversationPatterns": [
    "string (pattern description)"
  ]
}}

Requirements:
- Identify all speakers and calculate their speaking time in seconds
- Calculate percentage of total speaking time for each speaker
- Create timeline entries for each speaking segment
- Identify conversation patterns (dominance, interruptions, turn-taking, etc.)
- All arrays can be empty if no data is found

Duration: {duration_min} minutes {duration_sec} seconds

Transcript:
{transcript[:8000]}

Segments: {str(segments[:20]) if segments else 'None'}
Speakers: {str(speakers[:10]) if speakers else 'None'}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_actions_prompt(transcript: str, duration: float):
    """Build action items extraction prompt - Returns JSON format"""
    prompt = f"""Extract action items, decisions, and deadlines from this audio transcription.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "actionItems": [
    {{
      "task": "string",
      "assignedTo": "string or null",
      "deadline": "string or null",
      "priority": "string (High|Medium|Low) or null",
      "timestamp": "string (MM:SS format) or null",
      "notes": "string or null"
    }}
  ],
  "decisions": [
    {{
      "decision": "string",
      "timestamp": "string (MM:SS format) or null"
    }}
  ],
  "deadlines": [
    {{
      "deadline": "string",
      "date": "string or null",
      "timestamp": "string (MM:SS format) or null"
    }}
  ]
}}

Requirements:
- Extract all actionable tasks with assignees, deadlines, and priorities when mentioned
- Extract all decisions, agreements, or conclusions with timestamps
- Extract all dates, deadlines, or time-sensitive items mentioned
- Use null for missing fields (assignee, deadline, etc.)
- Include timestamps in MM:SS format when available
- All arrays can be empty if no data is found

Transcript:
{transcript[:8000]}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_timeline_prompt(transcript: str, segments: list, chapters: list, duration: float):
    """Build timeline analysis prompt - Returns JSON format"""
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Create a comprehensive timeline of the discussion with key moments, speaker activity, and important events.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any markdown, explanations, or text outside the JSON object. Wrap the JSON in a markdown code block with ```json.

Expected JSON structure:
{{
  "timeline": [
    {{
      "startTime": "string (MM:SS format)",
      "endTime": "string (MM:SS format)",
      "speaker": "string or null",
      "topic": "string or null",
      "transcript": "string or null"
    }}
  ],
  "keyMoments": [
    {{
      "timestamp": "string (MM:SS format)",
      "type": "string (Decision|Action|TopicShift|Emotional|Keyword|Insight) or null",
      "description": "string",
      "transcript": "string or null"
    }}
  ],
  "topicTransitions": [
    {{
      "timestamp": "string (MM:SS format)",
      "fromTopic": "string or null",
      "toTopic": "string",
      "trigger": "string or null"
    }}
  ],
  "transcriptHighlights": [
    {{
      "timestamp": "string (MM:SS format)",
      "text": "string",
      "type": "string (Decision|Action|Topic|Emotional) or null",
      "iconLabel": "string or null"
    }}
  ]
}}

Requirements:
- Create timeline entries covering the ENTIRE duration from 00:00 to {duration_min}:{duration_sec:02d}
- Include all major segments with speaker, topic, and transcript excerpts
- Identify and timestamp all key moments (decisions, actions, topic shifts, emotional moments)
- Note all topic transitions with timestamps and triggers
- Create synchronized transcript highlights with timestamps
- All arrays can be empty if no data is found

Duration: {duration_min} minutes {duration_sec} seconds ({duration} seconds total)

Transcript:
{transcript[:8000]}

Segments: {str(segments[:30]) if segments else 'None'}
Chapters: {str(chapters[:10]) if chapters else 'None'}

Return ONLY the JSON object, wrapped in ```json code block.
"""
    return prompt


def _build_metadata_prompt(metadata: Dict, transcription_data: Dict):
    """Build metadata display prompt"""
    duration = metadata.get('duration', 0)
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    file_size_mb = metadata.get('file_size', 0) / (1024*1024) if metadata.get('file_size') else 0
    
    prompt = f"""Provide detailed metadata about this audio file.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: File Information
File Name: [Extract from filename if available, otherwise "Unknown"]
File Type: {metadata.get('format', 'unknown').upper()}
File Size: {file_size_mb:.2f} MB
Duration: {duration_min}:{duration_sec:02d}
Uploaded On: [Current date or "N/A"]

SECTION: Technical Details
Format: {metadata.get('format', 'unknown').upper()}
Sample Rate: {metadata.get('sample_rate', 'N/A') if metadata.get('sample_rate') else 'N/A'} Hz
Bitrate: {metadata.get('bitrate', 'N/A') if metadata.get('bitrate') else 'N/A'} kbps
Channels: {metadata.get('channels', 'N/A') if metadata.get('channels') else 'N/A'} ({'Stereo' if metadata.get('channels') == 2 else 'Mono' if metadata.get('channels') == 1 else 'N/A'})
Encoding: {('MP3' if metadata.get('format', '').lower() == 'mp3' else 'PCM' if metadata.get('format', '').lower() == 'wav' else 'AAC' if metadata.get('format', '').lower() == 'm4a' else 'N/A')}
Loudness: {metadata.get('loudness', 'N/A') if metadata.get('loudness') is not None else 'N/A'} LUFS
Peak Level: {metadata.get('peak_level', 'N/A') if metadata.get('peak_level') is not None else 'N/A'} dB
Noise Level: {metadata.get('noise_level', 'N/A') if metadata.get('noise_level') is not None else 'N/A'} dB
Dynamic Range: {metadata.get('dynamic_range', 'N/A') if metadata.get('dynamic_range') is not None else 'N/A'} dB

SECTION: Audio Properties
Channel Breakdown: [If stereo, provide left/right channel levels or "N/A"]
Waveform Characteristics: [Brief description of audio characteristics or "N/A"]

SECTION: AI Analysis Quality
Analysis Confidence: [Calculate 0.00-1.00 score based on transcription quality: high word count and clear transcript = 0.85-0.95, medium = 0.70-0.84, low = 0.50-0.69]
Audio Clarity: [Assess based on transcription quality: High if transcript is clear and complete, Medium if partial, Low if poor quality]
Speech Detection: [Calculate percentage based on transcription: If word_count > 0 and duration > 0, estimate as: min(100, round((word_count / duration * 60 / 150) * 100)). If transcript exists and has words, use 85-95%. If no transcript or 0 words, use "N/A". NEVER output "0%" if there is a transcript with words.]

SECTION: Transcription Metadata
Language: {transcription_data.get('language', 'unknown')}
Word Count: {len(transcription_data.get('transcript', '').split()) if transcription_data.get('transcript') else 0}
Speaker Labels: {'Enabled' if transcription_data.get('speakers') else 'Disabled'}
Transcription Method: AssemblyAI

SECTION: Optional Metadata
Artist: [If mentioned in transcript or metadata, otherwise "N/A"]
Album: [If mentioned, otherwise "N/A"]
Title: [If mentioned, otherwise "N/A"]
Genre: [If identifiable, otherwise "N/A"]
Recording Device: [If mentioned, otherwise "N/A"]
GPS Location: [If available, otherwise "N/A"]

Provide all available metadata in a structured format.
"""
    return prompt

