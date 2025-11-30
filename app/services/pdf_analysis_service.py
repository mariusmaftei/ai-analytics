"""
PDF Analysis Service - Handle PDF/document analysis using Gemini AI
"""
from services.pdf_analysis import prompts as pdf_prompts


def build_document_insight_prompt(document_text, metadata, tables=None, analysis_type='overview'):
    """
    Build the insight generation prompt for PDF/other documents
    This is kept on the backend for security and consistency
    
    Args:
        document_text: Extracted text from the document
        metadata: Dictionary with metadata about the document
        tables: List of extracted tables (optional)
        analysis_type: Type of analysis to perform ('overview', 'structure', 'content', 'summary', 'keywords')
    
    Returns:
        str: The formatted prompt for document analysis
    """
    return pdf_prompts.build_document_insight_prompt(document_text, metadata, tables, analysis_type)

