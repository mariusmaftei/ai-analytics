"""
CSV Service - Handle CSV analysis using Gemini AI
"""
from services.csv_analysis import prompts as csv_prompts


def build_csv_insight_prompt(csv_data, columns, metadata, analysis_type='overview'):
    """
    Build the insight generation prompt for CSV files
    This is kept on the backend for security and consistency
    
    Args:
        csv_data: List of dictionaries representing CSV rows
        columns: List of column names
        metadata: Dictionary with metadata about the CSV
        analysis_type: Type of analysis to perform ('overview', 'statistical', 'patterns', 'quality', 'trends', 'correlation')
    
    Returns:
        str: The formatted prompt for CSV analysis
    """
    return csv_prompts.build_csv_insight_prompt(csv_data, columns, metadata, analysis_type)

