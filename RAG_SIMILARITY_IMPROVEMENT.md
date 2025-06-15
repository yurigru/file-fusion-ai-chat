# RAG Similarity Improvement Guide

## Current Issue: Low Similarity Scores (44.6%)

### Root Cause Analysis

#### 1. **Current Data Format** (Poor for Embeddings)
```python
# Current approach - just concatenates fields
content = "REFDES: R69 | PART-NAME: CRCW0402000JRT1 | PART-NUM: 34760117M | DESCRIPTION: RES CHIP MF 00E 0.06W 5% 00402"
```

**Problems:**
- No natural language context
- Technical jargon without explanation
- Poor semantic meaning for embedding models

#### 2. **Query Mismatch**
- User queries: "What resistors do you have?"
- Stored data: "REFDES: R69 | PART-NAME: CRCW0402000JRT1"
- Semantic gap too large

## 🚀 Recommended Solutions

### **Solution 1: Enhanced Content Generation** (Immediate Fix)

Modify `memory_rag_service.py` to create more searchable content:

```python
def create_enhanced_content(component):
    """Create natural language content for better embeddings"""
    refdes = component.get("REFDES", "")
    part_name = component.get("PART-NAME", "")
    part_num = component.get("PART-NUM", "")
    description = component.get("DESCRIPTION", "")
    package = component.get("PACKAGE", "")
    qty = component.get("QTY", "")
    
    # Create multiple content variations for better matching
    content_parts = []
    
    # Natural language description
    if "RES" in description.upper():
        component_type = "resistor"
        if "000" in part_name or "0 OHM" in description.upper():
            content_parts.append(f"Zero ohm resistor jumper component {refdes}")
            content_parts.append(f"0 ohm resistor for bridging connections")
    elif "CAP" in description.upper():
        component_type = "capacitor"
        content_parts.append(f"Capacitor component {refdes}")
    else:
        component_type = "electronic component"
    
    # Add searchable variations
    content_parts.extend([
        f"{component_type} {refdes} with part number {part_num}",
        f"{package} package {component_type}",
        f"Component {refdes}: {description}",
        f"Part name: {part_name}",
        f"Quantity: {qty} pieces"
    ])
    
    return " ".join(content_parts)
```

### **Solution 2: Better Query Strategies**

#### **For Users - Query Tips:**
- ✅ **Good**: "0402 resistor", "zero ohm resistor", "CRCW0402"
- ❌ **Poor**: "What resistors do you have?"

#### **For System - Query Enhancement:**
```python
def enhance_user_query(query):
    """Enhance user queries for better component matching"""
    # Add technical synonyms
    enhanced_terms = []
    
    if "resistor" in query.lower():
        enhanced_terms.extend(["RES", "ohm", "resistance"])
    if "capacitor" in query.lower():
        enhanced_terms.extend(["CAP", "farad", "capacitance"])
    
    return f"{query} {' '.join(enhanced_terms)}"
```

### **Solution 3: Embedding Model Optimization**

Consider switching to a technical/scientific embedding model:
- `all-MiniLM-L6-v2` (better for technical content)
- `sentence-transformers/all-mpnet-base-v2`
- Fine-tuned model on electronic component data

### **Solution 4: Hybrid Search Approach**

Combine semantic search with keyword matching:
```python
async def hybrid_search(query, n_results=5):
    # 1. Semantic search (current approach)
    semantic_results = await semantic_search(query, n_results)
    
    # 2. Keyword search for part numbers/references
    keyword_results = await keyword_search(query, n_results)
    
    # 3. Combine and re-rank results
    return combine_results(semantic_results, keyword_results)
```

## 📊 Expected Improvements

### **Before (Current)**
- Similarity: 44.6% - Low Match
- Query: "resistor" → "REFDES: R69 | PART-NAME: CRCW0402000JRT1"

### **After (Enhanced)**
- Similarity: 75-85% - Good/High Match  
- Query: "resistor" → "Zero ohm resistor jumper component R69 with part number 34760117M"

## 🛠 Implementation Priority

1. **Quick Fix**: Enhance content generation (30 minutes)
2. **Medium**: Add query enhancement (1 hour)
3. **Advanced**: Switch embedding model (2-3 hours)
4. **Enterprise**: Implement hybrid search (1 day)

## Testing Strategy

1. Upload same BOM file
2. Test queries before/after changes:
   - "zero ohm resistor"
   - "0402 package components"  
   - "resistor R69"
   - "CRCW0402"
3. Compare similarity scores and relevance
