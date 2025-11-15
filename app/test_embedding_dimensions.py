"""
Test script to check embedding dimensions for different models
This helps you configure your Pinecone index with the correct dimension
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

def test_google_embeddings():
    """Test Google's text-embedding-004 model"""
    print("\n" + "="*60)
    print("Testing Google's text-embedding-004 Model")
    print("="*60)
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY not found in .env file")
            return None
        
        genai.configure(api_key=api_key)
        
        # Test text
        test_text = "This is a test sentence to check embedding dimensions."
        
        print(f"[INFO] Test text: '{test_text}'")
        print("[INFO] Generating embedding...")
        
        # Generate embedding
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=test_text,
            task_type="RETRIEVAL_DOCUMENT"
        )
        
        embedding = result['embedding']
        dimension = len(embedding)
        
        print(f"[OK] Success!")
        print(f"[INFO] Dimension: {dimension}")
        print(f"[INFO] Embedding length: {len(embedding)}")
        print(f"[INFO] First 5 values: {embedding[:5]}")
        
        return dimension
        
    except ImportError:
        print("[ERROR] google-generativeai package not installed")
        print("   Install with: pip install google-generativeai")
        return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None


def test_pinecone_embeddings():
    """Test Pinecone's llama-text-embed-v2 model via Inference API"""
    print("\n" + "="*60)
    print("Testing Pinecone's llama-text-embed-v2 Model (Inference API)")
    print("="*60)
    
    try:
        from pinecone import Pinecone
        
        api_key = os.getenv("PINECONE_API_KEY")
        model_name = os.getenv("PINECONE_EMBEDDING_MODEL", "llama-text-embed-v2")
        
        if not api_key:
            print("[ERROR] PINECONE_API_KEY not found in .env file")
            return None
        
        print(f"[INFO] Using model: {model_name}")
        
        # Initialize Pinecone client
        pc = Pinecone(api_key=api_key)
        
        # Check if inference API is available
        if not hasattr(pc, 'inference'):
            print("[ERROR] Pinecone SDK inference API not available")
            print("   Make sure you're using pinecone>=3.0.0")
            print("   Install with: pip install pinecone>=3.0.0")
            return None
        
        # Test text
        test_text = "This is a test sentence to check embedding dimensions."
        
        print(f"📝 Test text: '{test_text}'")
        print("🔄 Generating embedding via Inference API...")
        
        # Generate embedding
        result = pc.inference.embed(
            model=model_name,
            inputs=[test_text],
            parameters={
                "input_type": "passage",
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
            print(f"[ERROR] Unexpected response format: {type(result)}")
            print(f"   Response: {result}")
            return None
        
        dimension = len(embedding)
        
        print(f"[OK] Success!")
        print(f"[INFO] Dimension: {dimension}")
        print(f"[INFO] Embedding length: {len(embedding)}")
        print(f"[INFO] First 5 values: {embedding[:5]}")
        
        return dimension
        
    except ImportError:
        print("❌ pinecone package not installed")
        print("   Install with: pip install pinecone>=3.0.0")
        return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        print(f"   Error type: {type(e).__name__}")
        return None


def test_batch_embeddings():
    """Test batch embedding generation"""
    print("\n" + "="*60)
    print("Testing Batch Embedding Generation")
    print("="*60)
    
    test_texts = [
        "First test sentence.",
        "Second test sentence.",
        "Third test sentence."
    ]
    
    # Test Google batch
    print("\n[TEST] Google text-embedding-004 (Batch):")
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=test_texts,
                task_type="RETRIEVAL_DOCUMENT"
            )
            
            # Handle different response formats
            if 'embeddings' in result:
                embeddings = result['embeddings']
            elif 'embedding' in result:
                # Single embedding returned, wrap in list
                embeddings = [result['embedding']]
            else:
                embeddings = []
            
            print(f"   [OK] Generated {len(embeddings)} embeddings (expected {len(test_texts)})")
            if embeddings:
                print(f"   [INFO] Dimension: {len(embeddings[0])}")
                if len(embeddings) != len(test_texts):
                    print(f"   [WARN] Batch count mismatch - may need individual calls")
        else:
            print("   [WARN] GEMINI_API_KEY not found")
    except Exception as e:
            print(f"   [ERROR] Error: {e}")
    
    # Test Pinecone batch
    print("\n[TEST] Pinecone llama-text-embed-v2 (Batch):")
    try:
        from pinecone import Pinecone
        
        api_key = os.getenv("PINECONE_API_KEY")
        model_name = os.getenv("PINECONE_EMBEDDING_MODEL", "llama-text-embed-v2")
        
        if api_key:
            pc = Pinecone(api_key=api_key)
            
            if hasattr(pc, 'inference'):
                result = pc.inference.embed(
                    model=model_name,
                    inputs=test_texts,
                    parameters={
                        "input_type": "passage",
                        "truncate": "END"
                    }
                )
                
                if hasattr(result, 'embeddings') and result.embeddings:
                    embeddings = result.embeddings
                elif hasattr(result, 'data') and result.data:
                    embeddings = [item.get('values', []) for item in result.data]
                else:
                    embeddings = []
                
                print(f"   [OK] Generated {len(embeddings)} embeddings")
                if embeddings:
                    print(f"   [INFO] Dimension: {len(embeddings[0])}")
            else:
                print("   [WARN] Inference API not available")
        else:
            print("   [WARN] PINECONE_API_KEY not found")
    except Exception as e:
            print(f"   [ERROR] Error: {e}")


def main():
    """Main test function"""
    print("\n" + "="*60)
    print("Embedding Dimension Test Script")
    print("="*60)
    print("\nThis script will test your embedding models and show their dimensions.")
    print("Use this information to configure your Pinecone index correctly.\n")
    
    results = {}
    
    # Test Google embeddings
    google_dim = test_google_embeddings()
    if google_dim:
        results['Google text-embedding-004'] = google_dim
    
    # Test Pinecone embeddings
    pinecone_dim = test_pinecone_embeddings()
    if pinecone_dim:
        results['Pinecone llama-text-embed-v2'] = pinecone_dim
    
    # Test batch embeddings
    test_batch_embeddings()
    
    # Summary
    print("\n" + "="*60)
    print("Summary & Recommendations")
    print("="*60)
    
    if results:
        print("\n[OK] Successfully tested models:")
        for model, dim in results.items():
            print(f"   - {model}: {dim} dimensions")
        
        print("\n[INFO] Configuration Recommendations:")
        print("\n   For your .env file:")
        
        if 'Google text-embedding-004' in results:
            google_dim = results['Google text-embedding-004']
            print(f"\n   # For Google embeddings (768 dimensions)")
            print(f"   PINECONE_DIMENSION={google_dim}")
            print(f"   PINECONE_USE_EMBEDDINGS=false")
        
        if 'Pinecone llama-text-embed-v2' in results:
            pinecone_dim = results['Pinecone llama-text-embed-v2']
            print(f"\n   # For Pinecone Inference API (1024 dimensions)")
            print(f"   PINECONE_DIMENSION={pinecone_dim}")
            print(f"   PINECONE_USE_EMBEDDINGS=true")
            print(f"   PINECONE_EMBEDDING_MODEL=llama-text-embed-v2")
        
        print("\n[WARN] Important:")
        print("   • Your Pinecone index dimension MUST match the embedding dimension")
        print("   • If your index already exists with a different dimension, you need to:")
        print("     1. Delete the old index, OR")
        print("     2. Create a new index with the correct dimension")
        print("   • Check your current index dimension in Pinecone dashboard")
    else:
        print("\n[ERROR] No models were successfully tested.")
        print("   Please check your API keys and package installations.")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()

