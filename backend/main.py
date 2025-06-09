from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
import logging
import sys
import traceback

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
        traceback.print_exc()    # Format 3: Try to parse parts directly from any element with needed attributes
    try:
        logger.info("Trying generic XML element search as final fallback...")
        # Lookup different possible tag names and patterns (case-insensitive)
        possible_component_tags = ["part", "component", "item", "element", "row", "component_info", "PART", "COMPONENT"]
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
                        key_lower = key.lower()
                        if key_lower in ["partnumber", "part", "part-num", "pn", "part-number", "part_num"]:
                            comp_data["PART-NUM"] = value.strip()
                        elif key_lower in ["description", "desc", "descr"]:
                            comp_data["DESCRIPTION"] = value.strip()
                        elif key_lower in ["quantity", "qty", "count"]:
                            comp_data["QTY"] = value.strip()
                        elif key_lower in ["package", "footprint", "pkgtype"]:
                            comp_data["PACKAGE"] = value.strip()
                        elif key_lower in ["corp-num", "corp_num", "corpnum", "manufacturer"]:
                            comp_data["CORP-NUM"] = value.strip()
                    
                    # Also check for child elements
                    for child in comp:
                        tag_name = child.tag.lower()
                        if tag_name in ["partnumber", "part", "part-num", "pn", "part-number", "part_num"]:
                            comp_data["PART-NUM"] = child.text.strip() if child.text else ""
                        elif tag_name in ["description", "desc", "descr"]:
                            comp_data["DESCRIPTION"] = child.text.strip() if child.text else ""
                        elif tag_name in ["quantity", "qty", "count"]:
                            comp_data["QTY"] = child.text.strip() if child.text else ""
                        elif tag_name in ["package", "footprint", "pkgtype"]:
                            comp_data["PACKAGE"] = child.text.strip() if child.text else ""
                        elif tag_name in ["corp-num", "corp_num", "corpnum", "manufacturer"]:
                            comp_data["CORP-NUM"] = child.text.strip() if child.text else ""
                    
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
    """Format parsed part data for consistent API response with corrected field mapping"""
      # Extract part numbers - PART-NUM is internal company number, PART-NAME is actual manufacturer part
    part_num = (
        part.get("PART-NUM", "") or 
        part.get("PartNumber", "") or 
        part.get("Part Number", "") or 
        part.get("partNumber", "") or
        part.get("Part_Number", "") or
        part.get("PN", "") or
        part.get("MPN", "") or
        part.get("ManufacturerPartNumber", "") or
        part.get("Mfg_Part_Number", "")
    ).strip()
    
    # PART-NAME contains the actual manufacturer part number
    part_name = (
        part.get("PART-NAME", "") or 
        part.get("PartName", "") or 
        part.get("partName", "") or
        part.get("ComponentName", "") or
        part.get("Name", "")
    ).strip()
      # No longer extracting manufacturer - using PART-NAME directly
    
    # Check if component is active (OPT != "NA")
    opt_value = part.get("OPT", "") or part.get("Optional", "")
    is_active = opt_value.strip().upper() != "NA"
    
    # FIXED: Use consistent lowercase field names to match frontend expectations
    formatted = {
        "reference": (
            part.get("REFDES", "") or 
            part.get("Reference", "") or 
            part.get("RefDes", "") or 
            part.get("reference", "") or
            part.get("Ref", "") or
            part.get("Designator", "") or
            part.get("ComponentRef", "")
        ).strip(),
        "partNumber": part_num,
        "quantity": (
            part.get("QTY", "") or 
            part.get("Quantity", "") or 
            part.get("quantity", "") or 
            part.get("Value", "") or 
            part.get("value", "") or
            part.get("Qty", "") or
            part.get("Count", "") or
            part.get("Amount", "")
        ).strip(),
        "optional": opt_value.strip(),
        "description": (
            part.get("DESCRIPTION", "") or 
            part.get("Description", "") or 
            part.get("description", "") or
            part.get("Desc", "") or
            part.get("Comment", "") or
            part.get("Notes", "") or
            part.get("Name", "")
        ).strip(),
        "footprint": (
            part.get("PACKAGE", "") or 
            part.get("Package", "") or 
            part.get("Footprint", "") or 
            part.get("footprint", "") or
            part.get("Housing", "") or
            part.get("Case", "") or
            part.get("PackageType", "") or
            part.get("Enclosure", "")
        ).strip(),        "partName": part_name,
        "number": (
            part.get("NUMBER", "") or 
            part.get("Number", "") or 
            part.get("number", "") or
            part.get("ItemNumber", "")
        ).strip(),
        "manufacturer": part_name,  # Use PART-NAME instead of manufacturer
        "corpNum": (  # CORP-NUM is company internal ID, not manufacturer
            part.get("CORP-NUM", "") or
            part.get("CORP_NUM", "") or
            part.get("corpNum", "")
        ).strip(),
        "isActive": is_active,  # New field to indicate if component is used
        "status": "active" if is_active else "not_used"  # Human readable status
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
            # Focus on core fields that actually exist in the XML format
            # Removed manufacturer from comparison since it's not available in this XML format
            refdes = part.get("REFDES", "") or part.get("Reference", "") or part.get("RefDes", "")
            qty = part.get("QTY", "") or part.get("Quantity", "") or part.get("Value", "")
            part_num = part.get("PART-NUM", "") or part.get("PartNumber", "") or part.get("Part Number", "")
            description = part.get("DESCRIPTION", "") or part.get("Description", "")
            package = part.get("PACKAGE", "") or part.get("Package", "") or part.get("Footprint", "")
            part_name = part.get("PART-NAME", "") or part.get("PartName", "")
            
            return (refdes, qty, part_num, description, package, part_name)

        # Enhanced validation and statistics
        validation_warnings = []
        
        # Check for potential XML parsing issues
        if not old_components:
            validation_warnings.append("No components found in the first file. Check XML format.")
        if not new_components:
            validation_warnings.append("No components found in the second file. Check XML format.")
            
        # Check for suspicious data patterns
        if old_components:
            empty_part_numbers = sum(1 for comp in old_components.values() 
                                   if not (comp.get("PART-NUM") or comp.get("PartNumber")))
            if empty_part_numbers > len(old_components) * 0.5:
                validation_warnings.append(f"Many components ({empty_part_numbers}/{len(old_components)}) in first file lack part numbers.")
                
        if new_components:
            empty_part_numbers = sum(1 for comp in new_components.values() 
                                   if not (comp.get("PART-NUM") or comp.get("PartNumber")))
            if empty_part_numbers > len(new_components) * 0.5:
                validation_warnings.append(f"Many components ({empty_part_numbers}/{len(new_components)}) in second file lack part numbers.")

        # Log validation warnings
        for warning in validation_warnings:
            logger.warning(f"Validation: {warning}")

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
                    
                    # FIXED: Create the changed component record with consistent lowercase field names
                    changed_comp = {
                        "reference": ref,
                        "original": format_part(old_comp),
                        "modified": format_part(new_comp)
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
            logger.info(f"Added components: {[comp['reference'] for comp in added[:3]]}")
        if removed:
            logger.info(f"Removed components: {[comp['reference'] for comp in removed[:3]]}")
        if changed:
            logger.info(f"Changed components: {[comp['reference'] for comp in changed[:3]]}")
        
        # Check if we found anything        if not added and not removed and not changed:
            logger.warning("No differences found between the BOMs. This could be because the files couldn't be parsed correctly.")        # FIXED: Return using consistent field naming that matches frontend expectations
        result = {
            "addedComponents": added,
            "deletedComponents": removed,
            "changedComponents": changed,
            "validationWarnings": validation_warnings,
            "statistics": {
                "old_components_count": len(old_components),
                "new_components_count": len(new_components),
                "added_count": len(added),
                "removed_count": len(removed),
                "changed_count": len(changed),
                "total_changes": len(added) + len(removed) + len(changed)
            }
        }
        
        # Add debugging information to help diagnose any issues
        if changed:
            logger.debug("Sample changed component from backend:")
            logger.debug(f"Keys in first changed component: {list(changed[0].keys())}")
            logger.debug(f"Keys in original object: {list(changed[0]['original'].keys())}")
            logger.debug(f"Keys in modified object: {list(changed[0]['modified'].keys())}")
        
        logger.info(f"Returning result with: {len(added)} added, {len(removed)} removed, {len(changed)} changed components")
        return result
    except Exception as e:
        logger.error(f"Error in compare_bom: {str(e)}")
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"detail": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
