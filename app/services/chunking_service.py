"""
Chunking Service - Split documents into smaller chunks for RAG
"""

def chunk_text(text, chunk_size=500, overlap=50, chunk_by='tokens'):
    """
    Split text into chunks with overlap
    
    Args:
        text (str): Text to chunk
        chunk_size (int): Size of each chunk (in tokens or characters)
        overlap (int): Number of tokens/characters to overlap between chunks
        chunk_by (str): 'tokens' or 'characters'
    
    Returns:
        list: List of text chunks with metadata
    """
    if not text or len(text.strip()) == 0:
        return []
    
    chunks = []
    
    if chunk_by == 'tokens':
        # Approximate token count (1 token ≈ 4 characters)
        approximate_tokens = len(text) // 4
        char_chunk_size = chunk_size * 4
        char_overlap = overlap * 4
    else:
        char_chunk_size = chunk_size
        char_overlap = overlap
    
    # Split by sentences first for better chunking
    sentences = _split_into_sentences(text)
    
    current_chunk = ""
    current_size = 0
    chunk_index = 0
    
    for sentence in sentences:
        sentence_size = len(sentence) if chunk_by == 'characters' else len(sentence) // 4
        
        # If adding this sentence would exceed chunk size
        if current_size + sentence_size > char_chunk_size and current_chunk:
            # Save current chunk
            chunks.append({
                'text': current_chunk.strip(),
                'chunk_index': chunk_index,
                'start_char': len(''.join([c['text'] for c in chunks])) if chunks else 0,
                'end_char': len(''.join([c['text'] for c in chunks])) + len(current_chunk.strip())
            })
            chunk_index += 1
            
            # Start new chunk with overlap
            if overlap > 0:
                # Get last N characters for overlap
                overlap_text = current_chunk[-char_overlap:] if len(current_chunk) > char_overlap else current_chunk
                current_chunk = overlap_text + " " + sentence
                current_size = len(overlap_text) + sentence_size
            else:
                current_chunk = sentence
                current_size = sentence_size
        else:
            current_chunk += (" " if current_chunk else "") + sentence
            current_size += sentence_size
    
    # Add the last chunk
    if current_chunk.strip():
        chunks.append({
            'text': current_chunk.strip(),
            'chunk_index': chunk_index,
            'start_char': len(''.join([c['text'] for c in chunks])) if chunks else 0,
            'end_char': len(''.join([c['text'] for c in chunks])) + len(current_chunk.strip())
        })
    
    return chunks


def chunk_document(text, metadata=None, chunk_size=500, overlap=50):
    """
    Chunk a document with metadata
    
    Args:
        text (str): Document text
        metadata (dict): Document metadata (filename, document_id, etc.)
        chunk_size (int): Chunk size in tokens
        overlap (int): Overlap in tokens
    
    Returns:
        list: List of chunks with metadata
    """
    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap, chunk_by='tokens')
    
    # Add metadata to each chunk
    for chunk in chunks:
        chunk['metadata'] = metadata or {}
        chunk['total_chunks'] = len(chunks)
    
    return chunks


def _split_into_sentences(text):
    """Split text into sentences"""
    import re
    # Simple sentence splitting (can be improved with NLTK or spaCy)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

