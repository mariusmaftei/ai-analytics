# Routes module
from .pdf_routes import pdf_bp
from .rag_routes import rag_bp
from .ai_routes import ai_bp
from .audio_routes import audio_bp

__all__ = ['pdf_bp', 'rag_bp', 'ai_bp', 'audio_bp']

