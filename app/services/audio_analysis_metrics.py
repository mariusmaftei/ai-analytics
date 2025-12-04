"""
Audio Analysis Metrics Service
Calculates audio signal analysis metrics: loudness, peak level, noise level, dynamic range
"""
import numpy as np
from typing import Dict, Optional
import os

def calculate_audio_metrics(audio_file_path: str) -> Dict:
    """
    Calculate audio analysis metrics: loudness, peak level, noise level, dynamic range
    
    Args:
        audio_file_path: Path to audio file
        
    Returns:
        dict: {
            'loudness': float (LUFS),
            'peak_level': float (dB),
            'noise_level': float (dB),
            'dynamic_range': float (dB),
            'success': bool,
            'error': str (if failed)
        }
    """
    try:
        # Try to import librosa and soundfile
        try:
            import librosa
            import soundfile as sf
        except ImportError:
            return {
                'success': False,
                'error': 'librosa or soundfile not installed. Run: pip install librosa soundfile',
                'loudness': None,
                'peak_level': None,
                'noise_level': None,
                'dynamic_range': None
            }
        
        # Load audio file
        try:
            y, sr = librosa.load(audio_file_path, sr=None, mono=True)
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to load audio file: {str(e)}',
                'loudness': None,
                'peak_level': None,
                'noise_level': None,
                'dynamic_range': None
            }
        
        if len(y) == 0:
            return {
                'success': False,
                'error': 'Audio file is empty',
                'loudness': None,
                'peak_level': None,
                'noise_level': None,
                'dynamic_range': None
            }
        
        # Calculate Peak Level (dB)
        # Peak level is the maximum absolute amplitude
        peak_amplitude = np.max(np.abs(y))
        # Convert to dB, add small value to avoid log(0)
        # Convert to Python float for JSON serialization
        peak_level = float(20 * np.log10(peak_amplitude + 1e-10))
        
        # Calculate RMS (Root Mean Square) for loudness estimation
        rms = np.sqrt(np.mean(y**2))
        # Convert to Python float for JSON serialization
        rms_db = float(20 * np.log10(rms + 1e-10))
        
        # Estimate Loudness (LUFS) - simplified version
        # For accurate LUFS, use pyloudnorm library (see Option B in recommendation)
        # This is an approximation: LUFS ≈ RMS_dB - 23 (varies by content type)
        loudness_lufs = float(rms_db - 23)
        
        # Calculate Dynamic Range (difference between peak and RMS)
        dynamic_range = float(peak_level - rms_db)
        
        # Estimate Noise Level (dB) - analyze quiet segments
        # Split into segments and find minimum RMS (likely noise floor)
        segment_length = int(sr * 0.1)  # 100ms segments
        if segment_length > 0:
            segments = []
            for i in range(0, len(y), segment_length):
                if i + segment_length <= len(y):
                    segments.append(y[i:i+segment_length])
            
            if segments:
                segment_rms = [np.sqrt(np.mean(seg**2)) for seg in segments if len(seg) > 0]
                if segment_rms:
                    # Use 10th percentile as noise floor (quietest segments)
                    noise_rms = np.percentile(segment_rms, 10)
                    # Convert to Python float for JSON serialization
                    noise_level = float(20 * np.log10(noise_rms + 1e-10))
                else:
                    noise_level = float(-60.0)  # Default if calculation fails
            else:
                noise_level = float(-60.0)  # Default if no segments
        else:
            noise_level = float(-60.0)  # Default if segment_length is 0
        
        return {
            'success': True,
            'loudness': float(round(loudness_lufs, 1)),
            'peak_level': float(round(peak_level, 1)),
            'noise_level': float(round(noise_level, 1)),
            'dynamic_range': float(round(dynamic_range, 1))
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'loudness': None,
            'peak_level': None,
            'noise_level': None,
            'dynamic_range': None
        }

