"""
Audio Service - Handle audio transcription and analysis
Uses AssemblyAI for Speech-to-Text transcription (free tier: 185 hours/month)
Uses ElevenLabs for Text-to-Speech (optional)
Uses Gemini for analysis
"""
import os
import io
from typing import Dict, Optional
import requests
from dotenv import load_dotenv

from config.gemini import generate_text, generate_text_stream
from services.audio_analysis import prompts as audio_prompts

load_dotenv(verbose=False)

# AssemblyAI API configuration (for Speech-to-Text transcription)
ASSEMBLYAI_API_KEY = os.getenv('ASSEMBLYAI_API_KEY', '').strip()
ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2'

# ElevenLabs API configuration (for Text-to-Speech - optional)
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY', '').strip()

# Debug: Check if keys are loaded
if ASSEMBLYAI_API_KEY:
    print(f"[AUDIO] AssemblyAI API key loaded (length: {len(ASSEMBLYAI_API_KEY)})")
else:
    print("[AUDIO] WARNING: ASSEMBLYAI_API_KEY not found in environment variables")

if ELEVENLABS_API_KEY:
    print(f"[AUDIO] ElevenLabs API key loaded (length: {len(ELEVENLABS_API_KEY)})")
    try:
        from elevenlabs.client import ElevenLabs
        elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        print("[AUDIO] ElevenLabs SDK initialized")
    except ImportError:
        print("[AUDIO] WARNING: elevenlabs package not installed. Run: pip install elevenlabs")
        elevenlabs_client = None
    except Exception as e:
        print(f"[AUDIO] WARNING: Failed to initialize ElevenLabs: {e}")
        elevenlabs_client = None
else:
    print("[AUDIO] INFO: ELEVENLABS_API_KEY not set (TTS features will be disabled)")
    elevenlabs_client = None

# Audio processing limits
MAX_AUDIO_DURATION_SECONDS = 600  # 10 minutes max
MAX_FILE_SIZE_MB = 10


def get_audio_metadata(file_stream) -> Dict:
    """
    Get audio file metadata
    
    Args:
        file_stream: Audio file stream
        
    Returns:
        dict: {
            'success': bool,
            'duration': float (seconds),
            'format': str,
            'file_size': int (bytes),
            'sample_rate': int,
            'channels': int,
            'bitrate': int,
            'error': str (if failed)
        }
    """
    try:
        # Save file position
        file_stream.seek(0, os.SEEK_END)
        file_size = file_stream.tell()
        file_stream.seek(0)
        
        # Try to get basic info from file
        filename = getattr(file_stream, 'filename', 'audio')
        file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'
        
        # Initialize metadata with defaults
        metadata = {
            'success': True,
            'format': file_extension,
            'file_size': file_size,
            'duration': 0,  # Will be updated after transcription
            'sample_rate': None,
            'channels': None,
            'bitrate': None
        }
        
        # Try to extract detailed metadata using mutagen
        try:
            from mutagen import File as MutagenFile
            from mutagen.mp3 import MP3
            from mutagen.mp4 import MP4
            from mutagen.flac import FLAC
            from mutagen.oggvorbis import OggVorbis
            from mutagen.wave import WAVE
            
            # Save file to temporary location for mutagen (it needs a file path or file-like object)
            import tempfile
            import shutil
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                shutil.copyfileobj(file_stream, temp_file)
                temp_path = temp_file.name
            
            try:
                # Load file with mutagen
                audio_file = MutagenFile(temp_path)
                
                if audio_file is not None:
                    # Get duration
                    if hasattr(audio_file, 'info'):
                        if hasattr(audio_file.info, 'length'):
                            metadata['duration'] = audio_file.info.length
                        
                        # Get sample rate
                        if hasattr(audio_file.info, 'sample_rate'):
                            metadata['sample_rate'] = int(audio_file.info.sample_rate)
                        
                        # Get channels
                        if hasattr(audio_file.info, 'channels'):
                            metadata['channels'] = int(audio_file.info.channels)
                        
                        # Get bitrate
                        if hasattr(audio_file.info, 'bitrate'):
                            bitrate = audio_file.info.bitrate
                            # Convert to kbps if needed (mutagen returns bps for some formats)
                            if bitrate > 1000:
                                metadata['bitrate'] = int(bitrate / 1000)  # Convert to kbps
                            else:
                                metadata['bitrate'] = int(bitrate)
                    
                    # For MP3 files, try to get additional info
                    if file_extension == 'mp3' and isinstance(audio_file, MP3):
                        if hasattr(audio_file.info, 'bitrate'):
                            # Mutagen returns MP3 bitrate in bps, convert to kbps
                            bitrate = audio_file.info.bitrate
                            metadata['bitrate'] = int(bitrate / 1000) if bitrate > 1000 else int(bitrate)
                        if hasattr(audio_file.info, 'sample_rate'):
                            metadata['sample_rate'] = int(audio_file.info.sample_rate)
                        if hasattr(audio_file.info, 'channels'):
                            metadata['channels'] = int(audio_file.info.channels)
                    
                    # For MP4/M4A files
                    elif file_extension in ['mp4', 'm4a'] and isinstance(audio_file, MP4):
                        if hasattr(audio_file.info, 'bitrate'):
                            metadata['bitrate'] = int(audio_file.info.bitrate / 1000) if audio_file.info.bitrate > 1000 else int(audio_file.info.bitrate)
                    
                    # For FLAC files
                    elif file_extension == 'flac' and isinstance(audio_file, FLAC):
                        if hasattr(audio_file.info, 'bitrate'):
                            metadata['bitrate'] = int(audio_file.info.bitrate / 1000) if audio_file.info.bitrate > 1000 else int(audio_file.info.bitrate)
                    
                    # For WAV files
                    elif file_extension == 'wav' and isinstance(audio_file, WAVE):
                        if hasattr(audio_file.info, 'bitrate'):
                            metadata['bitrate'] = int(audio_file.info.bitrate / 1000) if audio_file.info.bitrate > 1000 else int(audio_file.info.bitrate)
                
                # Calculate audio analysis metrics (loudness, peak level, noise level, dynamic range)
                # Do this after mutagen extraction so we can reuse the temp file
                try:
                    from services.audio_analysis_metrics import calculate_audio_metrics
                    audio_metrics = calculate_audio_metrics(temp_path)
                    
                    if audio_metrics.get('success'):
                        metadata['loudness'] = audio_metrics.get('loudness')
                        metadata['peak_level'] = audio_metrics.get('peak_level')
                        metadata['noise_level'] = audio_metrics.get('noise_level')
                        metadata['dynamic_range'] = audio_metrics.get('dynamic_range')
                    else:
                        # Set to None if calculation failed (will show as N/A in UI)
                        metadata['loudness'] = None
                        metadata['peak_level'] = None
                        metadata['noise_level'] = None
                        metadata['dynamic_range'] = None
                        if audio_metrics.get('error'):
                            print(f"[AUDIO] Audio metrics calculation failed: {audio_metrics.get('error')}")
                except Exception as e:
                    # If metrics calculation fails, continue without them
                    print(f"[AUDIO] Warning: Could not calculate audio metrics: {str(e)}")
                    metadata['loudness'] = None
                    metadata['peak_level'] = None
                    metadata['noise_level'] = None
                    metadata['dynamic_range'] = None
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_path)
                except:
                    pass
                
                # Reset file stream position
                file_stream.seek(0)
                
        except ImportError:
            # mutagen not installed, skip detailed extraction
            print("[AUDIO] mutagen not installed, skipping detailed metadata extraction")
        except Exception as e:
            # If mutagen extraction fails, continue with basic metadata
            print(f"[AUDIO] Error extracting detailed metadata: {str(e)}")
            file_stream.seek(0)
        
        return metadata
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def transcribe_audio(file_stream) -> Dict:
    """
    Transcribe audio using AssemblyAI API
    
    Args:
        file_stream: Audio file stream
        
    Returns:
        dict: {
            'success': bool,
            'transcript': str,
            'segments': list,
            'language': str,
            'error': str (if failed)
        }
    """
    if not ASSEMBLYAI_API_KEY:
        return {
            'success': False,
            'error': 'ASSEMBLYAI_API_KEY not configured. Please set it in .env file.'
        }
    
    try:
        # Check file size
        file_stream.seek(0, os.SEEK_END)
        file_size = file_stream.tell()
        file_stream.seek(0)
        
        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            return {
                'success': False,
                'error': f'File size exceeds maximum allowed size ({MAX_FILE_SIZE_MB}MB)'
            }
        
        # Upload audio file to AssemblyAI
        upload_url = f'{ASSEMBLYAI_BASE_URL}/upload'
        headers = {'Authorization': ASSEMBLYAI_API_KEY}
        
        file_stream.seek(0)
        files = {'file': file_stream}
        
        print("[AUDIO] Uploading audio to AssemblyAI...")
        upload_response = requests.post(upload_url, headers=headers, files=files)
        
        if upload_response.status_code != 200:
            error_text = upload_response.text
            if 'Invalid API key' in error_text or upload_response.status_code == 401:
                return {
                    'success': False,
                    'error': f'Invalid AssemblyAI API key. Please check your ASSEMBLYAI_API_KEY in .env file. Error: {error_text}'
                }
            return {
                'success': False,
                'error': f'Failed to upload audio: {error_text}'
            }
        
        upload_url_result = upload_response.json()
        audio_url = upload_url_result.get('upload_url')
        
        if not audio_url:
            return {
                'success': False,
                'error': 'Failed to get upload URL from AssemblyAI'
            }
        
        # Request transcription
        transcript_url = f'{ASSEMBLYAI_BASE_URL}/transcript'
        transcript_request = {
            'audio_url': audio_url,
            'speaker_labels': True,  # Enable speaker diarization
            'auto_chapters': True,  # Auto-detect chapters
            'sentiment_analysis': True,  # Enable sentiment analysis
            'entity_detection': True,  # Detect entities
            'language_detection': True,  # Auto-detect language
            'punctuate': True,  # Add punctuation
            'format_text': True  # Format text properly
        }
        
        print("[AUDIO] Requesting transcription...")
        transcript_response = requests.post(
            transcript_url,
            json=transcript_request,
            headers=headers
        )
        
        if transcript_response.status_code != 200:
            return {
                'success': False,
                'error': f'Failed to request transcription: {transcript_response.text}'
            }
        
        transcript_id = transcript_response.json().get('id')
        
        if not transcript_id:
            return {
                'success': False,
                'error': 'Failed to get transcript ID'
            }
        
        # Poll for transcription completion
        polling_url = f'{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}'
        print("[AUDIO] Waiting for transcription to complete...")
        
        import time
        max_polls = 60  # Max 5 minutes (5 seconds * 60)
        poll_count = 0
        
        while poll_count < max_polls:
            polling_response = requests.get(polling_url, headers=headers)
            
            if polling_response.status_code != 200:
                return {
                    'success': False,
                    'error': f'Failed to poll transcription status: {polling_response.text}'
                }
            
            transcript_data = polling_response.json()
            status = transcript_data.get('status')
            
            if status == 'completed':
                # Extract transcript and segments
                transcript_text = transcript_data.get('text', '') or ''
                words = transcript_data.get('words', [])
                
                # Check if transcript is empty
                if not transcript_text and not words:
                    print("[AUDIO] WARNING: Transcription completed but returned empty text. This may be due to:")
                    print("  - Music/background noise without clear speech")
                    print("  - Language not supported or misdetected")
                    print("  - Audio quality issues")
                
                # Build segments with timestamps
                segments = []
                current_segment = None
                
                for word in words:
                    start = word.get('start', 0) / 1000  # Convert to seconds
                    end = word.get('end', 0) / 1000
                    text = word.get('text', '')
                    speaker = word.get('speaker', None)
                    
                    if current_segment is None or (speaker and current_segment.get('speaker') != speaker):
                        if current_segment:
                            segments.append(current_segment)
                        current_segment = {
                            'start': start,
                            'end': end,
                            'text': text,
                            'speaker': f"Speaker {speaker}" if speaker is not None else None
                        }
                    else:
                        current_segment['text'] += ' ' + text
                        current_segment['end'] = end
                
                if current_segment:
                    segments.append(current_segment)
                
                # Get additional data
                language = transcript_data.get('language_code', 'unknown')
                
                # Get duration - try audio_duration first, then calculate from segments/words
                duration = transcript_data.get('audio_duration', 0)
                # audio_duration might already be in seconds or in milliseconds
                if duration > 10000:  # If it's in milliseconds (more than 10 seconds in ms)
                    duration = duration / 1000  # Convert to seconds
                elif duration == 0 or duration < 0.1:  # If duration is 0 or very small, calculate from words
                    if words and len(words) > 0:
                        # Calculate from last word's end time
                        last_word = words[-1]
                        if last_word and 'end' in last_word:
                            duration = last_word.get('end', 0) / 1000
                    elif segments and len(segments) > 0:
                        # Calculate from last segment's end time
                        last_segment = segments[-1]
                        if last_segment and 'end' in last_segment:
                            duration = last_segment['end'] / 1000 if last_segment['end'] > 100 else last_segment['end']
                
                # Log transcription results
                word_count = len(words) if words else 0
                print(f"[AUDIO] Transcription complete: {word_count} words, language: {language}, duration: {duration:.2f}s")
                print(f"[AUDIO] Duration sources - audio_duration: {transcript_data.get('audio_duration', 0)}, calculated: {duration:.2f}s")
                
                return {
                    'success': True,
                    'transcript': transcript_text,
                    'segments': segments,
                    'language': language,
                    'duration': duration,
                    'speakers': transcript_data.get('utterances', []),
                    'chapters': transcript_data.get('chapters', []),
                    'sentiment': transcript_data.get('sentiment_analysis_results', []),
                    'entities': transcript_data.get('entities', []),
                    'word_count': word_count,
                    'is_empty': not transcript_text and not words
                }
            
            elif status == 'error':
                return {
                    'success': False,
                    'error': f'Transcription failed: {transcript_data.get("error", "Unknown error")}'
                }
            
            # Still processing, wait and retry
            time.sleep(5)
            poll_count += 1
        
        return {
            'success': False,
            'error': 'Transcription timeout - took too long to complete'
        }
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Audio transcription failed: {e}")
        print(traceback.format_exc())
        return {
            'success': False,
            'error': str(e)
        }


def analyze_audio_with_ai(transcript: str, metadata: Dict, transcription_data: Dict, analysis_type: str = 'overview') -> Dict:
    """
    Analyze audio transcript using Gemini AI
    
    Args:
        transcript: Transcribed text
        metadata: Audio metadata
        transcription_data: Full transcription data from AssemblyAI
        analysis_type: Type of analysis (overview, summary, content, sentiment, keywords, etc.)
        
    Returns:
        dict: {
            'success': bool,
            'analysis': str,
            'error': str (if failed)
        }
    """
    try:
        # Build prompt based on analysis type
        prompt = audio_prompts.build_audio_insight_prompt(
            transcript=transcript,
            metadata=metadata,
            transcription_data=transcription_data,
            analysis_type=analysis_type
        )
        
        # Generate analysis using Gemini
        analysis = generate_text(prompt, max_output_tokens=4096)
        
        return {
            'success': True,
            'analysis': analysis
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def analyze_audio_stream(file_stream, analysis_type: str = 'overview'):
    """
    Analyze audio with streaming response
    
    Args:
        file_stream: Audio file stream
        analysis_type: Type of analysis
        
    Yields:
        str: Analysis chunks
    """
    try:
        # First, transcribe
        transcription_result = transcribe_audio(file_stream)
        
        if not transcription_result['success']:
            yield f"[ERROR] Transcription failed: {transcription_result.get('error', 'Unknown error')}"
            return
        
        # Get metadata
        file_stream.seek(0)
        metadata_result = get_audio_metadata(file_stream)
        
        # Build prompt
        prompt = audio_prompts.build_audio_insight_prompt(
            transcript=transcription_result.get('transcript', ''),
            metadata=metadata_result,
            transcription_data=transcription_result,
            analysis_type=analysis_type
        )
        
        # Stream analysis
        for chunk in generate_text_stream(prompt, max_output_tokens=4096):
            if chunk:
                yield chunk
                
    except Exception as e:
        yield f"[ERROR] {str(e)}"

