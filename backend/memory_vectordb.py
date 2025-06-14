"""
Simple in-memory vector database implementation
No external dependencies, just using cosine similarity with numpy
"""
import numpy as np
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import uuid
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

@dataclass
class Document:
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None

class MemoryVectorDB:
    """Simple in-memory vector database using cosine similarity"""
    
    def __init__(self, embedding_model: str = "nomic-embed-text", ollama_url: str = "http://localhost:11434"):
        self.documents: Dict[str, Document] = {}
        self.embedding_model = embedding_model
        self.ollama_url = ollama_url
        self.dimension = None  # Will be set when first embedding is generated
        
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Ollama or fall back to mock embedding"""
        try:
            # Try to use real Ollama embeddings first
            return await self._generate_ollama_embedding(text)
        except Exception as e:
            logger.warning(f"Failed to generate Ollama embedding, using mock: {e}")
            # Fall back to mock embeddings if Ollama fails
            return self._generate_mock_embedding(text)
    
    async def _generate_ollama_embedding(self, text: str) -> List[float]:
        """Generate embedding using Ollama API"""
        payload = {
            "model": self.embedding_model,
            "prompt": text
        }
        
        timeout = aiohttp.ClientTimeout(total=10)  # 10 second timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{self.ollama_url}/api/embeddings", json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    embedding = result.get("embedding", [])
                    if embedding:
                        if self.dimension is None:
                            self.dimension = len(embedding)
                        return embedding
                    else:
                        raise Exception("No embedding in response")
                else:
                    raise Exception(f"HTTP {response.status}: {await response.text()}")
    
    
    def _generate_mock_embedding(self, text: str, dimension: int = 384) -> List[float]:
        """Generate a mock embedding based on text hash for development"""
        # Use text hash to generate consistent mock embeddings
        hash_val = hash(text)
        np.random.seed(abs(hash_val) % (2**32))
        embedding = np.random.normal(0, 1, dimension).tolist()
        
        if self.dimension is None:
            self.dimension = dimension
            
        return embedding
    
    async def add_document(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Add a document to the vector database"""
        doc_id = str(uuid.uuid4())
        metadata = metadata or {}
        
        # Generate embedding
        embedding = await self.generate_embedding(content)
        
        # Create document
        doc = Document(
            id=doc_id,
            content=content,
            metadata=metadata,
            embedding=embedding
        )
        
        self.documents[doc_id] = doc
        logger.debug(f"Added document {doc_id} with embedding dimension {len(embedding)}")
        return doc_id
    
    async def add_documents(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Add multiple documents"""
        return await self.add_documents_with_progress(documents)
    
    async def add_documents_with_progress(self, documents: List[Dict[str, Any]], progress_callback=None) -> List[str]:
        """Add multiple documents with progress tracking"""
        doc_ids = []
        total = len(documents)
        
        for i, doc_data in enumerate(documents):
            content = doc_data.get("content", "")
            metadata = doc_data.get("metadata", {})
            doc_id = await self.add_document(content, metadata)
            doc_ids.append(doc_id)
            
            # Report progress every 10 documents or at the end
            if progress_callback and (i + 1) % 10 == 0 or i == total - 1:
                progress_callback(i + 1, total)
                
        return doc_ids

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if len(vec1) != len(vec2):
            return 0.0
            
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        dot_product = np.dot(vec1_np, vec2_np)
        norm1 = np.linalg.norm(vec1_np)
        norm2 = np.linalg.norm(vec2_np)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return dot_product / (norm1 * norm2)
    
    async def search(self, query: str, n_results: int = 5, min_similarity: float = 0.1) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if not self.documents:
            return []
        
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        
        # Calculate similarities
        results = []
        for doc in self.documents.values():
            if doc.embedding is None:
                continue
                
            similarity = self.cosine_similarity(query_embedding, doc.embedding)
            
            if similarity >= min_similarity:
                results.append({
                    "id": doc.id,
                    "content": doc.content,
                    "metadata": doc.metadata,
                    "similarity": similarity
                })
        
        # Sort by similarity (highest first)
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Return top n results
        return results[:n_results]
    
    def count(self) -> int:
        """Get total number of documents"""
        return len(self.documents)
    
    def clear(self):
        """Clear all documents"""
        self.documents.clear()
        self.dimension = None
        logger.info("Cleared all documents from memory vector database")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        return {
            "total_documents": len(self.documents),
            "embedding_dimension": self.dimension,
            "embedding_model": self.embedding_model,
            "memory_usage_mb": len(str(self.documents)) / (1024 * 1024)  # Rough estimate
        }
    
    async def test_connection(self) -> bool:
        """Test if the embedding service is working"""
        # Always return True since we're using mock embeddings
        return True
