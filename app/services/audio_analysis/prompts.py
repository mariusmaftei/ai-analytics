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
        prompt = f"""You are analyzing an audio file. The transcription service was unable to extract text from this audio file. This could be due to:
- Music or instrumental content without clear speech
- Background noise or poor audio quality
- Language not supported by the transcription service (e.g., Latin, ancient languages)
- Audio format issues

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Audio Overview
File Type: Audio
Format: {format_type.upper()}
Duration: {duration_min} minutes {duration_sec} seconds
File Size: {file_size_mb:.2f} MB
Language Detected: {language}
Transcription Status: No transcription available
Content Type: [Based on filename and metadata, suggest: Music, Instrumental, Background Audio, etc.]

SECTION: Analysis Based on Metadata
File Information: [Analyze the filename, duration, and format to provide insights]
Possible Content Type: [Suggest what type of audio this might be based on metadata]
Estimated Characteristics: [Based on duration and format, provide educated guesses about the audio]

SECTION: Recommendations
Transcription Limitation: [Explain why transcription might have failed]
Alternative Analysis: [Suggest what could be analyzed instead - metadata, audio characteristics, etc.]
Next Steps: [Recommendations for better transcription if possible]
"""
    else:
        prompt = f"""You are analyzing an audio file. Provide a comprehensive overview analysis.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT - Use this EXACT structure:

SECTION: Audio Overview
File Type: Audio
Format: {format_type.upper()}
Duration: {duration_min} minutes {duration_sec} seconds
File Size: {file_size_mb:.2f} MB
Language: {language}
Word Count: {word_count}
Speakers Detected: {speaker_count}
Content Type: [Identify the type - Meeting, Interview, Podcast, Lecture, Voice Memo, Music, etc.]

SECTION: Audio Description
Artist/Performer: [CRITICAL: Extract the COMPLETE and FULL artist/performer name including BOTH first name AND last name (e.g., "Mirusia Louwerse" not just "Merusia" or "Mirusia"). Search the transcript carefully for the full name. If only a first name is mentioned, try to identify the complete name from context, introductions, or announcements. If the full name cannot be determined from the audio, use the name as mentioned. If no artist is mentioned, use "Unknown"]
Album/Collection: [Extract album name, collection, or source if mentioned, otherwise "N/A"]
Type of Music/Content: [Classical, Pop, Rock, Jazz, Religious, Instrumental, Speech, etc. - based on transcript analysis]
Genre: [Identify the genre or category]
Description: [Write ONLY a brief 2-3 sentence description. Do NOT include any SECTION: markers or repeat other sections. Just describe what the audio is about, who performs it (mention full name if available), and key characteristics. End the description with a period and then move to the next section.]

SECTION: Key Statistics
Speaking Rate: [Calculate: word_count / (duration / 60) if duration > 0, else "N/A", format as "XXX words/minute" or "N/A"]
Average Words per Minute: [Calculate: word_count / (duration / 60) if duration > 0, else "N/A"]
Total Speaking Time: {duration_min}:{duration_sec:02d}
Pauses and Silence: [Estimate based on transcript - mention if there are long pauses, or "Unable to determine" if no transcript]

SECTION: Content Summary
Main Topic: [1-2 sentence description of what the audio is about]
Key Themes: [List 3-5 main themes or topics discussed]
Purpose: [What is the purpose of this audio - meeting notes, interview, presentation, etc.]

SECTION: Participants
Number of Speakers: {speaker_count}
Speaker Distribution: [If multiple speakers, describe who speaks most/least]
Interaction Type: [Monologue, Dialogue, Group Discussion, etc.]

SECTION: Quality Assessment
Audio Quality: [Good/Fair/Poor - based on transcript clarity]
Clarity: [Clear/Moderate/Unclear]
Background Noise: [None/Low/Moderate/High - estimate]
Completeness: [Complete/Partial - based on transcript]

SECTION: AI Summary
This {duration_min}-minute audio recording contains [detailed 2-3 sentence description]. The main focus is on [key topic]. Key participants include [speaker info if available]. The discussion covers [main themes].

CRITICAL REQUIREMENTS:
1. Start EVERY section with "SECTION: [Section Name]" on its own line
2. Use colons (:) for key-value pairs
3. Use dashes (-) for ALL bullet points
4. NO markdown symbols (**, |, ✅, ❌) - use plain text only
5. Calculate ALL numbers from the actual data provided
6. Include ALL 6 sections
7. Each section must be clearly separated with blank lines
8. Be thorough and detailed

Transcript:
{transcript[:5000]}

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
    """Build summary analysis prompt"""
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

IMPORTANT: Return ONLY this exact message:
"This audio contains no spoken content or lyrics, so a summary is not available."
"""
        return prompt
    
    prompt = f"""Analyze this audio transcript and provide a SUMMARY.

IMPORTANT: 
- Return clean, readable text WITHOUT markdown symbols.
- The Summary is NOT a transcription, NOT metadata, NOT sentiment.
- It is a CONDENSED EXPLANATION of what the audio is about.

MANDATORY FORMAT - CRITICAL: You MUST include a newline after each SECTION: header:

SECTION: Executive Summary
[Write a 3-6 sentence narrative paragraph describing:
- What the audio is about
- What topics were discussed
- The purpose or context
- The overall message
- Optional: overall tone (if clear)

Example format: "This audio contains a [duration] [type: meeting/interview/podcast/song] [description]. [Topics discussed]. [Purpose/context]. [Overall message]. [Optional tone]."]

SECTION: Key Points
[Create a bulleted list containing:
- Main topics discussed
- Major decisions (if any)
- Important facts mentioned
- Key ideas or themes
- Action items (if any)

Use bullet points (one per line) starting with "-" or "*".
Each bullet should be clear and concise.
Include 5-10 key points total.]

IMPORTANT: Always put a newline after "SECTION: Executive Summary" and "SECTION: Key Points" before the content starts.

Duration: {duration_min} minutes
Word Count: {word_count}

Transcript:
{transcript[:8000]}

Provide ONLY the Executive Summary and Key Points sections. Do not include other sections.
"""
    return prompt


def _build_content_analysis_prompt(transcript: str, chapters: list, duration: float):
    """Build content analysis prompt"""
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Analyze the content structure and themes of this audio.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Main Topics
[Create topic clusters/buckets. Each topic should be on a new line in format: "Topic Name: Brief description"
Example:
Theme: Spiritual devotion and reverence
Vocal Style: Classical, operatic performance
Musical Elements: Gentle, slow tempo, reverent tone]

SECTION: Topic Hierarchy
[Create a hierarchical breakdown of topics. Format:
Main Topic Name
- Subtopic 1
- Subtopic 2
Another Main Topic
- Subtopic 1
- Subtopic 2]

SECTION: Discussion Flow
[Create a timeline showing how topics progress. Format each entry as:
MM:SS - Description of what happens at this time
Example:
00:00 - Opening invocation
00:12 - Main melodic theme introduction
00:40 - Vocal rise and emotional peak
01:15 - Second refrain begins]

SECTION: Theme Summary
[Write a 2-3 sentence summary paragraph focusing on the core themes, emotional tone, and overall message. Do NOT include timestamps or bullet points - just a flowing narrative paragraph.]

SECTION: Key Concepts
[Create a list of key concepts. Format each as:
Concept Name: Category: Relevance (High/Medium/Low)
Example:
Devotion: Theme: High
Reverence: Emotion: High
Classical vocals: Technique: High]

Duration: {duration_min} minutes {duration_sec} seconds

Transcript:
{transcript[:8000]}

Chapters: {str(chapters[:10]) if chapters else 'None'}

Provide detailed analysis with all sections above.
"""
    return prompt


def _build_sentiment_prompt(transcript: str, sentiment_data: list, segments: list, duration: float = 0):
    """Build sentiment analysis prompt"""
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
    
    prompt = f"""Analyze the sentiment and emotional tone of this audio.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Overall Sentiment
Sentiment Score: [Format as "Positive 0.78" or "Negative 0.45" or "Neutral 0.50" - include both label and numeric score 0-1]
Emotional Tone: [Confident, Concerned, Enthusiastic, Neutral, Joyful, etc.]
Emotional Intensity: [High/Medium/Low - based on the strength of emotions detected]

SECTION: Emotional Indicators
[Create a breakdown showing percentage of each emotion detected. Format each as:
Joy: 62%
Calmness: 21%
Sadness: 12%
Fear: 4%
Anger: 1%
Include all emotions that are present, with percentages that add up to approximately 100%]

SECTION: Sentiment by Segment
[Create a timeline showing sentiment changes over time. Format each entry as:
MM:SS–MM:SS → Sentiment Label
Example:
00:00–00:30 → Neutral
00:30–01:10 → Positive
01:10–02:00 → Very Positive
02:00–02:30 → Slightly Sad

CRITICAL: The audio duration is {duration_min}:{duration_sec_remainder:02d} ({total_seconds} seconds total). You MUST provide sentiment timeline entries that cover the ENTIRE duration from 00:00 to {duration_min}:{duration_sec_remainder:02d}. 
- Divide the timeline into logical segments (typically 10-30 second intervals, or longer if sentiment is consistent)
- The last entry MUST end at or near {duration_min}:{duration_sec_remainder:02d}
- Include enough entries to cover the full duration (aim for 10-20 entries for longer audio)
- Each segment should represent a meaningful change in sentiment or emotion]

Transcript:
{transcript[:8000]}

Sentiment Data: {str(sentiment_data[:10]) if sentiment_data else 'None'}
Segments: {str(segments[:5]) if segments else 'None'}

Provide detailed sentiment analysis with all sections above. Ensure the Sentiment by Segment section covers the complete duration.
"""
    return prompt


def _build_keywords_prompt(transcript: str, entities: list):
    """Build keywords extraction prompt"""
    prompt = f"""Extract keywords and important terms from this audio.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Top Keywords
[Create a list of the 10-15 most important keywords. Format each as:
Keyword: Relevance Score (0.00-1.00): Frequency: First Occurrence (MM:SS)
Example:
Ave: 0.98: 12: 00:04
Maria: 0.96: 12: 00:06
Prayer: 0.75: 2: 02:00
Grace: 0.62: 3: 01:15
Include relevance score (0.00-1.00), frequency count, and first occurrence timestamp if available.]

SECTION: Key Phrases
[List important phrases and expressions used. Format each as:
Phrase: Relevance Score: Frequency
Example:
Ave Maria: 0.95: 8
Gratia plena: 0.88: 4]

SECTION: Named Entities
[People, companies, products, locations mentioned. Format each as:
Entity Name: Type (Person/Company/Location/Product): Relevance Score
Example:
Franz Schubert: Person: 0.92
Merusia: Person: 0.85
Australia: Location: 0.70]

SECTION: Keyword Clusters
[Group keywords into topic clusters. Format as:
Cluster Name: Keyword1, Keyword2, Keyword3
Example:
Spiritual: Ave, Maria, Prayer, Grace, Holy
Musical Elements: soprano, chorus, harmony, melody
Use clear cluster names and group related keywords together.]

Transcript:
{transcript[:8000]}

Entities: {str(entities[:20]) if entities else 'None'}

Provide detailed keyword extraction with all sections above. Ensure relevance scores are between 0.00 and 1.00.
"""
    return prompt


def _build_speakers_prompt(transcript: str, segments: list, speakers: list):
    """Build speaker analysis prompt"""
    duration = 0
    if segments and len(segments) > 0:
        duration = segments[-1].get('end', 0) if segments else 0
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Analyze the speakers and their participation in this audio.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Speaker Overview
Number of Speakers: [Count]
Speaker Identification: [List each speaker as "Speaker A", "Speaker B", etc. or by name if identifiable]

SECTION: Speaking Time Distribution
[Format each speaker as:
Speaker A: Total Time (MM:SS): Percentage (%): Average Sentence Length (words): Number of Segments
Example:
Speaker A: 3:20: 55%: 7 words: 12 segments
Speaker B: 2:40: 45%: 4 words: 15 segments
Include all speakers with their speaking time, percentage, average sentence length, and segment count.]

SECTION: Speaker Timeline
[Create a timeline showing when each speaker talks. Format as:
MM:SS-MM:SS: Speaker Label: [Brief description or transcript excerpt]
Example:
00:00-00:15: Speaker A: Opening introduction
00:15-00:30: Speaker B: Response and question
00:30-00:45: Speaker A: Detailed explanation
Include all speaking segments in chronological order.]

SECTION: Conversation Patterns
[Provide insights about the conversation. Format as:
- [Pattern description]
- [Another pattern]
Example:
- Speaker A talked more (55% of total time)
- Speaker B spoke in shorter bursts (average 4 words per sentence)
- 3 interruptions detected between speakers
- Longest monologue: 42 seconds (Speaker A at 01:15-01:57)
- Back-and-forth exchange pattern detected between 01:10-02:00
- Speaker A dominated the first half, Speaker B more active in second half]

SECTION: Speaker Breakdown
[Create detailed breakdown. Format each as:
Speaker Label: Total Time: Percentage: Segments: Avg Segment Length: Notes
Example:
Speaker A: 3:20: 55%: 12: 15 sec: Dominant speaker, longer monologues
Speaker B: 2:40: 45%: 15: 8 sec: Reactive speaker, frequent short responses]

Duration: {duration_min} minutes {duration_sec} seconds

Transcript:
{transcript[:8000]}

Segments: {str(segments[:20]) if segments else 'None'}
Speakers: {str(speakers[:10]) if speakers else 'None'}

Provide detailed speaker analysis with all sections above.
"""
    return prompt


def _build_actions_prompt(transcript: str, duration: float):
    """Build action items extraction prompt"""
    prompt = f"""Extract action items, decisions, and deadlines from this audio.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Action Items
[Format each task as:
Task Name: Assigned To: Deadline: Priority (High/Medium/Low): Timestamp (MM:SS): Notes/Transcript Snippet
Example:
Prepare monthly sales report: Sarah: March 12, 2025: High: 02:15: Discussed during Q1 review
Email supplier about delays: John: —: Medium: 03:12: Need to follow up on shipping issues
Schedule next meeting: —: March 20, 2025: Low: 04:45: Team agreed to meet next week
If assignee is not mentioned, use "—". If deadline is not mentioned, use "—". Include timestamp where the task was mentioned.]

SECTION: Decisions Made
[Format each decision as:
Decision Description: Timestamp (MM:SS)
Example:
Proceed with new supplier (voted 3–1): 05:30
Approve Q2 marketing budget: 07:15
Include all decisions, agreements, or conclusions with timestamps when available.]

SECTION: Deadlines Mentioned
[Format each deadline as:
Deadline Description: Date: Timestamp (MM:SS)
Example:
Monthly sales report due: March 12, 2025: 02:15
Next team meeting: March 20, 2025: 04:45
Include all dates, deadlines, or time-sensitive items mentioned in the audio.]

SECTION: Follow-up Items
[Format each follow-up as:
Follow-up Description: Timestamp (MM:SS)
Example:
Review supplier proposals: 06:00
Discuss budget allocation: 08:30
List items that need follow-up or future discussion.]

Transcript:
{transcript[:8000]}

Be thorough in extracting all actionable items, decisions, and deadlines. Include timestamps whenever possible.
"""
    return prompt


def _build_timeline_prompt(transcript: str, segments: list, chapters: list, duration: float):
    """Build timeline analysis prompt"""
    duration_min = int(duration // 60)
    duration_sec = int(duration % 60)
    
    prompt = f"""Create a comprehensive timeline of the discussion with key moments, speaker activity, and important events.

IMPORTANT: Return clean, readable text WITHOUT markdown symbols (no **, no |, no ✅, no ❌). Use plain text with clear section headers.

MANDATORY FORMAT:

SECTION: Discussion Timeline
[Create a timeline showing speaker activity segments. Format each as:
MM:SS-MM:SS: Speaker Label: Topic/Description: Transcript Snippet
Example:
00:00-02:15: Speaker A: Opening introduction: Welcome everyone to today's meeting
02:15-04:30: Speaker B: Project updates: We've completed phase one
04:30-06:00: Speaker A: Discussion: Let's review the budget
Include all major segments with speaker, topic, and brief transcript excerpt.]

SECTION: Key Moments
[Identify and timestamp important moments. Format each as:
Type (Decision/Action/TopicShift/Emotional/Keyword/Insight): MM:SS: Description: Transcript Snippet
Example:
Decision: 03:12: Switch to new supplier: We should switch to the new supplier
Action: 04:45: Schedule next meeting: Let's schedule next meeting on March 20
TopicShift: 06:30: Budget discussion: The main issue is delayed shipments
Emotional: 08:15: Frustration expressed: This is unacceptable
Include all key moments with type, timestamp, description, and transcript snippet.]

SECTION: Topic Transitions
[Note when topics change. Format each as:
MM:SS: From Topic → To Topic: Trigger/Reason
Example:
06:30: Project Updates → Budget Discussion: Speaker A asked about budget
09:45: Budget Discussion → Action Items: Team agreed to review next week
Include all topic transitions with timestamps and triggers.]

SECTION: Transcript Highlights
[Create a synchronized list of important transcript excerpts. Format each as:
MM:SS: Transcript Text: Type (Decision/Action/Topic/Emotional): Icon Label
Example:
03:12: "We should switch to the new supplier.": Decision: Decision
04:45: "Let's schedule next meeting on March 20.": Action: Action
06:30: "The main issue is delayed shipments.": Topic: Topic Shift
Include timestamps, transcript text, type, and icon label for synchronization.]

Duration: {duration_min} minutes {duration_sec} seconds ({duration} seconds total)

Transcript:
{transcript[:8000]}

Segments: {str(segments[:30]) if segments else 'None'}
Chapters: {str(chapters[:10]) if chapters else 'None'}

Provide a comprehensive timeline with all sections above. Ensure timestamps cover the entire duration from 00:00 to {duration_min}:{duration_sec:02d}.
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
Loudness: N/A
Peak Level: N/A
Noise Level: N/A
Dynamic Range: N/A

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

