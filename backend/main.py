from fastapi import FastAPI, UploadFile, File, Request, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import xml.etree.ElementTree as ET
import logging
import sys
import traceback
import json
import aiohttp
import asyncio
from rag_service import rag_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("bom-compare")

app = FastAPI()

# Allow CORS for local frontend development (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for AI chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = False
    ollama_url: str = "http://localhost:11434"

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]

class OllamaGenerateRequest(BaseModel):
    model: str
    prompt: str
    stream: bool = False
    options: Optional[Dict[str, Any]] = None

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI backend!"}

# Helper to parse BOM XML and ignore Description and NUMBER
def parse_bom_xml(xml_content: str) -> Dict[str, Dict[str, str]]:
    logger.info("Starting to parse XML...")
    components = {}
    
    try:
        tree = ET.ElementTree(ET.fromstring(xml_content))
        root = tree.getroot()
        logger.info(f"XML root tag: {root.tag}")
        
        # First, try to dump the XML structure for debugging
        try:
            logger.debug(f"XML structure overview:")
            for child in root:
                logger.debug(f"L1: {child.tag}")
                for subchild in child:
                    logger.debug(f"  L2: {subchild.tag}")
                    if len(list(subchild)) > 0:
                        logger.debug(f"    L3 examples: {[sc.tag for sc in list(subchild)[:3]]}")
        except Exception as e:
            logger.warning(f"Error while logging XML structure: {str(e)}")
        
        # Try multiple known formats
        
        # Format 1: <DETAILS><RECORD> structure
        details = root.find(".//DETAILS")
        if details is not None:
            logger.info(f"Found DETAILS element with {len(list(details))} children")
            records = details.findall("RECORD")
            logger.info(f"Found {len(records)} RECORD elements")
            
            # First pass to collect all components as they are
            for record in records:
                ref = record.findtext("REFDES", "").strip()
                if ref:
                    components[ref] = {
                        "CORP-NUM": record.findtext("CORP-NUM", "").strip(),
                        "DESCRIPTION": record.findtext("DESCRIPTION", "").strip(),
                        "NUMBER": record.findtext("NUMBER", "").strip(),
                        "OPT": record.findtext("OPT", "").strip(),
                        "PACKAGE": record.findtext("PACKAGE", "").strip(),
                        "PART-NAME": record.findtext("PART-NAME", "").strip(),
                        "PART-NUM": record.findtext("PART-NUM", "").strip(),
                        "QTY": record.findtext("QTY", "").strip(),
                        "REFDES": ref
                    }
            logger.info(f"Parsed {len(components)} components with REFDES from RECORD elements")
            
            # Second pass to expand multiple references (only if first pass had components)
            if components:
                # Check if we need to expand multiple references
                need_expansion = any(',' in ref or '-' in ref for ref in components.keys())
                if need_expansion:
                    logger.info("Found components with multiple reference designators, expanding...")
                    expanded_components = {}
                    for ref, comp in components.items():
                        if ',' in ref or '-' in ref:
                            # Multiple references in one component
                            expanded_refs = []
                            
                            # Process comma-separated references
                            for part in ref.split(','):
                                part = part.strip()
                                if '-' in part:
                                    # Handle ranges like R1-R5 or L40-41
                                    try:
                                        range_parts = part.split('-')
                                        if len(range_parts) == 2:
                                            base, end = range_parts
                                            
                                            # Extract prefix and number from base
                                            prefix = ''.join(c for c in base if not c.isdigit())
                                            base_num = ''.join(c for c in base if c.isdigit())
                                            
                                            # Check if end has prefix or just number
                                            if any(not c.isdigit() for c in end):
                                                # End has prefix (e.g., R1-R5)
                                                expanded_refs.extend([base, end])
                                            else:
                                                # End is just number (e.g., L40-41)
                                                try:
                                                    start_num = int(base_num)
                                                    end_num = int(end)
                                                    expanded_refs.extend([f"{prefix}{i}" for i in range(start_num, end_num + 1)])
                                                except ValueError:
                                                    # If parsing fails, add as is
                                                    expanded_refs.append(part)
                                    except Exception as e:
                                        logger.warning(f"Error expanding range '{part}': {str(e)}")
                                        expanded_refs.append(part)
                                else:
                                    expanded_refs.append(part)
                            
                            # Create individual entries for each expanded reference
                            for expanded_ref in expanded_refs:
                                expanded_components[expanded_ref] = {
                                    "CORP-NUM": comp["CORP-NUM"],
                                    "DESCRIPTION": comp["DESCRIPTION"],
                                    "NUMBER": comp["NUMBER"],
                                    "OPT": comp["OPT"],
                                    "PACKAGE": comp["PACKAGE"],
                                    "PART-NAME": comp["PART-NAME"],
                                    "PART-NUM": comp["PART-NUM"],
                                    "QTY": comp["QTY"],
                                    "REFDES": expanded_ref
                                }
                        else:
                            # Single reference, add as is
                            expanded_components[ref] = comp
                    
                    logger.info(f"After expansion: {len(expanded_components)} individual components")
                    components = expanded_components
        
            if components:
                return components
    except Exception as e:
        logger.error(f"Error in main XML parsing: {str(e)}")
        traceback.print_exc()
    
    # Format 2: <Component> structure
    try:
        logger.info("Trying Component structure as fallback...")
        for comp in root.findall(".//Component"):
            ref = comp.findtext("Reference", "").strip()
            if ref:
                components[ref] = {
                    "CORP-NUM": comp.findtext("Manufacturer", "").strip(),
                    "DESCRIPTION": comp.findtext("Description", "").strip(),
                    "NUMBER": comp.findtext("NUMBER", "").strip(),
                    "OPT": "",
                    "PACKAGE": "",
                    "PART-NAME": "",
                    "PART-NUM": comp.findtext("PartNumber", "").strip(),
                    "QTY": comp.findtext("Value", "").strip(),
                    "REFDES": ref
                }
        logger.info(f"Parsed {len(components)} components with Reference from Component elements")
        if components:
            return components
    except Exception as e:
        logger.error(f"Error in Component fallback: {str(e)}")
        traceback.print_exc()
    
    # Format 3: Try to parse parts directly from any element with needed attributes
    try:
        logger.info("Trying generic XML element search as final fallback...")
        # Lookup different possible tag names and patterns
        possible_component_tags = ["part", "component", "item", "element", "row", "component_info"]
        possible_ref_tags = ["Reference", "Ref", "RefDes", "REFDES", "Designator", "RefDesignator", "id", "name"]
        
        for tag in possible_component_tags:
            components_found = 0
            for comp in root.findall(f".//{tag}"):
                # Try different ways to get reference designator
                ref = None
                # Method 1: Check for child elements with reference info
                for ref_tag in possible_ref_tags:
                    if comp.findtext(ref_tag):
                        ref = comp.findtext(ref_tag).strip()
                        break
                
                # Method 2: Check for attributes
                if not ref:
                    for ref_tag in possible_ref_tags:
                        if ref_tag.lower() in [k.lower() for k in comp.attrib.keys()]:
                            for k, v in comp.attrib.items():
                                if k.lower() == ref_tag.lower():
                                    ref = v.strip()
                                    break
                            if ref:
                                break
                
                if ref:
                    # Found a reference, now extract other properties
                    comp_data = {
                        "CORP-NUM": "",
                        "DESCRIPTION": "",
                        "NUMBER": "",
                        "OPT": "",
                        "PACKAGE": "",
                        "PART-NAME": "",
                        "PART-NUM": "",
                        "QTY": "1",  # Default quantity
                        "REFDES": ref
                    }
                    
                    # Extract all attributes and child elements
                    for key, value in comp.attrib.items():
                        if key.lower() in ["partnumber", "part", "part-num", "pn", "part-number"]:
                            comp_data["PART-NUM"] = value.strip()
                        elif key.lower() in ["description", "desc", "descr"]:
                            comp_data["DESCRIPTION"] = value.strip()
                        elif key.lower() in ["quantity", "qty", "count"]:
                            comp_data["QTY"] = value.strip()
                        elif key.lower() in ["package", "footprint", "pkgtype"]:
                            comp_data["PACKAGE"] = value.strip()
                    
                    # Also check for child elements
                    for child in comp:
                        tag_name = child.tag.lower()
                        if tag_name in ["partnumber", "part", "part-num", "pn", "part-number"]:
                            comp_data["PART-NUM"] = child.text.strip() if child.text else ""
                        elif tag_name in ["description", "desc", "descr"]:
                            comp_data["DESCRIPTION"] = child.text.strip() if child.text else ""
                        elif tag_name in ["quantity", "qty", "count"]:
                            comp_data["QTY"] = child.text.strip() if child.text else ""
                        elif tag_name in ["package", "footprint", "pkgtype"]:
                            comp_data["PACKAGE"] = child.text.strip() if child.text else ""
                    
                    components[ref] = comp_data
                    components_found += 1
            
            if components_found > 0:
                logger.info(f"Found {components_found} components using generic tag '{tag}'")
                break
        
        if components:
            return components
    except Exception as e:
        logger.error(f"Error in generic XML search: {str(e)}")
        traceback.print_exc()
    
    logger.warning("All XML parsing methods failed. Returning empty component list.")
    return components

def format_part(part):
    # Ensure all fields are present and not None
    formatted = {
        "REFDES": part.get("REFDES", "") or part.get("Reference", "") or part.get("RefDes", "") or part.get("reference", ""),
        "PartNumber": part.get("PART-NUM", "") or part.get("PartNumber", "") or part.get("Part Number", "") or part.get("partNumber", ""),
        "QTY": part.get("QTY", "") or part.get("Quantity", "") or part.get("quantity", "") or part.get("Value", "") or part.get("value", ""),
        "OPT": part.get("OPT", ""),
        "DESCRIPTION": part.get("DESCRIPTION", "") or part.get("Description", "") or part.get("description", ""),
        "PACKAGE": part.get("PACKAGE", "") or part.get("Package", "") or part.get("Footprint", "") or part.get("footprint", ""),
        "PARTNAME": part.get("PART-NAME", "") or part.get("PartName", "") or part.get("partName", ""),
        "NUMBER": part.get("NUMBER", "") or part.get("Number", "") or part.get("number", "")
    }
    
    # Add debug logging for the first component
    if part.get("REFDES", "").startswith("R1") or part.get("Reference", "").startswith("R1"):
        logger.debug(f"Original part data: {part}")
        logger.debug(f"Formatted part data: {formatted}")
        
    return formatted

@app.post("/compare-bom")
async def compare_bom(old_file: UploadFile = File(...), new_file: UploadFile = File(...)) -> Any:
    try:
        logger.info(f"Received comparison request for {old_file.filename} and {new_file.filename}")
        old_xml = (await old_file.read()).decode('utf-8', errors='replace')
        new_xml = (await new_file.read()).decode('utf-8', errors='replace')
        logger.info(f"Old file: {old_file.filename}, size: {len(old_xml)} chars")
        logger.info(f"New file: {new_file.filename}, size: {len(new_xml)} chars")
        
        # Save first 500 chars of each file for debugging
        logger.debug(f"Old XML sample: {old_xml[:500]}...")
        logger.debug(f"New XML sample: {new_xml[:500]}...")
        
        old_components = parse_bom_xml(old_xml)
        new_components = parse_bom_xml(new_xml)
        
        logger.info(f"Old components parsed: {len(old_components)}")
        logger.info(f"New components parsed: {len(new_components)}")
        
        if old_components and new_components:
            logger.info(f"Old components sample: {list(old_components.keys())[:5]}")
            logger.info(f"New components sample: {list(new_components.keys())[:5]}")
        
        added = []
        removed = []
        changed = []
        
        def key_fields(part):
            # Include more fields in the comparison to catch more changes
            return (
                part.get("REFDES", "") or part.get("Reference", "") or part.get("RefDes", ""),
                part.get("QTY", "") or part.get("Quantity", "") or part.get("Value", ""),
                part.get("CORP-NUM", "") or part.get("Manufacturer", "") or part.get("CORP_NUM", ""),
                part.get("PART-NUM", "") or part.get("PartNumber", "") or part.get("Part Number", ""),
                part.get("DESCRIPTION", "") or part.get("Description", ""),
                part.get("PACKAGE", "") or part.get("Package", "") or part.get("Footprint", "")
            )

        # Process new components to find added and changed
        for ref, new_comp in new_components.items():
            if ref not in old_components:
                logger.info(f"Added component: {ref}")
                added.append(format_part(new_comp))
            else:
                old_comp = old_components[ref]
                if key_fields(old_comp) != key_fields(new_comp):
                    logger.info(f"Changed component: {ref}")
                    logger.debug(f"  Old: {key_fields(old_comp)}")
                    logger.debug(f"  New: {key_fields(new_comp)}")
                    
                    # Create the changed component record
                    changed_comp = {
                        "Reference": ref,
                        "Original": format_part(old_comp),
                        "Modified": format_part(new_comp)
                    }
                    
                    # Log detailed component data for the first few components
                    if len(changed) < 3:
                        logger.debug(f"Changed component details: {changed_comp}")
                    
                    changed.append(changed_comp)
          # Process old components to find removed
        for ref, old_comp in old_components.items():
            if ref not in new_components:
                logger.info(f"Removed component: {ref}")
                removed.append(format_part(old_comp))
                
        logger.info(f"Comparison results: Added={len(added)}, Removed={len(removed)}, Changed={len(changed)}")
        if added:
            logger.info(f"Added components: {[comp['REFDES'] for comp in added[:3]]}")
        if removed:
            logger.info(f"Removed components: {[comp['REFDES'] for comp in removed[:3]]}")
        if changed:
            logger.info(f"Changed components: {[comp['Reference'] for comp in changed[:3]]}")
        
        # Check if we found anything
        if not added and not removed and not changed:
            logger.warning("No differences found between the BOMs. This could be because the files couldn't be parsed correctly.")
        
        # For compatibility with frontend, return using consistent field naming
        result = {
            "added": added,
            "removed": removed,
            "changed": changed
        }
        
        # Add debugging information to help diagnose any issues
        if changed:
            logger.debug("Sample changed component from backend:")
            logger.debug(f"Keys in first changed component: {list(changed[0].keys())}")
            logger.debug(f"Keys in Original object: {list(changed[0]['Original'].keys())}")
            logger.debug(f"Keys in Modified object: {list(changed[0]['Modified'].keys())}")
        
        logger.info(f"Returning result with: {len(added)} added, {len(removed)} removed, {len(changed)} changed components")
        return result
    except Exception as e:
        logger.error(f"Error in compare_bom: {str(e)}")
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"detail": str(e)})

# AI Chat endpoints
@app.post("/api/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions endpoint that proxies to Ollama"""
    try:
        # Convert messages to a single prompt for Ollama
        prompt = ""
        for message in request.messages:
            if message.role == "system":
                prompt += f"System: {message.content}\n"
            elif message.role == "user":
                prompt += f"User: {message.content}\n"
            elif message.role == "assistant":
                prompt += f"Assistant: {message.content}\n"
        
        prompt += "Assistant: "
        
        # Prepare Ollama request
        ollama_request = {
            "model": request.model,
            "prompt": prompt,
            "stream": request.stream,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
            }
        }
          # Make request to Ollama with timeout for remote connections
        timeout = aiohttp.ClientTimeout(total=30, connect=10)  # 30s total, 10s connect timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                async with session.post(
                    f"{request.ollama_url}/api/generate",
                    json=ollama_request
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama error: {response.status} - {error_text}")
                        return JSONResponse(
                            status_code=response.status,
                            content={"error": f"Ollama server error: {error_text}"}
                        )
            except aiohttp.ClientError as e:
                logger.error(f"Connection error to Ollama at {request.ollama_url}: {str(e)}")
                return JSONResponse(
                    status_code=503,
                    content={"error": f"Cannot connect to Ollama server at {request.ollama_url}. Please check the URL and ensure the server is running."}
                )
                
                if request.stream:
                    # Stream response
                    async def generate():
                        async for line in response.content:
                            if line:
                                try:
                                    data = json.loads(line.decode('utf-8'))
                                    if 'response' in data:
                                        # Convert to OpenAI format
                                        chunk = {
                                            "id": "chatcmpl-ollama",
                                            "object": "chat.completion.chunk",
                                            "created": int(asyncio.get_event_loop().time()),
                                            "model": request.model,
                                            "choices": [{
                                                "index": 0,
                                                "delta": {"content": data['response']},
                                                "finish_reason": "stop" if data.get('done', False) else None
                                            }]
                                        }
                                        yield f"data: {json.dumps(chunk)}\n\n"
                                        
                                        if data.get('done', False):
                                            yield "data: [DONE]\n\n"
                                            break
                                except json.JSONDecodeError:
                                    continue
                    
                    return StreamingResponse(
                        generate(),
                        media_type="text/plain",
                        headers={"Cache-Control": "no-cache"}
                    )
                else:
                    # Non-streaming response
                    data = await response.json()
                    
                    # Convert to OpenAI format
                    return {
                        "id": "chatcmpl-ollama",
                        "object": "chat.completion",
                        "created": int(asyncio.get_event_loop().time()),
                        "model": request.model,
                        "choices": [{
                            "index": 0,
                            "message": {
                                "role": "assistant",
                                "content": data.get('response', '')
                            },
                            "finish_reason": "stop"
                        }],
                        "usage": {
                            "prompt_tokens": data.get('prompt_eval_count', 0),
                            "completion_tokens": data.get('eval_count', 0),
                            "total_tokens": data.get('prompt_eval_count', 0) + data.get('eval_count', 0)
                        }
                    }
                    
    except Exception as e:
        logger.error(f"Error in chat completions: {str(e)}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

@app.get("/api/ollama/models")
async def get_ollama_models(ollama_url: str = "http://localhost:11434"):
    """Get available models from Ollama server"""
    try:
        timeout = aiohttp.ClientTimeout(total=15, connect=5)  # 15s total, 5s connect timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{ollama_url}/api/tags") as response:
                if response.status != 200:
                    return JSONResponse(
                        status_code=response.status,
                        content={"error": f"Failed to connect to Ollama server at {ollama_url}"}
                    )
                
                data = await response.json()
                return data
                
    except aiohttp.ClientError as e:
        logger.error(f"Connection error to Ollama at {ollama_url}: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={"error": f"Cannot connect to Ollama server at {ollama_url}. Please verify the URL and server status."}
        )
    except Exception as e:
        logger.error(f"Error fetching Ollama models: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch models: {str(e)}"}
        )

@app.get("/api/ollama/status")
async def check_ollama_status(ollama_url: str = "http://localhost:11434"):
    """Check if Ollama server is running"""
    try:
        timeout = aiohttp.ClientTimeout(total=10, connect=5)  # 10s total, 5s connect timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{ollama_url}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                return {"status": "connected" if response.status == 200 else "disconnected"}
                
    except Exception as e:
        logger.error(f"Error checking Ollama status: {str(e)}")
        return {"status": "disconnected", "error": str(e)}

@app.get("/api/ollama/test-connection")
async def test_ollama_connection(ollama_url: str = "http://localhost:11434"):
    """Test connection to Ollama server and return detailed info"""
    try:
        timeout = aiohttp.ClientTimeout(total=10, connect=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # Test basic connectivity
            start_time = asyncio.get_event_loop().time()
            async with session.get(f"{ollama_url}/api/tags") as response:
                end_time = asyncio.get_event_loop().time()
                response_time = round((end_time - start_time) * 1000, 2)  # Convert to ms
                
                if response.status == 200:
                    data = await response.json()
                    models_count = len(data.get('models', []))
                    
                    return {
                        "status": "connected",
                        "url": ollama_url,
                        "response_time_ms": response_time,
                        "models_available": models_count,
                        "server_version": response.headers.get("server", "unknown")
                    }
                else:
                    return {
                        "status": "error",
                        "url": ollama_url,
                        "response_time_ms": response_time,
                        "error": f"HTTP {response.status}: {response.reason}"
                    }
                    
    except aiohttp.ClientError as e:
        return {            "status": "connection_failed",
            "url": ollama_url,
            "error": f"Connection failed: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error",
            "url": ollama_url,
            "error": f"Unexpected error: {str(e)}"
        }

# RAG Endpoints
@app.post("/api/rag/add-bom")
async def add_bom_to_knowledge(
    file: UploadFile = File(...),
    source_name: str = Form(...)
):
    """Add BOM file to knowledge base"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Parse the XML content
        bom_data = rag_service.parse_xml_bom(content_str)
        
        # Add to knowledge base
        await rag_service.add_bom_to_knowledge(bom_data, source_name)
        
        return {
            "status": "success",
            "message": f"Added {len(bom_data.get('components', []))} components to knowledge base",
            "source": source_name,
            "component_count": len(bom_data.get('components', []))
        }
    except Exception as e:
        logger.error(f"Failed to add BOM to knowledge base: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add BOM: {str(e)}")

@app.post("/api/rag/query")
async def query_knowledge(request: dict):
    """Query the RAG knowledge base"""
    query = request.get("query", "")
    n_results = request.get("n_results", 5)
    
    if not query.strip():
        return {"results": [], "message": "Empty query"}
    
    try:
        results = await rag_service.query_similar_components(query, n_results)
        return results
    except Exception as e:
        logger.error(f"Knowledge query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/api/rag/stats")
async def get_knowledge_stats():
    """Get knowledge base statistics"""
    try:
        stats = rag_service.get_knowledge_stats()
        return stats
    except Exception as e:
        logger.error(f"Stats retrieval failed: {e}")
        return {
            "components": 0,
            "patterns": 0,
            "total": 0,
            "status": "error",
            "error": str(e)
        }

@app.post("/api/chat/rag-completions")
async def rag_chat_completions(request: ChatRequest):
    """Enhanced chat with RAG context"""
    try:
        # Extract the user's last message for knowledge retrieval
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if user_messages:
            last_query = user_messages[-1].content
            
            # Get relevant knowledge
            knowledge_context = await rag_service.get_contextual_knowledge(last_query)
            
            # Enhance system prompt with retrieved knowledge
            enhanced_messages = []
            system_enhanced = False
            
            for msg in request.messages:
                if msg.role == "system" and not system_enhanced:
                    enhanced_content = f"{msg.content}\n\n{knowledge_context}"
                    enhanced_messages.append({"role": "system", "content": enhanced_content})
                    system_enhanced = True
                else:
                    enhanced_messages.append({"role": msg.role, "content": msg.content})
            
            # If no system message, add one with knowledge
            if not system_enhanced:
                enhanced_messages.insert(0, {
                    "role": "system", 
                    "content": f"You are an expert electronics engineer and BOM analyst.\n\n{knowledge_context}"
                })
            
            # Forward to Ollama with enhanced context
            ollama_request = {
                "model": request.model,
                "messages": enhanced_messages,
                "stream": request.stream
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{request.ollama_url}/v1/chat/completions",
                    json=ollama_request,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result
                    else:
                        error_text = await response.text()
                        raise HTTPException(status_code=response.status, detail=error_text)
        
        # Fallback to regular chat if no enhancement possible
        return await chat_completions(request)
        
    except Exception as e:
        logger.error(f"RAG chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG chat failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
