# RAG Debug Guide - Fixed Data Structure Issues

## Problem Identified
The RAG debugging panel was showing "No content available" because of a data structure mismatch between the backend and frontend.

### Backend Structure (Actual)
```json
{
  "similarity": 0.489,
  "document": "REFDES: R15 | PART-NAME: 10K_RES | PART-NUM: RC0603...",
  "metadata": {
    "REFDES": "R15",
    "PART-NAME": "10K_RES", 
    "PART-NUM": "RC0603FR-0710KL",
    "DESCRIPTION": "RES SMD 10K OHM 1% 1/10W 0603",
    "PACKAGE": "0603",
    "QTY": "1",
    "OPT": "",
    "source": "main_board_v2.xml",
    "type": "component"
  }
}
```

### Frontend Expected Structure (Before Fix)
```json
{
  "similarity": 0.489,
  "document": "content text",
  "metadata": {
    "component_ref": "R15",
    "part_number": "RC0603FR-0710KL",
    "description": "RES SMD 10K OHM 1% 1/10W 0603",
    "package": "0603", 
    "value": "10K_RES",
    "source_file": "main_board_v2.xml",
    "type": "component"
  }
}
```

## Fix Implemented
The display component now handles **both data structures** with fallback mapping:

```typescript
// Smart field mapping handles both structures
part_number: result.metadata.part_number || result.metadata['PART-NUM']
component_ref: result.metadata.component_ref || result.metadata['REFDES'] 
description: result.metadata.description || result.metadata['DESCRIPTION']
value: result.metadata.value || result.metadata['PART-NAME']
package: result.metadata.package || result.metadata['PACKAGE']
source: result.metadata.source_file || result.metadata.source
```

## Enhanced Debug Output
```json
{
  "timestamp": "2025-06-14T14:30:45.123Z",
  "total_results": 1,
  "average_similarity": 0.489,
  "results": [
    {
      "index": 1,
      "similarity": 0.489,
      "component": {
        "part_number": "RC0603FR-0710KL",
        "component_ref": "R15", 
        "description": "RES SMD 10K OHM 1% 1/10W 0603",
        "value": "10K_RES",
        "package": "0603",
        "type": "component",
        "quantity": "1",
        "raw_metadata": {
          "REFDES": "R15",
          "PART-NAME": "10K_RES",
          "PART-NUM": "RC0603FR-0710KL",
          "DESCRIPTION": "RES SMD 10K OHM 1% 1/10W 0603",
          "PACKAGE": "0603",
          "QTY": "1",
          "OPT": "",
          "source": "main_board_v2.xml",
          "type": "component"
        }
      },
      "source_file": "main_board_v2.xml",
      "retrieved_content": "REFDES: R15 | PART-NAME: 10K_RES | PART-NUM: RC0603FR-0710KL | DESCRIPTION: RES SMD 10K OHM 1% 1/10W 0603 | PACKAGE: 0603 | QTY: 1 | OPT: ",
      "data_format": "backend_format"
    }
  ]
}
```

## What Was Fixed

### ✅ **Data Structure Compatibility**
- Added support for both uppercase backend fields (`REFDES`, `PART-NUM`) and lowercase frontend fields
- Smart fallback logic that tries multiple field names
- Raw metadata inclusion for debugging

### ✅ **Content Display**
- Now shows actual retrieved content instead of "No content available"
- Handles cases where `document` field contains the actual component data
- Better formatting for raw component data

### ✅ **Visual Improvements**
- Component information properly extracted and displayed
- Quantity field now shown when available
- Source file correctly identified
- Better handling of missing fields

## Debug Features

### 🔍 **Data Format Detection**
The debug output now includes `data_format` field:
- `"backend_format"`: Data from backend with uppercase fields
- `"frontend_format"`: Data with expected lowercase fields

### 📊 **Raw Metadata Access**
All original metadata is preserved in `raw_metadata` for debugging

### 🎯 **Smart Field Mapping**
Handles common field variations:
- `REFDES` → `component_ref`
- `PART-NUM` → `part_number`  
- `PART-NAME` → `value`
- `DESCRIPTION` → `description`
- `PACKAGE` → `package`
- `QTY` → `quantity`

## Usage

This debug information helps you:

1. **Verify Relevance**: Check if retrieved components are actually relevant to your query
2. **Tune Similarity Thresholds**: See what similarity scores work best
3. **Debug Knowledge Base**: Identify missing or incorrect component data
4. **Optimize Queries**: Understand what terms retrieve the best results
5. **Performance Analysis**: Monitor retrieval quality over time

## Key Metrics

- **Similarity Score**: 0.0-1.0, higher is better match
- **Average Similarity**: Overall quality of retrieved results
- **Total Results**: Number of chunks retrieved from knowledge base
- **Retrieved Content**: Actual text that was matched and used

## Best Practices

- Similarity > 0.8: Excellent match
- Similarity 0.6-0.8: Good match  
- Similarity < 0.6: Potentially irrelevant
