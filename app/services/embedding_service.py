"""
Embedding Service - Generate embeddings using Google's text-embedding-004
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class EmbeddingService:
    """Service for generating text embeddings"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize embedding service"""
        if not self._initialized:
            self.api_key = os.getenv('GEMINI_API_KEY', '')
            self.model_name = os.getenv('EMBEDDING_MODEL', 'text-embedding-004')
            
            if self.api_key:
                genai.configure(api_key=self.api_key)
                print(f"[OK] Embedding service configured with model: {self.model_name}")
            else:
                print("[WARNING] GEMINI_API_KEY not found for embeddings")
            
            EmbeddingService._initialized = True
    
    def generate_embedding(self, text):
        """
        Generate embedding for a single text
        
        Args:
            text (str): Text to embed
        
        Returns:
            list: Embedding vector
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")
        
        try:
            result = genai.embed_content(
                model=self.model_name,
                content=text,
                task_type="retrieval_document"
            )
            
            embedding = result['embedding']
            
            # Log dimension for debugging (only first time)
            if not hasattr(self, '_dimension_logged'):
                print(f"[INFO] Embedding dimension: {len(embedding)} (model: {self.model_name})")
                self._dimension_logged = True
            
            return embedding
        except Exception as e:
            print(f"[ERROR] Embedding generation error: {e}")
            raise
    
    def generate_embeddings_batch(self, texts):
        """
        Generate embeddings for multiple texts
        
        Args:
            texts (list): List of texts to embed
        
        Returns:
            list: List of embedding vectors
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        
        if not texts:
            return []
        
        try:
            # For batch embeddings, the API might return different structures
            # Try batch first, fall back to individual calls if needed
            result = genai.embed_content(
                model=self.model_name,
                content=texts,
                task_type="retrieval_document"
            )
            
            embeddings_list = None
            
            # Check response structure - could be 'embedding' (single) or 'embeddings' (batch)
            if isinstance(result, dict):
                if 'embeddings' in result:
                    embeddings_list = result['embeddings']
                elif 'embedding' in result:
                    # Single embedding returned - this shouldn't happen for batch, but handle it
                    # If we have multiple texts but got one embedding, we need individual calls
                    if len(texts) > 1:
                        print(f"[WARN] Batch API returned single embedding for {len(texts)} texts, using individual calls")
                        return [self.generate_embedding(text) for text in texts]
                    else:
                        embeddings_list = [result['embedding']]
                else:
                    # Unknown structure - fall back to individual calls
                    print(f"[WARN] Unexpected response structure: {list(result.keys())}, using individual calls")
                    return [self.generate_embedding(text) for text in texts]
            elif isinstance(result, list):
                # Response is already a list of embeddings
                embeddings_list = result
            else:
                # Unknown type - fall back to individual calls
                print(f"[WARN] Batch embedding returned unexpected type: {type(result)}, falling back to individual calls")
                return [self.generate_embedding(text) for text in texts]
            
            # Validate that we got the right number of embeddings
            if embeddings_list and len(embeddings_list) != len(texts):
                print(f"[WARN] Embedding count mismatch: got {len(embeddings_list)} embeddings for {len(texts)} texts, using individual calls")
                return [self.generate_embedding(text) for text in texts]
            
            return embeddings_list if embeddings_list else []
                
        except KeyError as e:
            # If 'embeddings' key doesn't exist, try individual calls
            print(f"[WARN] Batch embedding key error: {e}, falling back to individual calls")
            try:
                return [self.generate_embedding(text) for text in texts]
            except Exception as inner_e:
                print(f"[ERROR] Batch embedding generation error (fallback failed): {inner_e}")
                raise
        except Exception as e:
            print(f"[ERROR] Batch embedding generation error: {e}")
            # Try fallback to individual calls
            try:
                print("[INFO] Attempting fallback to individual embedding calls...")
                return [self.generate_embedding(text) for text in texts]
            except Exception as fallback_e:
                print(f"[ERROR] Fallback also failed: {fallback_e}")
                raise
    
    def generate_query_embedding(self, query):
        """
        Generate embedding for a query (different task type)
        
        Args:
            query (str): Query text
        
        Returns:
            list: Embedding vector
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        
        try:
            result = genai.embed_content(
                model=self.model_name,
                content=query,
                task_type="retrieval_query"
            )
            
            return result['embedding']
        except Exception as e:
            print(f"[ERROR] Query embedding generation error: {e}")
            raise


# Singleton instance
embedding_service = EmbeddingService()

# Helper functions
def generate_embedding(text):
    """Generate embedding for text"""
    return embedding_service.generate_embedding(text)

def generate_embeddings_batch(texts):
    """Generate embeddings for multiple texts"""
    return embedding_service.generate_embeddings_batch(texts)

def generate_query_embedding(query):
    """Generate embedding for query"""
    return embedding_service.generate_query_embedding(query)

