from fastapi import FastAPI, UploadFile, File, Request, Form, HTTPException, BackgroundTasks
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
import uuid
from datetime import datetime
from memory_rag_service import memory_rag_service

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

# Background task tracking
background_tasks_status = {}

class TaskStatus:
    def __init__(self, task_id: str, task_type: str, total_items: int = 0):
        self.task_id = task_id
        self.task_type = task_type
        self.status = "running"  # running, completed, failed
        self.progress = 0
        self.total_items = total_items
        self.message = ""
        self.started_at = datetime.now()
        self.completed_at = None
        self.error = None

# Pydantic models for AI chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = False
    ollama_url: str = "http://localhost:11434"
    custom_system_prompt: Optional[str] = None

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

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "message": "Backend is running"}

# Helper to parse BOM XML and ignore Description and NUMBER
def parse_bom_xml(xml_content: str) -> Dict[str, Dict[str, str]]:
    logger.info("=== LOCAL parse_bom_xml CALLED (NOT RAG SERVICE) ===")
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
    logger.info(f"=== BOM COMPARISON ENDPOINT CALLED ===")
    logger.info(f"Received BOM comparison request: {old_file.filename} vs {new_file.filename}")
    try:
        old_xml = (await old_file.read()).decode()
        new_xml = (await new_file.read()).decode()
        logger.info(f"Old XML length: {len(old_xml)}, New XML length: {len(new_xml)}")
        
        logger.info("Calling local parse_bom_xml for old file...")
        old_components = parse_bom_xml(old_xml)
        logger.info("Calling local parse_bom_xml for new file...")
        new_components = parse_bom_xml(new_xml)
        logger.info(f"Parsed components - Old: {len(old_components)}, New: {len(new_components)}")

        added = []
        removed = []
        changed = []

        def key_fields(part):
            return (
                part.get("REFDES", ""),
                part.get("QTY", ""),
                part.get("CORP-NUM", ""),
                part.get("PART-NUM", "")
            )

        for ref, new_comp in new_components.items():
            if ref not in old_components:
                added.append(format_part(new_comp))
            else:
                old_comp = old_components[ref]
                if key_fields(old_comp) != key_fields(new_comp):
                    changed.append({
                        "Reference": ref,
                        "Original": format_part(old_comp),
                        "Modified": format_part(new_comp)
                    })
        for ref, old_comp in old_components.items():
            if ref not in new_components:
                removed.append(format_part(old_comp))

        result = {
            "added": added,
            "removed": removed,
            "changed": changed,
            "addedComponents": added,
            "deletedComponents": removed,
            "changedComponents": changed
        }
        print(f"Comparison result: {len(added)} added, {len(removed)} removed, {len(changed)} changed")
        return result
    except Exception as e:
        print(f"Error during BOM comparison: {str(e)}")
        return JSONResponse(status_code=400, content={"error": str(e)})

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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_name: str = Form(...),
    create_embeddings: bool = Form(True)  # Optional parameter to control embedding creation
):
    """Add BOM file to knowledge base with optional async embedding creation"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Parse the XML content immediately (fast)
        bom_data = memory_rag_service.parse_xml_bom(content_str)
        component_count = len(bom_data.get('components', []))
        
        if not create_embeddings:
            # Fast path: Just parse and return without creating embeddings
            return {
                "status": "success",
                "message": f"Parsed {component_count} components (no embeddings created)",
                "source": source_name,
                "component_count": component_count,
                "embeddings_created": False
            }
        
        # Create a background task for embedding creation
        task_id = str(uuid.uuid4())
        task_status = TaskStatus(task_id, "embedding_creation", component_count)
        background_tasks_status[task_id] = task_status
        
        # Start background embedding creation
        background_tasks.add_task(
            create_embeddings_background,
            task_id,
            bom_data,
            source_name
        )
        
        return {
            "status": "success", 
            "message": f"Parsed {component_count} components, creating embeddings in background",
            "source": source_name,
            "component_count": component_count,
            "embeddings_created": False,
            "background_task_id": task_id,
            "embeddings_status": "processing"
        }
    except Exception as e:
        logger.error(f"Failed to add BOM to knowledge base: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add BOM: {str(e)}")

async def create_embeddings_background(task_id: str, bom_data: Dict[str, Any], source_name: str):
    """Background task to create embeddings for BOM components"""
    task_status = background_tasks_status.get(task_id)
    if not task_status:
        return
    
    try:
        task_status.message = "Creating embeddings for components..."
        components = bom_data.get("components", [])
        
        # Add components to vector database with progress tracking
        await memory_rag_service.add_bom_to_knowledge_with_progress(
            bom_data, 
            source_name,
            progress_callback=lambda current, total: update_task_progress(task_id, current, total)
        )
        
        task_status.status = "completed"
        task_status.progress = 100
        task_status.message = f"Successfully created embeddings for {len(components)} components"
        task_status.completed_at = datetime.now()
        
    except Exception as e:
        task_status.status = "failed"
        task_status.error = str(e)
        task_status.message = f"Failed to create embeddings: {str(e)}"
        task_status.completed_at = datetime.now()
        logger.error(f"Background embedding task {task_id} failed: {e}")

def update_task_progress(task_id: str, current: int, total: int):
    """Update progress for a background task"""
    task_status = background_tasks_status.get(task_id)
    if task_status:
        task_status.progress = int((current / total) * 100) if total > 0 else 0
        task_status.message = f"Processing component {current} of {total}"

@app.get("/api/rag/task-status/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a background task"""
    task_status = background_tasks_status.get(task_id)
    if not task_status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        "task_type": task_status.task_type,
        "status": task_status.status,
        "progress": task_status.progress,
        "total_items": task_status.total_items,
        "message": task_status.message,
        "started_at": task_status.started_at.isoformat(),
        "completed_at": task_status.completed_at.isoformat() if task_status.completed_at else None,
        "error": task_status.error
    }

@app.get("/api/rag/active-tasks")
async def get_active_tasks():
    """Get all active background tasks"""
    active_tasks = []
    for task_id, task_status in background_tasks_status.items():
        if task_status.status == "running":
            active_tasks.append({
                "task_id": task_id,
                "task_type": task_status.task_type,
                "progress": task_status.progress,
                "message": task_status.message,
                "started_at": task_status.started_at.isoformat()
            })
    return {"active_tasks": active_tasks}

@app.get("/api/rag/status")
async def get_rag_status():
    """Get RAG system status and health"""
    logger.info("=== RAG STATUS CHECK STARTED ===")
    try:
        status = await memory_rag_service.get_status()
        logger.info("=== RAG STATUS CHECK COMPLETED ===")
        return status
    except Exception as e:
        logger.error(f"RAG status check failed: {e}")
        return JSONResponse(status_code=500, content={
            "status": "error",
            "error": str(e),
            "database": {"accessible": False, "components_count": 0, "patterns_count": 0},
            "embedding_service": {"accessible": False},
            "overall_status": "error"
        })

@app.get("/api/rag/health")
async def rag_health():
    """Simple RAG service health check without accessing collections"""
    try:
        return {
            "status": "ok", 
            "message": "Memory RAG service initialized",
            "ollama_url": memory_rag_service.ollama_url,
            "embedding_model": memory_rag_service.embedding_model
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/rag/query")
async def query_knowledge(request: dict):
    """Query the RAG knowledge base"""
    query = request.get("query", "")
    n_results = request.get("n_results", 5)
    
    if not query.strip():
        return {"results": [], "message": "Empty query"}
    
    try:
        results = await memory_rag_service.query_similar_components(query, n_results)
        return results
    except Exception as e:
        logger.error(f"Knowledge query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/api/rag/stats")
async def get_knowledge_stats():
    """Get knowledge base statistics"""
    try:
        stats = memory_rag_service.get_knowledge_stats()
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

@app.delete("/api/rag/clear")
async def clear_knowledge_base():
    """Clear all data from the knowledge base"""
    try:
        # Get counts before deletion
        stats = memory_rag_service.get_knowledge_stats()
        components_count = stats.get("components_count", 0)
        patterns_count = stats.get("patterns_count", 0)
        
        # Clear the memory database
        result = memory_rag_service.clear_knowledge()
        
        logger.info(f"Cleared knowledge base: {components_count} components, {patterns_count} patterns")
        
        return {
            "status": "success",
            "message": f"Cleared {components_count + patterns_count} items from knowledge base",
            "components_deleted": components_count,
            "patterns_deleted": patterns_count
        }
    except Exception as e:
        logger.error(f"Failed to clear knowledge base: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear knowledge base: {str(e)}")

# Fast BOM upload without embeddings (for regular preview/compare)
@app.post("/api/bom/upload-fast")
async def upload_bom_fast(file: UploadFile = File(...)):
    """Fast BOM upload that only parses XML without creating embeddings"""
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Just parse the XML (fast)
        components = parse_bom_xml(content_str)
        
        return {
            "status": "success",
            "message": f"Parsed {len(components)} components",
            "filename": file.filename,
            "component_count": len(components),
            "components": components
        }
    except Exception as e:
        logger.error(f"Failed to parse BOM: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse BOM: {str(e)}")

# RAG-Enhanced Chat endpoint
@app.post("/api/chat/rag-completions")
async def rag_chat_completions(request: ChatRequest):
    """RAG-enhanced chat completions that includes relevant knowledge base context"""
    try:
        # Get the last user message for RAG query
        user_message = ""
        for message in reversed(request.messages):
            if message.role == "user":
                user_message = message.content
                break
        
        # Query RAG knowledge base if we have a user message
        rag_results = []
        if user_message.strip():
            try:
                query_response = await memory_rag_service.query_similar_components(user_message, 5)
                if isinstance(query_response, list):
                    rag_results = query_response
                elif isinstance(query_response, dict) and 'results' in query_response:
                    rag_results = query_response['results']
                logger.info(f"RAG query returned {len(rag_results)} results")
            except Exception as e:
                logger.warning(f"RAG query failed, continuing without context: {e}")
        
        # Build enhanced prompt with RAG context
        enhanced_messages = []        # Add system message if not present
        has_system = any(msg.role == "system" for msg in request.messages)
        if not has_system:
            # Use custom system prompt if provided, otherwise use default
            if request.custom_system_prompt:
                system_msg = request.custom_system_prompt
            elif rag_results:
                system_msg = """You are a knowledgeable electronics engineer and BOM (Bill of Materials) analyst. You have access to detailed component information from uploaded BOMs.

COMPONENT TYPE IDENTIFICATION:
- Resistors: REFDES starting with 'R' OR description containing 'RES', 'RESISTOR'
- Capacitors: REFDES starting with 'C' OR description containing 'CAP', 'CAPACITOR' 
- ICs: REFDES starting with 'U' OR description containing 'IC', 'AMPLIFIER', 'BUFFER'
- Transistors: REFDES starting with 'Q' OR description containing 'TRANS', 'MOSFET'
- Diodes: REFDES starting with 'D' OR description containing 'DIODE'

SOURCE FILE FILTERING:
- "new bom" = components from a_new.xml only
- "old bom" = components from a_old.xml only
- "both" or unspecified = components from both files

QUERY INTERPRETATION:
- "show all resistors" = find components with RES/RESISTOR in description OR R prefix
- "resistors in new bom" = resistors from a_new.xml only
- "compare resistors" = show resistor differences between old and new

When answering questions:
- Use the provided component data to give accurate, specific responses
- Reference components by their REFDES (Reference Designator) when relevant
- Include part numbers, descriptions, and package types as appropriate
- Explain component functions and purposes based on their descriptions
- Consider quantities and usage patterns
- Be precise about technical specifications
- If asked about components not in the provided data, clearly state that
- If RAG returns wrong component types, explain the mismatch and suggest better search terms

You understand BOM structures with fields like:
- REFDES (Reference Designator, e.g., C1, R5, U10)
- PART-NAME (Manufacturer part name)
- PART-NUM (Internal part number)
- DESCRIPTION (Component description and specifications)
- PACKAGE (Physical package type)
- QTY (Quantity used)
- OPT (Optional status, e.g., NA for not applicable, blank for required)"""
            else:
                system_msg = "You are a helpful AI assistant with expertise in electronics and BOM analysis."
            enhanced_messages.append({"role": "system", "content": system_msg})
        
        # Add all existing messages
        for message in request.messages:
            enhanced_messages.append({"role": message.role, "content": message.content})
        
        # If we have RAG results, enhance the last user message with context
        if rag_results and enhanced_messages:
            # Find the last user message to enhance
            for i in range(len(enhanced_messages) - 1, -1, -1):
                if enhanced_messages[i]["role"] == "user":
                    original_content = enhanced_messages[i]["content"]
                      # Build context from RAG results with better formatting
                    context_parts = []
                    context_parts.append("=== RELEVANT BOM COMPONENTS ===")
                    
                    for j, result in enumerate(rag_results[:5]):  # Use top 5 results
                        metadata = result.get('metadata', {})
                          # Extract structured component data
                        refdes = metadata.get('REFDES', '')
                        part_name = metadata.get('PART-NAME', '')
                        part_num = metadata.get('PART-NUM', '')
                        description = metadata.get('DESCRIPTION', '')
                        package = metadata.get('PACKAGE', '')
                        qty = metadata.get('QTY', '')
                        opt = metadata.get('OPT', '')
                        
                        # Format component in a structured way
                        comp_info = f"\nComponent {j+1}:"
                        comp_info += f"\n  Reference Designator: {refdes}"
                        comp_info += f"\n  Part Name: {part_name}"
                        comp_info += f"\n  Part Number: {part_num}"
                        comp_info += f"\n  Description: {description}"
                        comp_info += f"\n  Package: {package}"
                        comp_info += f"\n  Quantity: {qty}"
                        comp_info += f"\n  OPT Status: {opt}"
                        
                        if metadata.get('source'):
                            comp_info += f"\n  Source File: {metadata['source']}"
                        
                        context_parts.append(comp_info)
                    
                    context_parts.append("\n=== END BOM COMPONENTS ===")
                    
                    if len(context_parts) > 2:  # More than just headers
                        enhanced_content = f"""You are analyzing BOM (Bill of Materials) data. Use the following component information to provide accurate, detailed responses about the electronic components.

{chr(10).join(context_parts)}

User question: {original_content}

Instructions: 
- Reference specific components by their REFDES (Reference Designator)
- Include part numbers when relevant
- Explain component functions based on descriptions
- Consider quantity information for usage patterns
- Note OPT status (NA means not applicable/optional, blank means required)
- Format your response clearly and professionally"""
                        enhanced_messages[i]["content"] = enhanced_content
                        logger.info(f"Enhanced user message with {len(rag_results)} structured BOM components")
                    break
        
        # Convert to format expected by existing chat endpoint
        chat_request = ChatRequest(
            model=request.model,
            messages=[ChatMessage(role=msg["role"], content=msg["content"]) for msg in enhanced_messages],
            stream=request.stream,
            ollama_url=request.ollama_url
        )
        
        # Use existing chat completions logic
        prompt = ""
        for message in chat_request.messages:
            if message.role == "system":
                prompt += f"System: {message.content}\n"
            elif message.role == "user":
                prompt += f"User: {message.content}\n"
            elif message.role == "assistant":
                prompt += f"Assistant: {message.content}\n"
        
        prompt += "Assistant: "
        
        # Prepare Ollama request
        ollama_request = {
            "model": chat_request.model,
            "prompt": prompt,
            "stream": chat_request.stream,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
            }
        }
        
        # Make request to Ollama with timeout for remote connections
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                async with session.post(
                    f"{chat_request.ollama_url}/api/generate",
                    json=ollama_request
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama error: {response.status} - {error_text}")
                        return JSONResponse(
                            status_code=response.status,
                            content={"error": f"Ollama server error: {error_text}"}
                        )
                    
                    if chat_request.stream:
                        # Stream response - not implemented for RAG yet
                        async def generate():
                            async for line in response.content:
                                if line:
                                    try:
                                        data = json.loads(line.decode('utf-8'))
                                        if 'response' in data:
                                            chunk = {
                                                "id": "chatcmpl-rag-ollama",
                                                "object": "chat.completion.chunk",
                                                "created": int(asyncio.get_event_loop().time()),
                                                "model": chat_request.model,
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
                        
                        # Convert to OpenAI format with RAG results included
                        return {
                            "id": "chatcmpl-rag-ollama",
                            "object": "chat.completion",
                            "created": int(asyncio.get_event_loop().time()),
                            "model": chat_request.model,
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
                            },
                            "rag_results": rag_results  # Include RAG results in response
                        }
                        
            except aiohttp.ClientError as e:
                logger.error(f"Connection error to Ollama at {chat_request.ollama_url}: {str(e)}")
                return JSONResponse(
                    status_code=503,
                    content={"error": f"Cannot connect to Ollama server at {chat_request.ollama_url}. Please check the URL and ensure the server is running."}
                )
                    
    except Exception as e:
        logger.error(f"Error in RAG chat completions: {str(e)}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"RAG chat failed: {str(e)}"}
        )

# Component change detection endpoint
@app.get("/api/rag/component-changes")
async def get_component_changes():
    """Get actual component changes between old and new BOMs"""
    try:
        # Get all components from both files
        all_results = await memory_rag_service.query_similar_components("", 1000)  # Get all components
        
        old_components = {}
        new_components = {}
        
        # Separate components by source file
        for result in all_results:
            metadata = result.get('metadata', {})
            refdes = metadata.get('REFDES', '')
            source = metadata.get('source', '')
            
            if not refdes:
                continue
                
            component_data = {
                'refdes': refdes,
                'part_name': metadata.get('PART-NAME', ''),
                'part_num': metadata.get('PART-NUM', ''),
                'description': metadata.get('DESCRIPTION', ''),
                'package': metadata.get('PACKAGE', ''),
                'qty': metadata.get('QTY', ''),
                'opt': metadata.get('OPT', '')
            }
            
            if source == 'a_old.xml':
                old_components[refdes] = component_data
            elif source == 'a_new.xml':
                new_components[refdes] = component_data
        
        # Find actual changes (same REFDES, different values)
        changes = []
        for refdes in old_components:
            if refdes in new_components:
                old_comp = old_components[refdes]
                new_comp = new_components[refdes]
                
                # Check if any field is different
                if (old_comp['part_name'] != new_comp['part_name'] or
                    old_comp['part_num'] != new_comp['part_num'] or
                    old_comp['description'] != new_comp['description'] or
                    old_comp['package'] != new_comp['package'] or
                    old_comp['qty'] != new_comp['qty'] or
                    old_comp['opt'] != new_comp['opt']):
                    
                    changes.append({
                        'refdes': refdes,
                        'old': old_comp,
                        'new': new_comp,
                        'changes': []  # Could detail specific field changes
                    })
        
        # Find added components (in new but not old)
        added = []
        for refdes in new_components:
            if refdes not in old_components:
                added.append(new_components[refdes])
        
        # Find removed components (in old but not new)
        removed = []
        for refdes in old_components:
            if refdes not in new_components:
                removed.append(old_components[refdes])
        
        return {
            "changes": changes,
            "added": added,
            "removed": removed,
            "summary": {
                "total_changes": len(changes),
                "total_added": len(added),
                "total_removed": len(removed)
            }
        }
        
    except Exception as e:
        logger.error(f"Error detecting component changes: {e}")
        return {"error": str(e), "changes": [], "added": [], "removed": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
