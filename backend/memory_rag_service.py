"""
RAG Service using in-memory vector database
Simpler, more reliable alternative to ChromaDB
"""
import logging
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional
from memory_vectordb import MemoryVectorDB

logger = logging.getLogger(__name__)

class MemoryRAGService:
    """RAG service using in-memory vector database"""
    
    def __init__(self):
        self.components_db = MemoryVectorDB()
        self.patterns_db = MemoryVectorDB()
        self.embedding_model = "nomic-embed-text"
        self.ollama_url = "http://localhost:11434"
        logger.info("Initialized Memory RAG Service")
    
    def parse_xml_bom(self, xml_content: str) -> Dict[str, Any]:
        """Parse XML BOM content into structured data"""
        logger.info("Parsing XML BOM content...")
        components = []
        
        try:
            tree = ET.ElementTree(ET.fromstring(xml_content))
            root = tree.getroot()
            
            # Try different XML structures
            records = root.findall(".//RECORD")
            if records:
                for record in records:
                    component = {
                        "REFDES": record.findtext("REFDES", "").strip(),
                        "PART-NAME": record.findtext("PART-NAME", "").strip(),
                        "PART-NUM": record.findtext("PART-NUM", "").strip(),
                        "CORP-NUM": record.findtext("CORP-NUM", "").strip(),
                        "DESCRIPTION": record.findtext("DESCRIPTION", "").strip(),
                        "PACKAGE": record.findtext("PACKAGE", "").strip(),
                        "QTY": record.findtext("QTY", "").strip(),
                        "OPT": record.findtext("OPT", "").strip(),
                    }
                    if component["REFDES"]:  # Only add if has reference
                        components.append(component)
            
            logger.info(f"Parsed {len(components)} components from XML")
            return {
                "components": components,
                "total_count": len(components)
            }
            
        except Exception as e:
            logger.error(f"Error parsing XML BOM: {e}")
            return {"components": [], "total_count": 0}
    
    async def add_bom_to_knowledge(self, bom_data: Dict[str, Any], source_name: str):
        """Add BOM components to knowledge base"""
        await self.add_bom_to_knowledge_with_progress(bom_data, source_name)
    
    async def add_bom_to_knowledge_with_progress(self, bom_data: Dict[str, Any], source_name: str, progress_callback=None):
        """Add BOM components to knowledge base with progress tracking"""
        components = bom_data.get("components", [])
        
        if not components:
            logger.warning("No components to add to knowledge base")
            return
        
        logger.info(f"Processing {len(components)} components from {source_name}")
        
        # Add components to vector database with progress tracking
        documents = []
        for i, component in enumerate(components):
            # Create searchable content
            content_parts = []
            for key, value in component.items():
                if value and value.strip():
                    content_parts.append(f"{key}: {value}")
            
            content = " | ".join(content_parts)
            
            metadata = {
                "source": source_name,
                "type": "component",
                **component
            }
            
            documents.append({
                "content": content,
                "metadata": metadata
            })
            
            # Report progress every 10 components
            if progress_callback and (i + 1) % 10 == 0:
                progress_callback(i + 1, len(components))
        
        # Add all documents (this will create embeddings)
        doc_ids = await self.components_db.add_documents_with_progress(documents, progress_callback)
        logger.info(f"Added {len(doc_ids)} components to knowledge base")
        
        # Report completion
        if progress_callback:
            progress_callback(len(components), len(components))
          # Generate some design patterns (optional, in background)
        try:
            await self._generate_design_patterns(components, source_name)
        except Exception as e:
            logger.warning(f"Failed to generate design patterns: {e}")
    
    async def _generate_design_patterns(self, components: List[Dict], source_name: str):
        """Generate design patterns from components"""
        patterns = []
        
        # Group by package type
        package_groups = {}
        for comp in components:
            package = comp.get("PACKAGE", "").strip()
            if package:
                if package not in package_groups:
                    package_groups[package] = []
                package_groups[package].append(comp)
        
        # Create patterns for common packages
        for package, comps in package_groups.items():
            if len(comps) >= 2:  # At least 2 components
                pattern_content = f"Package type: {package} used in {len(comps)} components"
                patterns.append({
                    "content": pattern_content,                    "metadata": {
                        "source": source_name,
                        "type": "pattern",
                        "pattern_type": "package_usage",
                        "package": package,
                        "component_count": len(comps)
                    }
                })
        
        if patterns:
            await self.patterns_db.add_documents(patterns)
            logger.info(f"Generated {len(patterns)} design patterns")
    
    async def query_similar_components(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query for similar components"""
        results = await self.components_db.search(query, n_results)
        return [
            {
                "content": result["content"],
                "metadata": result["metadata"],
                "similarity": result["similarity"]
            }
            for result in results
        ]
    
    def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        return {
            "components_count": self.components_db.count(),
            "patterns_count": self.patterns_db.count(),
            "embedding_model": self.embedding_model,
            "db_type": "memory",
            **self.components_db.get_stats()
        }
    
    async def get_status(self) -> Dict[str, Any]:
        """Get RAG service status"""
        try:
            # Quick status check
            components_count = self.components_db.count()
            patterns_count = self.patterns_db.count()
            total_items = components_count + patterns_count
            
            # Test embedding service (with short timeout)
            embedding_accessible = await self.components_db.test_connection()
            
            status = {
                "status": "operational" if embedding_accessible else "degraded",
                "database": {
                    "accessible": True,
                    "type": "memory",
                    "components": components_count,
                    "patterns": patterns_count,
                    "total_items": total_items
                },
                "embedding_service": {
                    "accessible": embedding_accessible,
                    "model": self.embedding_model,
                    "url": self.ollama_url
                },
                "collections": {
                    "bom_components": {
                        "count": components_count,
                        "status": "active"
                    },
                    "design_patterns": {
                        "count": patterns_count,
                        "status": "active"
                    }
                },
                "overall_status": "operational" if embedding_accessible else "degraded"
            }
            
            logger.info(f"RAG status: {status}")
            return status
            
        except Exception as e:
            logger.error(f"Error getting RAG status: {e}")
            return {
                "status": "error",
                "database": {"accessible": False, "error": str(e), "components": 0, "patterns": 0, "total_items": 0},
                "embedding_service": {"accessible": False, "error": str(e)},
                "collections": {
                    "bom_components": {"count": 0, "status": "error"},
                    "design_patterns": {"count": 0, "status": "error"}
                },
                "overall_status": "error"
            }
    
    def clear_knowledge(self):
        """Clear all knowledge base data"""
        self.components_db.clear()
        self.patterns_db.clear()
        logger.info("Cleared all knowledge base data")
        
        return {
            "status": "success",
            "message": "Knowledge base cleared successfully"
        }

# Global instance
memory_rag_service = MemoryRAGService()
