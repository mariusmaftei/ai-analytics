"""
Optimized Pinecone Service for RAG (Serverless Ready)
"""

import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv(verbose=False)


class PineconeService:
    """Optimized Pinecone vector DB handler"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Load env variables
        self.api_key = os.getenv("PINECONE_API_KEY", "")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "")
        self.host = os.getenv("PINECONE_HOST", "")
        # Default to 768 for Google's text-embedding-004
        # If using Pinecone's llama-text-embed-v2, set PINECONE_DIMENSION=1024
        self.dimension = int(os.getenv("PINECONE_DIMENSION", "768"))
        # Use Pinecone Inference API only if dimension is 1024 (for llama-text-embed-v2)
        # For 768 dimensions, use Google's text-embedding-004
        self.use_pinecone_embeddings = os.getenv("PINECONE_USE_EMBEDDINGS", "false").lower() == "true"

        self.cloud = os.getenv("PINECONE_CLOUD", "aws")
        self.region = os.getenv("PINECONE_REGION", "us-east-1")

        # Check if Pinecone is configured - if not, allow app to continue without RAG
        if not self.api_key or not self.index_name:
            print("[WARN] Pinecone not configured (PINECONE_API_KEY or PINECONE_INDEX_NAME missing). RAG features will be disabled.")
            self._index = None
            PineconeService._initialized = True
            return

        try:
            self.pc = Pinecone(api_key=self.api_key)
            # Initialize index
            self._index = self._initialize_index()
            embedding_mode = f"Pinecone Inference API ({self.dimension}D)" if (self.use_pinecone_embeddings and self.dimension == 1024) else f"Google embeddings ({self.dimension}D)"
            print(f"[OK] Pinecone initialized → index: {self.index_name}, embedding: {embedding_mode}")
        except Exception as e:
            print(f"[WARN] Pinecone initialization failed: {e}. RAG features will be disabled.")
            self._index = None

        PineconeService._initialized = True

    # ------------------------------------------------------------------------------
    # INDEX INITIALIZATION
    # ------------------------------------------------------------------------------

    def _initialize_index(self):
        """Creates or connects to a serverless Pinecone index"""

        # List existing indexes
        existing = {i.name: i for i in self.pc.list_indexes()}

        if self.index_name not in existing:
            print(f"[INFO] Creating Pinecone index '{self.index_name}' ({self.dimension}D)")
            print(f"[INFO] Note: text-embedding-004 produces 768-dimensional vectors. Ensure PINECONE_DIMENSION=768 in your .env file.")

            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud=self.cloud, region=self.region)
            )

            print("[OK] Index created successfully. Waiting for it to become active...")
        else:
            # Check existing index dimension
            index_info = existing[self.index_name]
            existing_dim = getattr(index_info, 'dimension', None)
            if existing_dim and existing_dim != self.dimension:
                print(f"[WARN] Existing index '{self.index_name}' has dimension {existing_dim}, but PINECONE_DIMENSION is set to {self.dimension}")
                print(f"[WARN] This will cause dimension mismatch errors. Please either:")
                print(f"[WARN]   1. Set PINECONE_DIMENSION={existing_dim} in your .env file, OR")
                print(f"[WARN]   2. Delete and recreate the index with dimension {self.dimension}")

        # Connect to index - host is optional for serverless (can use index name directly)
        if self.host:
            # If host is provided, use it (for explicit connection)
            index = self.pc.Index(name=self.index_name, host=self.host)
        else:
            # For serverless, we can connect using just the index name
            index = self.pc.Index(name=self.index_name)

        # Try reading index stats
        try:
            stats = index.describe_index_stats()
            print(f"[INFO] Stats: {stats}")
        except Exception as e:
            print(f"[WARN] Couldn't fetch stats: {e}")

        return index

    def get_index(self):
        return self._index

    # ------------------------------------------------------------------------------
    # STORE CHUNKS
    # ------------------------------------------------------------------------------

    def store_chunks(self, document_id, chunks, embeddings=None, metadata_list=None):
        """
        Store document chunks with embeddings into Pinecone
        
        Args:
            document_id: Document identifier
            chunks: List of chunk dictionaries with 'text' key
            embeddings: Optional list of pre-computed embeddings (if None, uses integrated embeddings)
            metadata_list: Optional list of additional metadata per chunk
        """

        if not self._index:
            raise ValueError("Pinecone not initialized. Check PINECONE_API_KEY and PINECONE_INDEX_NAME.")

        # Note: Pinecone Python SDK doesn't fully support integrated embeddings yet
        # We need to generate embeddings manually to match the index dimension
        # For integrated embeddings, we still need to provide embeddings that match the index dimension
        if embeddings is None:
            raise ValueError("Embeddings required - please generate embeddings that match your index dimension")
        
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings count mismatch.")
        
        # Validate embedding dimensions
        if embeddings:
            embedding_dim = len(embeddings[0])
            if embedding_dim != self.dimension:
                raise ValueError(
                    f"Embedding dimension mismatch: embeddings have dimension {embedding_dim}, "
                    f"but Pinecone index expects {self.dimension}. "
                    f"Please ensure your embedding model produces {self.dimension}-dimensional vectors, "
                    f"or set PINECONE_DIMENSION={embedding_dim} in your .env file and recreate the index."
                )

        vectors = []

        for i, chunk in enumerate(chunks):
            # Extract text from chunk (could be dict with 'text' key or just a string)
            if isinstance(chunk, dict):
                chunk_text = chunk.get('text', '')
            else:
                chunk_text = str(chunk)
            
            metadata = {
                "document_id": document_id,
                "chunk_index": i,
                "text": chunk_text,
                "total_chunks": len(chunks)
            }

            if metadata_list and i < len(metadata_list):
                metadata.update(metadata_list[i])

            # Store vectors with embeddings (always use values field)
            vectors.append({
                "id": f"{document_id}_chunk_{i}",
                "values": embeddings[i],
                "metadata": metadata
            })

        # Upsert in batches (fast + safe)
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self._index.upsert(vectors=batch)

        print(f"[OK] Stored {len(vectors)} vectors for doc '{document_id}'")

        return {"success": True, "stored": len(vectors), "document_id": document_id}

    # ------------------------------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------------------------------

    def search_similar_chunks(self, embedding, top_k=5, filters=None):
        """Perform semantic search"""

        if not self._index:
            raise ValueError("Pinecone not initialized. Check PINECONE_API_KEY and PINECONE_INDEX_NAME.")

        result = self._index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filters
        )

        return [
            {
                "id": m.id,
                "score": m.score,
                "text": m.metadata.get("text"),
                "chunk_index": m.metadata.get("chunk_index"),
                "document_id": m.metadata.get("document_id")
            }
            for m in result.matches
        ]

    # ------------------------------------------------------------------------------
    # DELETE DOCUMENT
    # ------------------------------------------------------------------------------

    def delete_document(self, document_id):
        """Delete all chunks for a document"""

        if not self._index:
            raise ValueError("Pinecone not initialized. Check PINECONE_API_KEY and PINECONE_INDEX_NAME.")

        result = self._index.query(
            vector=[0.0] * self.dimension,
            top_k=10000,
            include_metadata=True,
            filter={"document_id": document_id}
        )

        ids = [m.id for m in result.matches]

        if ids:
            self._index.delete(ids=ids)

        print(f"[OK] Deleted {len(ids)} chunks from doc '{document_id}'")

        return {"success": True, "deleted": len(ids)}


# ------------------------------------------------------------------------------
# SINGLETON ACCESS HELPERS
# ------------------------------------------------------------------------------

pinecone_service = PineconeService()

def get_pinecone_index():
    """Get Pinecone index, or None if not configured"""
    return pinecone_service.get_index() if pinecone_service._index else None

def store_chunks(document_id, chunks, embeddings, metadata_list=None):
    return pinecone_service.store_chunks(document_id, chunks, embeddings, metadata_list)

def search_similar_chunks(embedding, top_k=5, filters=None):
    return pinecone_service.search_similar_chunks(embedding, top_k, filters)

def delete_document(document_id):
    return pinecone_service.delete_document(document_id)
