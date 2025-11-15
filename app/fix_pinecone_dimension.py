"""
Script to fix Pinecone dimension mismatch
This will delete the existing index and recreate it with the correct dimension (768)
"""
import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

def fix_pinecone_dimension():
    """Delete and recreate Pinecone index with correct dimension"""
    
    api_key = os.getenv("PINECONE_API_KEY", "")
    index_name = os.getenv("PINECONE_INDEX_NAME", "rag-index")
    dimension = 768  # text-embedding-004 produces 768-dimensional vectors
    cloud = os.getenv("PINECONE_CLOUD", "aws")
    region = os.getenv("PINECONE_REGION", "us-east-1")
    
    if not api_key:
        print("[ERROR] PINECONE_API_KEY not found in environment variables")
        return
    
    print(f"[INFO] Connecting to Pinecone...")
    pc = Pinecone(api_key=api_key)
    
    # List existing indexes
    existing = {i.name: i for i in pc.list_indexes()}
    
    if index_name in existing:
        print(f"[INFO] Found existing index '{index_name}'")
        print(f"[WARN] This will DELETE the existing index and all its data!")
        response = input(f"Are you sure you want to delete '{index_name}'? (yes/no): ")
        
        if response.lower() != 'yes':
            print("[INFO] Operation cancelled.")
            return
        
        print(f"[INFO] Deleting index '{index_name}'...")
        pc.delete_index(index_name)
        print(f"[OK] Index deleted successfully.")
    else:
        print(f"[INFO] Index '{index_name}' does not exist.")
    
    print(f"[INFO] Creating new index '{index_name}' with dimension {dimension}...")
    pc.create_index(
        name=index_name,
        dimension=dimension,
        metric="cosine",
        spec=ServerlessSpec(cloud=cloud, region=region)
    )
    
    print(f"[OK] Index '{index_name}' created successfully with dimension {dimension}!")
    print(f"[INFO] Make sure PINECONE_DIMENSION=768 is set in your .env file")

if __name__ == "__main__":
    fix_pinecone_dimension()

