/**
 * Audio Parsing Regex Patterns
 * 
 * Centralized regex patterns for parsing audio analysis data.
 * These patterns are compiled once and reused to improve performance.
 */

// ============================================================================
// KEYWORD EXTRACTION PATTERNS
// ============================================================================

/**
 * Main keyword pattern: "Keyword: score: frequency: timestamp"
 * Example: "Ave: 0.99: 4: 00:02"
 */
export const KEYWORD_PATTERN = /^([^:]+):\s*([\d.]+):\s*(\d+):\s*(\d{1,2}:\d{2})/;

/**
 * Alternative keyword pattern without timestamp: "Keyword: score: frequency"
 * Example: "Ave: 0.99: 4"
 */
export const KEYWORD_PATTERN_ALT = /^([^:]+):\s*([\d.]+):\s*(\d+)/;

/**
 * Key phrase pattern: "Phrase: score: frequency"
 * Example: "Ave Maria: 1.00: 4"
 */
export const KEY_PHRASE_PATTERN = /^([^:]+):\s*([\d.]+):\s*(\d+)/;

/**
 * Named entity pattern: "Entity: type: score"
 * Example: "Schubert: Person: 0.95"
 */
export const NAMED_ENTITY_PATTERN = /^([^:]+):\s*([^:]+):\s*([\d.]+)/;

/**
 * Keyword cluster pattern: "Cluster Name: keyword1, keyword2, keyword3"
 */
export const KEYWORD_CLUSTER_PATTERN = /^([^:]+):\s*(.+)$/;

// ============================================================================
// SPEAKER ANALYSIS PATTERNS
// ============================================================================

/**
 * Speaker breakdown pattern: "Speaker: time: percentage: segments: avgLength: notes"
 * Example: "Speaker A: 0:11: 3.6%: 12: 0.92 sec: Introduced the song"
 */
export const SPEAKER_BREAKDOWN_PATTERN = /^([^:]+):\s*(\d{1,2}:\d{2}):\s*([\d.]+)%:\s*(\d+):\s*([\d.]+)\s*sec:\s*(.+)$/;

/**
 * Speaker timeline pattern: "startTime-endTime: Speaker: topic: transcript"
 * Example: "00:00-03:53: Speaker A: Introduction: Van Frans Schubert"
 */
export const SPEAKER_TIMELINE_PATTERN = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*([^:]+):\s*([^:]+):\s*(.+)$/;

/**
 * Conversation pattern: Simple bullet point format
 * Example: "- Speaker A talked more (55%)"
 */
export const CONVERSATION_PATTERN = /^[-•*]\s*(.+)$/;

// ============================================================================
// TIMELINE PATTERNS
// ============================================================================

/**
 * Discussion timeline pattern: "startTime-endTime: Speaker: Topic: Transcript"
 * Example: "00:00-03:53: Speaker A: Introduction: Van Frans Schubert"
 */
export const DISCUSSION_TIMELINE_PATTERN = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*([^:]+?):\s*([^:]+?):\s*(.+)$/;

/**
 * Discussion timeline pattern (simple): "startTime-endTime: Description"
 * Example: "00:00-03:53: Introduction to the song"
 */
export const DISCUSSION_TIMELINE_SIMPLE_PATTERN = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*(.+)$/;

/**
 * Discussion timeline pattern (global, for concatenated entries)
 * Used with matchAll to find all timeline entries in concatenated text
 */
export const DISCUSSION_TIMELINE_GLOBAL_PATTERN = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2}):\s*((?:(?!\d{1,2}:\d{2}-\d{1,2}:\d{2}).)+?)(?=\d{1,2}:\d{2}-\d{1,2}:\d{2}|$)/gi;

/**
 * Key moment pattern: "Type: timestamp: description: transcript"
 * Example: "Emotional: 07:74: Speaker A praises the singer: Zingen werkelijk"
 */
export const KEY_MOMENT_PATTERN = /^([^:]+):\s*(\d{1,2}:\d{2}):\s*([^:]+):\s*(.+)$/;

/**
 * Key moment pattern (global, for concatenated entries)
 * Used with matchAll to find all key moments in concatenated text
 */
export const KEY_MOMENT_GLOBAL_PATTERN = /(Decision|Action|TopicShift|Emotional|Keyword|Insight):\s*(\d{1,2}:\d{2}):\s*((?:(?!(?:Decision|Action|TopicShift|Emotional|Keyword|Insight):\s*\d{1,2}:\d{2}).)+?)(?=(?:Decision|Action|TopicShift|Emotional|Keyword|Insight):\s*\d{1,2}:\d{2}|$)/gi;

/**
 * Topic transition pattern: "timestamp: fromTopic → toTopic: trigger"
 * Example: "00:00: None → Introduction: Speaker A introduces the song"
 */
export const TOPIC_TRANSITION_PATTERN = /^(\d{1,2}:\d{2}):\s*([^→]+)\s*→\s*([^:]+):\s*(.+)$/;

/**
 * Topic transition pattern (global, for concatenated entries)
 * Used with matchAll to find all topic transitions in concatenated text
 */
export const TOPIC_TRANSITION_GLOBAL_PATTERN = /(\d{1,2}:\d{2}):\s*((?:(?!\d{1,2}:\d{2}:).)+?)(?=\d{1,2}:\d{2}:|$)/gi;

/**
 * Transcript highlight pattern: "timestamp: text: type: iconLabel"
 * Example: "00:00: Van Frans Schubert: Topic: Introduction"
 */
export const TRANSCRIPT_HIGHLIGHT_PATTERN = /^(\d{1,2}:\d{2}):\s*(.+?):\s*(Decision|Action|Topic|Emotional):\s*(.+)$/i;

/**
 * Transcript highlight pattern (with quotes): "timestamp: "text": type: iconLabel"
 * Example: "00:00: "Van Frans Schubert": Topic: Introduction"
 */
export const TRANSCRIPT_HIGHLIGHT_QUOTED_PATTERN = /^(\d{1,2}:\d{2}):\s*"([^"]+)"[:\s]*(Decision|Action|Topic|Emotional):\s*(.+)$/i;

/**
 * Transcript highlight content pattern (quoted, without timestamp): ""text": type: iconLabel"
 * Example: ""Van Frans Schubert": Topic: Introduction"
 */
export const TRANSCRIPT_HIGHLIGHT_QUOTED_CONTENT_PATTERN = /^"([^"]+)"[:\s]*(Decision|Action|Topic|Emotional):\s*(.+)$/i;

/**
 * Transcript highlight content pattern (unquoted, without timestamp): "text: type: iconLabel"
 * Example: "Van Frans Schubert: Topic: Introduction"
 */
export const TRANSCRIPT_HIGHLIGHT_CONTENT_PATTERN = /^(.+?):\s*(Decision|Action|Topic|Emotional):\s*(.+)$/i;

/**
 * Transcript highlight pattern (global, for concatenated entries)
 * Used with matchAll to find all transcript highlights in concatenated text
 */
export const TRANSCRIPT_HIGHLIGHT_GLOBAL_PATTERN = /(\d{1,2}:\d{2}):\s*((?:(?!\d{1,2}:\d{2}:).)+?)(?=\d{1,2}:\d{2}:|$)/gi;

// ============================================================================
// ACTION ITEMS PATTERNS
// ============================================================================

/**
 * Action item pattern: "Task: assignee: deadline: priority: timestamp"
 * Example: "Prepare monthly sales report: Sarah: Mar 12, 2025: High: 02:15"
 */
export const ACTION_ITEM_PATTERN = /^([^:]+):\s*([^:]+):\s*([^:]+):\s*([^:]+):\s*(\d{1,2}:\d{2})$/;

/**
 * Action item pattern (full format with notes): "Task: assignee: deadline: priority: timestamp: notes"
 * Example: "Prepare monthly sales report: Sarah: Mar 12, 2025: High: 02:15: Include Q4 data"
 * Supports "—" for optional fields
 */
export const ACTION_ITEM_FULL_PATTERN = /^([^:]+?):\s*([^:]+?):\s*([^:]+?):\s*(High|Medium|Low|—):\s*(\d{1,2}:\d{2}|—):\s*(.+)$/i;

/**
 * Simple action item pattern: "Task: description"
 * Example: "Prepare report: Include all Q4 data"
 */
export const ACTION_ITEM_SIMPLE_PATTERN = /^([^:]+?):\s*(.+)$/;

/**
 * Decision pattern: "Decision: timestamp"
 * Example: "Proceed with new supplier: 03:12"
 */
export const DECISION_PATTERN = /^([^:]+):\s*(\d{1,2}:\d{2})$/;

/**
 * Decision pattern (with optional timestamp): "Decision: timestamp|—"
 * Example: "Proceed with new supplier: 03:12" or "Proceed with new supplier: —"
 */
export const DECISION_WITH_OPTIONAL_TIMESTAMP_PATTERN = /^([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i;

/**
 * Simple decision pattern: "- Decision text" or "Decision text"
 * Example: "- Proceed with new supplier" or "Proceed with new supplier"
 */
export const DECISION_SIMPLE_PATTERN = /^[-•*]?\s*(.+)$/;

/**
 * Deadline pattern: "Task: deadline"
 * Example: "Schedule next meeting: Mar 20, 2025"
 */
export const DEADLINE_PATTERN = /^([^:]+):\s*(.+)$/;

/**
 * Deadline pattern (with date and optional timestamp): "Description: date: timestamp|—"
 * Example: "Schedule next meeting: Mar 20, 2025: 04:45" or "Schedule next meeting: Mar 20, 2025: —"
 */
export const DEADLINE_WITH_TIMESTAMP_PATTERN = /^([^:]+?):\s*([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i;

/**
 * Follow-up pattern: "Description: timestamp|—"
 * Example: "Email John: 03:12" or "Email John: —"
 */
export const FOLLOW_UP_PATTERN = /^([^:]+?):\s*(\d{1,2}:\d{2}|—)$/i;

/**
 * Simple follow-up pattern: "- Follow-up text" or "Follow-up text"
 * Example: "- Email John" or "Email John"
 */
export const FOLLOW_UP_SIMPLE_PATTERN = /^[-•*]?\s*(.+)$/;

// ============================================================================
// METADATA PATTERNS
// ============================================================================

/**
 * Section header pattern: "SECTION: Section Name"
 * Example: "SECTION: File Information"
 */
export const SECTION_HEADER_PATTERN = /^SECTION:\s*(.+)$/i;

/**
 * Generic key-value pair pattern for metadata sections
 * Example: "File Name: recording_01.wav"
 */
export const METADATA_KEY_VALUE_PATTERN = /^([^:]+):\s*(.+)$/;

/**
 * Creates a regex pattern to extract a metadata field value, stopping before other specified fields
 * @param {string} fieldLabel - The label of the field to extract (e.g., "File\\s+Name")
 * @param {string[]} otherFields - Array of other field labels to stop before (already escaped)
 * @returns {RegExp} - Regex pattern that extracts the field value
 * 
 * Example:
 * createMetadataFieldPattern("File\\s+Name", ["File\\s+(?:Type|Size)", "Duration", "Uploaded\\s+On"])
 * Returns: /File\s+Name:\s*((?:(?!File\s+(?:Type|Size)|Duration:|Uploaded\s+On:).)+?)(?=File\s+(?:Type|Size)|Duration:|Uploaded\s+On:|$)/i
 */
export const createMetadataFieldPattern = (fieldLabel, otherFields = []) => {
  // fieldLabel should already be escaped (e.g., "File\\s+Name")
  // otherFields should already be escaped (e.g., ["File\\s+(?:Type|Size)", "Duration"])
  const negativeLookahead = otherFields.length > 0
    ? `(?!${otherFields.join("|")})`
    : "";
  const positiveLookahead = otherFields.length > 0
    ? `(?=${otherFields.join("|")}|$)`
    : "(?=$)";
  
  return new RegExp(
    `${fieldLabel}:\\s*((?:${negativeLookahead}.)+?)${positiveLookahead}`,
    "i"
  );
};

/**
 * File Information field patterns
 */
export const FILE_NAME_PATTERN = createMetadataFieldPattern("File\\s+Name", ["File\\s+(?:Type|Size)", "Duration", "Uploaded\\s+On"]);
export const FILE_TYPE_PATTERN = createMetadataFieldPattern("File\\s+Type", ["File\\s+(?:Name|Size)", "Duration", "Uploaded\\s+On"]);
export const FILE_SIZE_PATTERN = createMetadataFieldPattern("File\\s+Size", ["File\\s+(?:Name|Type)", "Duration", "Uploaded\\s+On"]);
export const DURATION_PATTERN = createMetadataFieldPattern("Duration", ["File\\s+(?:Name|Type|Size)", "Uploaded\\s+On"]);
export const UPLOADED_ON_PATTERN = createMetadataFieldPattern("Uploaded\\s+On", ["File\\s+(?:Name|Type|Size)", "Duration"]);

/**
 * Technical Details field patterns
 */
export const FORMAT_PATTERN = createMetadataFieldPattern("Format", ["Sample\\s+Rate", "Bitrate", "Channels", "Encoding", "Loudness", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const SAMPLE_RATE_PATTERN = createMetadataFieldPattern("Sample\\s+Rate", ["Format", "Bitrate", "Channels", "Encoding", "Loudness", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const BITRATE_PATTERN = createMetadataFieldPattern("Bitrate", ["Format", "Sample\\s+Rate", "Channels", "Encoding", "Loudness", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const CHANNELS_PATTERN = createMetadataFieldPattern("Channels", ["Format", "Sample\\s+Rate", "Bitrate", "Encoding", "Loudness", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const ENCODING_PATTERN = createMetadataFieldPattern("Encoding", ["Format", "Sample\\s+Rate", "Bitrate", "Channels", "Loudness", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const LOUDNESS_PATTERN = createMetadataFieldPattern("Loudness", ["Format", "Sample\\s+Rate", "Bitrate", "Channels", "Encoding", "Peak\\s+Level", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const PEAK_LEVEL_PATTERN = createMetadataFieldPattern("Peak\\s+Level", ["Format", "Sample\\s+Rate", "Bitrate", "Channels", "Encoding", "Loudness", "Noise\\s+Level", "Dynamic\\s+Range"]);
export const NOISE_LEVEL_PATTERN = createMetadataFieldPattern("Noise\\s+Level", ["Format", "Sample\\s+Rate", "Bitrate", "Channels", "Encoding", "Loudness", "Peak\\s+Level", "Dynamic\\s+Range"]);
export const DYNAMIC_RANGE_PATTERN = createMetadataFieldPattern("Dynamic\\s+Range", ["Format", "Sample\\s+Rate", "Bitrate", "Channels", "Encoding", "Loudness", "Peak\\s+Level", "Noise\\s+Level"]);

/**
 * Audio Properties field patterns
 */
export const CHANNEL_BREAKDOWN_PATTERN = /Channel\s+Breakdown:\s*(.+)/i;
export const WAVEFORM_CHARACTERISTICS_PATTERN = /Waveform\s+Characteristics:\s*(.+)/i;

/**
 * AI Analysis Quality field patterns
 */
export const ANALYSIS_CONFIDENCE_PATTERN = /Analysis\s+Confidence:\s*([\d.]+)(?=Audio\s+Clarity|Speech\s+Detection|$)/i;
export const AUDIO_CLARITY_PATTERN = createMetadataFieldPattern("Audio\\s+Clarity", ["Analysis\\s+Confidence", "Speech\\s+Detection"]);
export const SPEECH_DETECTION_PATTERN = createMetadataFieldPattern("Speech\\s+Detection", ["Analysis\\s+Confidence", "Audio\\s+Clarity"]);

/**
 * Transcription Metadata field patterns
 */
export const LANGUAGE_PATTERN = createMetadataFieldPattern("Language", ["Word\\s+Count", "Speaker\\s+Labels", "Transcription\\s+Method"]);
export const WORD_COUNT_PATTERN = /Word\s+Count:\s*(\d+)(?=Language|Speaker\s+Labels|Transcription\s+Method|$)/i;
export const SPEAKER_LABELS_PATTERN = createMetadataFieldPattern("Speaker\\s+Labels", ["Language", "Word\\s+Count", "Transcription\\s+Method"]);
export const TRANSCRIPTION_METHOD_PATTERN = createMetadataFieldPattern("Transcription\\s+Method", ["Language", "Word\\s+Count", "Speaker\\s+Labels"]);

/**
 * Optional Metadata field patterns
 */
export const ARTIST_PATTERN = createMetadataFieldPattern("Artist", ["Album", "Title", "Genre", "Recording\\s+Device", "GPS\\s+Location"]);
export const ALBUM_PATTERN = createMetadataFieldPattern("Album", ["Artist", "Title", "Genre", "Recording\\s+Device", "GPS\\s+Location"]);
export const TITLE_PATTERN = createMetadataFieldPattern("Title", ["Artist", "Album", "Genre", "Recording\\s+Device", "GPS\\s+Location"]);
export const GENRE_PATTERN = createMetadataFieldPattern("Genre", ["Artist", "Album", "Title", "Recording\\s+Device", "GPS\\s+Location"]);
export const RECORDING_DEVICE_PATTERN = createMetadataFieldPattern("Recording\\s+Device", ["Artist", "Album", "Title", "Genre", "GPS\\s+Location"]);
export const GPS_LOCATION_PATTERN = createMetadataFieldPattern("GPS\\s+Location", ["Artist", "Album", "Title", "Genre", "Recording\\s+Device"]);

/**
 * Technical detail pattern: "Field: Value"
 * Example: "Sample Rate: 44,100 Hz"
 */
export const TECHNICAL_DETAIL_PATTERN = /^([^:]+):\s*(.+)$/;

// ============================================================================
// CONTENT ANALYSIS PATTERNS
// ============================================================================

/**
 * Topic cluster pattern: "Cluster Name: keywords"
 * Example: "Religious: Ave Maria Gratia Plena"
 */
export const TOPIC_CLUSTER_PATTERN = /^([^:]+):\s*(.+)$/;

/**
 * Topic cluster pattern (non-anchored): "title: description"
 * Example: "Religious: Ave Maria Gratia Plena"
 */
export const TOPIC_CLUSTER_PATTERN_LAZY = /(.+?):\s*(.+)/;

/**
 * Topic tree title pattern: "Title" (capital letter, no colon)
 * Example: "Religious Themes"
 */
export const TOPIC_TREE_TITLE_PATTERN = /^[A-Z][^:]+$/;

/**
 * Discussion flow pattern: "timestamp: description"
 * Example: "00:00: Introduction to the topic"
 */
export const DISCUSSION_FLOW_PATTERN = /^(\d{1,2}:\d{2}):\s*(.+)$/;

/**
 * Discussion flow pattern (with dash separator): "timestamp - description"
 * Example: "00:00 - Introduction to the topic"
 */
export const DISCUSSION_FLOW_DASH_PATTERN = /(\d{1,2}:\d{2})\s*[-—]\s*(.+)/;

/**
 * Discussion flow pattern (without dash): "timestamp description"
 * Example: "00:00 Introduction to the topic"
 */
export const DISCUSSION_FLOW_SPACE_PATTERN = /(\d{1,2}:\d{2})\s+(.+)/;

/**
 * Discussion flow pattern (global, for concatenated entries)
 * Used with matchAll to find all discussion flow items in concatenated text
 */
export const DISCUSSION_FLOW_GLOBAL_PATTERN = /(\d{1,2}:\d{2})\s*[-—]?\s*((?:(?!\d{1,2}:\d{2}).)+?)(?=\d{1,2}:\d{2}|$)/gs;

/**
 * Key concept pattern: "concept: category: relevance" or "concept|category|relevance"
 * Example: "Ave Maria: Religious Theme: High" or "Ave Maria|Religious Theme|High"
 */
export const KEY_CONCEPT_PATTERN = /^([^:|]+)[:|]([^:|]+)(?:[:|](.+))?$/;

// ============================================================================
// SENTIMENT ANALYSIS PATTERNS
// ============================================================================

/**
 * Sentiment score pattern: extracts score from "Sentiment Score: Positive 0.85" or "Score: 0.85"
 * Example: "Sentiment Score: Positive 0.85" → 0.85
 */
export const SENTIMENT_SCORE_PATTERN = /sentiment\s+score[:\s]*(?:positive|negative|neutral)?\s*(\d+\.?\d*)/i;

/**
 * Score pattern (simple): extracts score from "Score: 0.85"
 * Example: "Score: 0.85" → 0.85
 */
export const SCORE_PATTERN = /score[:\s]*(\d+\.?\d*)/i;

/**
 * Numeric score pattern: extracts any decimal number
 * Example: "0.85" → 0.85
 */
export const NUMERIC_SCORE_PATTERN = /(\d+\.?\d*)/;

/**
 * Emotional intensity pattern: extracts intensity from "Emotional Intensity: High"
 * Example: "Emotional Intensity: High" → High
 */
export const EMOTIONAL_INTENSITY_PATTERN = /emotional\s+intensity[:\s]*(\w+)/i;

/**
 * Emotion breakdown pattern: "Emotion: percentage"
 * Example: "Joy: 45%"
 */
export const EMOTION_BREAKDOWN_PATTERN = /^([^:]+):\s*([\d.]+)%$/;

/**
 * Emotion breakdown pattern (global, for concatenated entries): "Emotion: percentage" or "Emotion percentage"
 * Example: "Joy: 75%" or "Joy 75%"
 */
export const EMOTION_BREAKDOWN_GLOBAL_PATTERN = /(\w+)[:\s]+(\d+)%/gi;

/**
 * Sentiment timeline pattern: "startTime-endTime → sentiment" or "startTime-endTime: sentiment"
 * Example: "00:00–00:30 → Neutral" or "00:00-00:30: Positive"
 */
export const SENTIMENT_TIMELINE_WITH_ARROW_PATTERN = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*[→:-]\s*(.+)/;

/**
 * Sentiment timeline pattern (without arrow): "startTime-endTime sentiment"
 * Example: "00:00–00:30 Neutral"
 */
export const SENTIMENT_TIMELINE_WITHOUT_ARROW_PATTERN = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s+(.+)/;

/**
 * Sentiment timeline pattern (global, for concatenated entries)
 * Used with matchAll to find all sentiment timeline items in concatenated text
 */
export const SENTIMENT_TIMELINE_GLOBAL_PATTERN = /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*[→:-]?\s*([^\d]+?)(?=\d{1,2}:\d{2}|$)/g;

// ============================================================================
// UTILITY PATTERNS
// ============================================================================

/**
 * Timestamp pattern: "MM:SS" or "HH:MM:SS"
 */
export const TIMESTAMP_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Percentage pattern: "XX%" or "XX.X%"
 */
export const PERCENTAGE_PATTERN = /^([\d.]+)%$/;

/**
 * Number pattern: Integer or decimal
 */
export const NUMBER_PATTERN = /^[\d.]+$/;

/**
 * Clean label pattern: Removes trailing numbers and "segments" text
 * Example: "Speaker B 12 segments" → "Speaker B"
 */
export const CLEAN_LABEL_PATTERN = /^(.+?)\s*\d+\s*segments?$/i;

// ============================================================================
// COMPOUND PATTERNS (for complex parsing)
// ============================================================================

/**
 * Negative lookahead pattern builder
 * Creates a pattern that stops at the next field label
 */
export const createFieldPattern = (fieldName, stopFields = []) => {
  const stopPattern = stopFields.length > 0 
    ? `(?!${stopFields.join('|')})` 
    : '';
  return new RegExp(`${fieldName}:\\s*((?:${stopPattern}.)+?)(?=${stopFields.join('|')}|$)`, 'i');
};

/**
 * Section extractor pattern
 * Extracts content between section headers
 */
export const createSectionPattern = (sectionName) => {
  return new RegExp(`SECTION:\\s*${sectionName}\\s*[:\\n]*([\\s\\S]*?)(?=SECTION:|$)`, 'i');
};

// ============================================================================
// SUMMARY PATTERNS
// ============================================================================

/**
 * No content message pattern: checks if audio has no spoken content
 * Example: "This audio contains no spoken content or lyrics, so a summary is not available"
 */
export const NO_CONTENT_PATTERN = /This audio contains no spoken content or lyrics, so a summary is not available/i;

/**
 * Executive Summary fallback pattern (without SECTION: prefix)
 * Example: "Executive Summary: This is the summary text..."
 */
export const EXECUTIVE_SUMMARY_FALLBACK_PATTERN = /(?:Executive\s+Summary|Executive Summary)[:\n\s]*([\s\S]{50,}?)(?=Key\s+Points|$)/i;

/**
 * Key Points fallback pattern (without SECTION: prefix)
 * Example: "Key Points: Point 1, Point 2..."
 */
export const KEY_POINTS_FALLBACK_PATTERN = /(?:Key\s+Points|Key Points)[:\n\s]*([\s\S]*?)(?=\n\s*(?:SECTION:|$))/i;

/**
 * Section header pattern (at start of line): "^SECTION:"
 * Example: "^SECTION: Executive Summary"
 */
export const SECTION_HEADER_START_PATTERN = /^SECTION:/i;

/**
 * Executive Summary or Key Points header pattern
 * Example: "Executive Summary:" or "Key Points:"
 */
export const SUMMARY_HEADER_PATTERN = /^(Executive Summary|Key Points):?/i;

/**
 * Bullet marker pattern: matches bullet markers at start of line
 * Example: "- Point 1", "• Point 2", "* Point 3"
 */
export const BULLET_MARKER_PATTERN = /^[-•*]\s*/;

/**
 * Bullet split pattern: splits text by bullet markers
 * Example: "Point 1- Point 2• Point 3" -> ["Point 1", "- Point 2", "• Point 3"]
 */
export const BULLET_SPLIT_PATTERN = /(?=[-•*])/;

/**
 * Sentence ending pattern: checks if text ends with sentence punctuation
 * Example: "Hello." -> true, "Hello" -> false
 */
export const SENTENCE_ENDING_PATTERN = /[.!?]$/;

/**
 * Spacing fix pattern: fixes spacing between lowercase and uppercase letters
 * Example: "Theaudio" -> "The audio", "singeris" -> "singer is"
 */
export const SPACING_FIX_PATTERN = /([a-z])([A-Z])/g;

// ============================================================================
// OVERVIEW PATTERNS
// ============================================================================

/**
 * Content Type pattern: extracts content type from "Content Type: value"
 * Example: "Content Type: Music Recording"
 */
export const CONTENT_TYPE_PATTERN = /Content Type:\s*([^\n]+)/i;

/**
 * Key Themes extraction pattern: extracts themes section
 * Example: "Key Themes: theme1- theme2- theme3"
 */
export const KEY_THEMES_PATTERN = /Key Themes:[\s\S]*?(?=Purpose:|SECTION:|$)/i;

/**
 * Key Themes header pattern: matches "Key Themes", "Purpose", or "Main Topic" at start
 * Example: "Key Themes:", "Purpose:", "Main Topic:"
 */
export const KEY_THEMES_HEADER_PATTERN = /^(Key Themes|Purpose|Main Topic)/i;

/**
 * Bullet extraction pattern: extracts bullet points with content
 * Example: "- Point 1", "• Point 2", "* Point 3"
 */
export const BULLET_EXTRACTION_PATTERN = /[-•*]\s*([^\n]+)/g;

/**
 * Metadata field header pattern: matches Artist, Album, Type, Genre, or Description at start
 * Example: "Artist:", "Album:", "Type:", "Genre:", "Description:"
 */
export const METADATA_FIELD_HEADER_PATTERN = /^(Artist|Album|Type|Genre|Description):/i;

/**
 * Artist extraction pattern: extracts artist/performer from rawText
 */
export const ARTIST_EXTRACTION_PATTERN = /Artist[\/\s]Performer:\s*([^\n]+?)(?=\s*(?:Album|Collection|Type of Music|Type of Content|Genre|Description|SECTION:|Key Statistics|Content Summary|Participants|Quality|AI Summary|$))/i;

/**
 * Album extraction pattern: extracts album/collection from rawText
 */
export const ALBUM_EXTRACTION_PATTERN = /Album[\/\s]Collection:\s*([^\n]+?)(?=\s*(?:Type of Music|Type of Content|Genre|Description|Artist|Performer|SECTION:|Key Statistics|Content Summary|Participants|Quality|AI Summary|$))/i;

/**
 * Type of Music extraction pattern: extracts type from rawText
 */
export const TYPE_OF_MUSIC_EXTRACTION_PATTERN = /Type of Music[\/\s]Content:\s*([^\n]+?)(?=\s*(?:Genre|Description|Artist|Performer|Album|Collection|SECTION:|Key Statistics|Content Summary|Participants|Quality|AI Summary|$))/i;

/**
 * Genre extraction pattern: extracts genre from rawText
 */
export const GENRE_EXTRACTION_PATTERN = /Genre:\s*([^\n]+?)(?=\s*(?:Description|Artist|Performer|Album|Collection|Type of Music|Type of Content|SECTION:|Key Statistics|Content Summary|Participants|Quality|AI Summary|$))/i;

/**
 * Description extraction pattern: extracts description from rawText
 */
export const DESCRIPTION_EXTRACTION_PATTERN = /Description:\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:SECTION:|Artist|Album|Type|Genre|Key Statistics|Content Summary|Participants|Quality|AI Summary)|$)/i;

// ============================================================================
// GLOBAL FLAGS
// ============================================================================

/**
 * Global match flags for patterns that need to match multiple occurrences
 */
export const GLOBAL_FLAGS = {
  MULTILINE: 'gm',
  CASE_INSENSITIVE: 'i',
  GLOBAL: 'g',
  GLOBAL_MULTILINE: 'gm',
  GLOBAL_CASE_INSENSITIVE: 'gi',
};

