from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
import requests
import json
import logging
from pathlib import Path
import asyncio
import aiohttp
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class BOMRAGService:
    def __init__(self, ollama_url: str = "http://localhost:11434", embedding_model: str = "nomic-embed-text"):
        self.ollama_url = ollama_url
        self.embedding_model = embedding_model
        
        # Initialize Chroma DB
        self.client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Create collections for different types of knowledge
        self.components_collection = self.client.get_or_create_collection(
            name="bom_components",
            metadata={"description": "Individual BOM components with specifications"}
        )
        
        self.patterns_collection = self.client.get_or_create_collection(
            name="design_patterns", 
            metadata={"description": "PCB design patterns and best practices"}
        )
        
        logger.info("BOM RAG Service initialized with Chroma DB")
        
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using Ollama"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ollama_url}/api/embeddings",
                    json={
                        "model": self.embedding_model,
                        "prompt": text
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("embedding", [])
                    else:
                        logger.error(f"Embedding API error: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return []
    
    def parse_xml_bom(self, xml_content: str) -> Dict[str, Any]:
        """Parse XML BOM content and extract components"""
        try:
            root = ET.fromstring(xml_content)
            components = []
            
            # Handle different XML structures
            for record in root.findall(".//RECORD"):
                component = {}
                for child in record:
                    if child.text:
                        component[child.tag] = child.text.strip()
                components.append(component)
            
            # Handle direct component tags
            if not components:
                for comp in root.findall(".//COMPONENT"):
                    component = comp.attrib.copy()
                    for child in comp:
                        if child.text:
                            component[child.tag] = child.text.strip()
                    components.append(component)
            
            return {
                "components": components,
                "total_count": len(components)
            }
        except Exception as e:
            logger.error(f"XML parsing error: {e}")
            return {"components": [], "total_count": 0}
    
    async def add_bom_to_knowledge(self, bom_data: Dict[str, Any], source_file: str):
        """Add BOM components to vector database"""
        components = bom_data.get('components', [])
        if not components:
            logger.warning(f"No components found in {source_file}")
            return
        
        documents = []
        metadatas = []
        ids = []
        
        logger.info(f"Processing {len(components)} components from {source_file}")
        
        for i, component in enumerate(components):
            # Create searchable text from component data
            component_text = self._component_to_text(component)
            if not component_text.strip():
                continue
                
            documents.append(component_text)
            metadatas.append({
                "source_file": source_file,
                "component_ref": component.get("REFDES", component.get("Reference", f"comp_{i}")),
                "part_number": component.get("PART-NUM", component.get("PartNumber", "")),
                "package": component.get("PACKAGE", ""),
                "description": component.get("DESCRIPTION", ""),
                "value": component.get("VALUE", component.get("QTY", "")),
                "partname": component.get("PART-NAME", component.get("PARTNAME", "")),
                "type": "component",
                "timestamp": source_file  # Use source file as timestamp for now
            })
            ids.append(f"{source_file}_{i}_{component.get('REFDES', i)}")
        
        if documents:
            try:
                self.components_collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                logger.info(f"Added {len(documents)} components to knowledge base")
            except Exception as e:
                logger.error(f"Failed to add components to vector DB: {e}")
    
    def _component_to_text(self, component: Dict[str, Any]) -> str:
        """Convert component data to searchable text"""
        parts = []
        
        # Reference designator
        if ref := (component.get("REFDES") or component.get("Reference")):
            parts.append(f"Reference: {ref}")
            
        # Part number
        if part_num := (component.get("PART-NUM") or component.get("PartNumber")):
            parts.append(f"Part Number: {part_num}")
            
        # Package/footprint
        if package := component.get("PACKAGE"):
            parts.append(f"Package: {package}")
            
        # Description
        if desc := component.get("DESCRIPTION"):
            parts.append(f"Description: {desc}")
            
        # Value/quantity
        if value := (component.get("VALUE") or component.get("QTY")):
            parts.append(f"Value: {value}")
            
        # Part name
        if partname := (component.get("PART-NAME") or component.get("PARTNAME")):
            parts.append(f"Part Name: {partname}")
        
        return " | ".join(parts)
    
    async def query_similar_components(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """Query for similar components in the knowledge base"""
        try:
            # Simple text-based search first (fallback)
            try:
                results = self.components_collection.query(
                    query_texts=[query],
                    n_results=n_results,
                    include=["documents", "metadatas", "distances"]
                )
                
                if results["documents"] and results["documents"][0]:
                    return {
                        "results": [
                            {
                                "document": doc,
                                "metadata": meta,
                                "similarity": max(0, 1 - dist)  # Convert distance to similarity
                            }
                            for doc, meta, dist in zip(
                                results["documents"][0],
                                results["metadatas"][0], 
                                results["distances"][0]
                            )
                        ],
                        "method": "text_search"
                    }
            except Exception as e:
                logger.warning(f"Text search failed, trying embedding search: {e}")
            
            # Try embedding-based search
            query_embedding = await self.generate_embedding(query)
            if query_embedding:
                results = self.components_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results,
                    include=["documents", "metadatas", "distances"]
                )
                
                if results["documents"] and results["documents"][0]:
                    return {
                        "results": [
                            {
                                "document": doc,
                                "metadata": meta,
                                "similarity": max(0, 1 - dist)
                            }
                            for doc, meta, dist in zip(
                                results["documents"][0],
                                results["metadatas"][0], 
                                results["distances"][0]
                            )
                        ],
                        "method": "embedding_search"
                    }
            
            return {"results": [], "method": "no_results"}
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return {"results": [], "method": "error", "error": str(e)}
    
    async def get_contextual_knowledge(self, bom_analysis_query: str) -> str:
        """Get relevant knowledge for BOM analysis"""
        similar = await self.query_similar_components(bom_analysis_query, n_results=3)
        
        if not similar["results"]:
            return "No relevant component knowledge found in database."
        
        context_parts = ["**📊 Relevant Component Knowledge:**"]
        
        for i, result in enumerate(similar["results"]):
            similarity_pct = int(result["similarity"] * 100)
            metadata = result["metadata"]
            
            # Format component info
            comp_info = []
            if ref := metadata.get("component_ref"):
                comp_info.append(f"Ref: {ref}")
            if part := metadata.get("part_number"):
                comp_info.append(f"Part: {part}")
            if pkg := metadata.get("package"):
                comp_info.append(f"Package: {pkg}")
            
            comp_summary = " | ".join(comp_info) if comp_info else "Component data"
            
            context_parts.append(
                f"{i+1}. **{comp_summary}** (Match: {similarity_pct}%)"
            )
            context_parts.append(f"   Source: {metadata.get('source_file', 'Unknown')}")
            context_parts.append(f"   Details: {result['document'][:100]}...")
            context_parts.append("")
        
        context_parts.append(f"*Search method: {similar.get('method', 'unknown')}*")
        return "\n".join(context_parts)
    
    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        try:
            components_count = self.components_collection.count()
            patterns_count = self.patterns_collection.count()
            
            return {
                "components": components_count,
                "patterns": patterns_count,
                "total": components_count + patterns_count,
                "status": "healthy"
            }
        except Exception as e:
            logger.error(f"Stats retrieval failed: {e}")
            return {
                "components": 0,
                "patterns": 0, 
                "total": 0,
                "status": "error",
                "error": str(e)
            }

# Global RAG service instance
rag_service = BOMRAGService()
