"""
RAG Service - Retrieval-Augmented Generation orchestration
"""

from .embedding_service import generate_query_embedding
from .pinecone_service import search_similar_chunks
from config.gemini import generate_text_stream

def rag_query(user_query, document_id=None, top_k=5, temperature=0.7, max_tokens=2048):
    """
    Perform RAG query: retrieve relevant chunks and generate answer
    
    Args:
        user_query (str): User's question
        document_id (str): Optional document ID to filter by
        top_k (int): Number of chunks to retrieve
        temperature (float): Generation temperature
        max_tokens (int): Max tokens for generation
    
    Yields:
        str: Generated text chunks
    """
    try:
        # Step 1: Check if using integrated embeddings
        from .pinecone_service import pinecone_service
        use_pinecone_embeddings = pinecone_service.use_pinecone_embeddings
        index_dimension = pinecone_service.dimension
        
        # Step 2: Search for similar chunks
        filters = {"document_id": document_id} if document_id else None
        
        # Generate query embedding
        if use_pinecone_embeddings and index_dimension == 1024:
            # Use Pinecone Inference API to generate 1024-dim embeddings
            try:
                from .pinecone_embedding_service import generate_pinecone_query_embedding
                query_embedding = generate_pinecone_query_embedding(user_query)
            except Exception as e:
                print(f"[WARN] Pinecone Inference API failed: {e}, falling back to Google embeddings")
                query_embedding = generate_query_embedding(user_query)
        else:
            # Use Google embeddings (768 dimensions)
            query_embedding = generate_query_embedding(user_query)
        
        similar_chunks = search_similar_chunks(
            embedding=query_embedding,
            top_k=top_k,
            filters=filters
        )
        
        if not similar_chunks:
            yield "I couldn't find any relevant information in the documents to answer your question."
            return
        
        # Step 3: Build RAG prompt with retrieved context
        context_text = "\n\n".join([
            f"[Chunk {i+1}]: {chunk['text']}"
            for i, chunk in enumerate(similar_chunks)
        ])
        
        rag_prompt = f"""You are an AI assistant helping users understand their documents using Retrieval-Augmented Generation (RAG).

I've retrieved the most relevant sections from the documents based on your question. Use ONLY the information from these retrieved sections to answer the question.

RETRIEVED CONTEXT:
{context_text}

---

USER QUESTION: {user_query}

INSTRUCTIONS:
- Answer the question using ONLY the retrieved context above
- If the information isn't in the retrieved context, say so clearly
- Be specific and reference which chunk(s) contain the relevant information
- If multiple chunks are relevant, synthesize the information
- Keep your answer concise and accurate

Answer:"""
        
        # Step 4: Generate answer using Gemini
        for chunk in generate_text_stream(rag_prompt, temperature=temperature, max_output_tokens=max_tokens):
            yield chunk
            
    except Exception as e:
        print(f"[ERROR] RAG query error: {e}")
        yield f"[ERROR] Failed to process RAG query: {str(e)}"


def rag_query_sync(user_query, document_id=None, top_k=5, temperature=0.7, max_tokens=2048):
    """
    Perform RAG query synchronously (non-streaming)
    
    Args:
        user_query (str): User's question
        document_id (str): Optional document ID to filter by
        top_k (int): Number of chunks to retrieve
        temperature (float): Generation temperature
        max_tokens (int): Max tokens for generation
    
    Returns:
        str: Complete generated answer
    """
    try:
        # Step 1: Check if using integrated embeddings
        from .pinecone_service import pinecone_service
        use_pinecone_embeddings = pinecone_service.use_pinecone_embeddings
        index_dimension = pinecone_service.dimension
        
        # Step 2: Search for similar chunks
        filters = {"document_id": document_id} if document_id else None
        
        # Generate query embedding
        if use_pinecone_embeddings and index_dimension == 1024:
            # Use Pinecone Inference API to generate 1024-dim embeddings
            try:
                from .pinecone_embedding_service import generate_pinecone_query_embedding
                query_embedding = generate_pinecone_query_embedding(user_query)
            except Exception as e:
                print(f"[WARN] Pinecone Inference API failed: {e}, falling back to Google embeddings")
                query_embedding = generate_query_embedding(user_query)
        else:
            # Use Google embeddings (768 dimensions)
            query_embedding = generate_query_embedding(user_query)
        
        similar_chunks = search_similar_chunks(
            embedding=query_embedding,
            top_k=top_k,
            filters=filters
        )
        
        if not similar_chunks:
            return "I couldn't find any relevant information in the documents to answer your question."
        
        # Step 3: Build RAG prompt
        context_text = "\n\n".join([
            f"[Chunk {i+1}]: {chunk['text']}"
            for i, chunk in enumerate(similar_chunks)
        ])
        
        rag_prompt = f"""You are an AI assistant helping users understand their documents using Retrieval-Augmented Generation (RAG).

I've retrieved the most relevant sections from the documents based on your question. Use ONLY the information from these retrieved sections to answer the question.

RETRIEVED CONTEXT:
{context_text}

---

USER QUESTION: {user_query}

INSTRUCTIONS:
- Answer the question using ONLY the retrieved context above
- If the information isn't in the retrieved context, say so clearly
- Be specific and reference which chunk(s) contain the relevant information
- If multiple chunks are relevant, synthesize the information
- Keep your answer concise and accurate

Answer:"""
        
        # Step 4: Generate answer
        from config.gemini import generate_text
        answer = generate_text(rag_prompt, temperature=temperature, max_output_tokens=max_tokens)
        
        return answer
        
    except Exception as e:
        print(f"[ERROR] RAG query error: {e}")
        return f"[ERROR] Failed to process RAG query: {str(e)}"

