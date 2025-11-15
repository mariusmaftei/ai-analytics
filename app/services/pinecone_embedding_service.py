"""
Pinecone Embedding Service - Generate embeddings using Pinecone's Inference API
This is used when the index has integrated embeddings configured
"""
import os
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

class PineconeEmbeddingService:
    """Service for generating embeddings using Pinecone's Inference API"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super(PineconeEmbeddingService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Pinecone embedding service"""
        if not self._initialized:
            self.api_key = os.getenv('PINECONE_API_KEY', '')
            self.index_name = os.getenv('PINECONE_INDEX_NAME', '')
            self.model_name = os.getenv('PINECONE_EMBEDDING_MODEL', 'llama-text-embed-v2')
            
            if self.api_key:
                try:
                    # Initialize Pinecone client for inference API
                    self.pc = Pinecone(api_key=self.api_key)
                    print(f"[OK] Pinecone embedding service configured with model: {self.model_name}")
                except Exception as e:
                    print(f"[WARNING] Failed to initialize Pinecone client: {e}")
                    self.pc = None
            else:
                print("[WARNING] PINECONE_API_KEY not found for embeddings")
                self.pc = None
            
            PineconeEmbeddingService._initialized = True
    
    def generate_embedding(self, text):
        """
        Generate embedding using Pinecone Inference API via SDK
        
        Args:
            text (str): Text to embed
        
        Returns:
            list: Embedding vector (1024 dimensions for llama-text-embed-v2)
        """
        if not self.pc:
            raise ValueError("Pinecone client not initialized. Check PINECONE_API_KEY.")
        
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")
        
        try:
            # Check if inference API is available
            if not hasattr(self.pc, 'inference'):
                raise AttributeError(
                    "Pinecone SDK inference API not available. "
                    "Please ensure you're using pinecone-client>=3.0.0 with inference support, "
                    "or use Google's text-embedding-004 (768 dimensions) instead."
                )
            
            # Use Pinecone SDK's inference API
            result = self.pc.inference.embed(
                model=self.model_name,
                inputs=[text],  # SDK expects a list
                parameters={
                    "input_type": "passage",  # or "query" for queries
                    "truncate": "END"
                }
            )
            
            # Extract embedding from result
            # The SDK returns a list of embeddings (one per input)
            if hasattr(result, 'embeddings') and result.embeddings:
                embedding = result.embeddings[0]
            elif hasattr(result, 'data') and result.data:
                embedding = result.data[0].get('values', [])
            elif isinstance(result, list) and len(result) > 0:
                embedding = result[0] if isinstance(result[0], list) else result[0].get('values', [])
            else:
                # Try to access as dict
                if isinstance(result, dict):
                    if 'data' in result and result['data']:
                        embedding = result['data'][0].get('values', [])
                    elif 'embeddings' in result and result['embeddings']:
                        embedding = result['embeddings'][0]
                    else:
                        print(f"[DEBUG] Unexpected response format: {list(result.keys()) if isinstance(result, dict) else type(result)}")
                        raise ValueError(f"Unexpected response format from Pinecone Inference API")
                else:
                    print(f"[DEBUG] Unexpected response type: {type(result)}")
                    raise ValueError(f"Unexpected response type from Pinecone Inference API: {type(result)}")
            
            if not embedding:
                raise ValueError("No embedding returned from Pinecone Inference API")
            
            # Log dimension for debugging
            if not hasattr(self, '_dimension_logged'):
                print(f"[INFO] Pinecone embedding dimension: {len(embedding)} (model: {self.model_name})")
                self._dimension_logged = True
            
            return embedding
            
        except Exception as e:
            print(f"[ERROR] Pinecone embedding generation error: {e}")
            print(f"[DEBUG] Error type: {type(e).__name__}")
            raise
    
    def generate_embeddings_batch(self, texts):
        """
        Generate embeddings for multiple texts using Pinecone Inference API via SDK
        
        Args:
            texts (list): List of texts to embed
        
        Returns:
            list: List of embedding vectors
        """
        if not self.pc:
            raise ValueError("Pinecone client not initialized. Check PINECONE_API_KEY.")
        
        if not texts:
            return []
        
        try:
            # Check if inference API is available
            if not hasattr(self.pc, 'inference'):
                raise AttributeError(
                    "Pinecone SDK inference API not available. "
                    "Please ensure you're using pinecone-client>=3.0.0 with inference support, "
                    "or use Google's text-embedding-004 (768 dimensions) instead."
                )
            
            # Use Pinecone SDK's inference API for batch
            result = self.pc.inference.embed(
                model=self.model_name,
                inputs=texts,  # Batch input (list of texts)
                parameters={
                    "input_type": "passage",
                    "truncate": "END"
                }
            )
            
            # Extract embeddings from result
            if hasattr(result, 'embeddings') and result.embeddings:
                embeddings = result.embeddings
            elif hasattr(result, 'data') and result.data:
                embeddings = [item.get('values', []) for item in result.data]
            elif isinstance(result, list):
                embeddings = [item if isinstance(item, list) else item.get('values', []) for item in result]
            else:
                # Try to access as dict
                if isinstance(result, dict):
                    if 'data' in result:
                        embeddings = [item.get('values', []) for item in result.get('data', [])]
                    elif 'embeddings' in result:
                        embeddings = result['embeddings']
                    else:
                        raise ValueError(f"Unexpected batch response format: {list(result.keys())}")
                else:
                    raise ValueError(f"Unexpected response type: {type(result)}")
            
            if len(embeddings) != len(texts):
                print(f"[WARN] Expected {len(texts)} embeddings, got {len(embeddings)}, falling back to individual calls")
                return [self.generate_embedding(text) for text in texts]
            
            return embeddings
            
        except Exception as e:
            print(f"[ERROR] Pinecone batch embedding generation error: {e}")
            print(f"[DEBUG] Error type: {type(e).__name__}")
            # Fallback to individual calls
            print("[INFO] Falling back to individual embedding calls...")
            try:
                return [self.generate_embedding(text) for text in texts]
            except Exception as fallback_error:
                print(f"[ERROR] Fallback also failed: {fallback_error}")
                raise
    
    def generate_query_embedding(self, query):
        """
        Generate embedding for a query (different input type) using Pinecone SDK
        
        Args:
            query (str): Query text
        
        Returns:
            list: Embedding vector
        """
        if not self.pc:
            raise ValueError("Pinecone client not initialized. Check PINECONE_API_KEY.")
        
        try:
            # Check if inference API is available
            if not hasattr(self.pc, 'inference'):
                raise AttributeError(
                    "Pinecone SDK inference API not available. "
                    "Please ensure you're using pinecone-client>=3.0.0 with inference support, "
                    "or use Google's text-embedding-004 (768 dimensions) instead."
                )
            
            # Use Pinecone SDK's inference API for queries
            result = self.pc.inference.embed(
                model=self.model_name,
                inputs=[query],  # SDK expects a list
                parameters={
                    "input_type": "query",  # Query type for search
                    "truncate": "END"
                }
            )
            
            # Extract embedding from result
            if hasattr(result, 'embeddings') and result.embeddings:
                embedding = result.embeddings[0]
            elif hasattr(result, 'data') and result.data:
                embedding = result.data[0].get('values', [])
            elif isinstance(result, list) and len(result) > 0:
                embedding = result[0] if isinstance(result[0], list) else result[0].get('values', [])
            else:
                if isinstance(result, dict):
                    if 'data' in result and result['data']:
                        embedding = result['data'][0].get('values', [])
                    elif 'embeddings' in result and result['embeddings']:
                        embedding = result['embeddings'][0]
                    else:
                        raise ValueError(f"Unexpected response format: {list(result.keys())}")
                else:
                    raise ValueError(f"Unexpected response type: {type(result)}")
            
            if not embedding:
                raise ValueError("No embedding returned from Pinecone Inference API")
            
            return embedding
            
        except Exception as e:
            print(f"[ERROR] Pinecone query embedding generation error: {e}")
            print(f"[DEBUG] Error type: {type(e).__name__}")
            raise


# Singleton instance
pinecone_embedding_service = PineconeEmbeddingService()

# Helper functions
def generate_pinecone_embedding(text):
    """Generate embedding using Pinecone Inference API"""
    return pinecone_embedding_service.generate_embedding(text)

def generate_pinecone_embeddings_batch(texts):
    """Generate embeddings for multiple texts using Pinecone Inference API"""
    return pinecone_embedding_service.generate_embeddings_batch(texts)

def generate_pinecone_query_embedding(query):
    """Generate query embedding using Pinecone Inference API"""
    return pinecone_embedding_service.generate_query_embedding(query)

