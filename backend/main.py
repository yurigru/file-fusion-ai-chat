
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import xml.etree.ElementTree as ET

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

# Helper to parse BOM XML and extract all relevant fields
def parse_bom_xml(xml_content: str) -> Dict[str, Dict[str, str]]:
    tree = ET.ElementTree(ET.fromstring(xml_content))
    root = tree.getroot()
    components = {}
    
    # Try to find <DETAILS><RECORD> structure first
    details = root.find(".//DETAILS")
    if details is not None:
        for record in details.findall("RECORD"):
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
        if components:
            return components
            
    # Fallback to <Component> structure
    for comp in root.findall(".//Component"):
        ref = comp.findtext("Reference", "").strip()
        if ref:
            components[ref] = {
                "CORP-NUM": comp.findtext("Manufacturer", "").strip(),
                "DESCRIPTION": comp.findtext("Description", "").strip(),
                "NUMBER": comp.findtext("NUMBER", "").strip(),
                "OPT": comp.findtext("OPT", "").strip(),
                "PACKAGE": comp.findtext("Package", "").strip(),
                "PART-NAME": comp.findtext("PartName", "").strip(),
                "PART-NUM": comp.findtext("PartNumber", "").strip(),
                "QTY": comp.findtext("Value", "").strip(),
                "REFDES": ref
            }
    return components

def format_part(part):
    return {
        "reference": part.get("REFDES", ""),
        "partNumber": part.get("PART-NUM", ""),
        "value": part.get("QTY", ""),
        "opt": part.get("OPT", ""),
        "description": part.get("DESCRIPTION", ""),
        "package": part.get("PACKAGE", ""),
        "partName": part.get("PART-NAME", ""),
        "manufacturer": part.get("CORP-NUM", ""),
        "number": part.get("NUMBER", "")
    }

@app.post("/compare-bom")
async def compare_bom(
    old_file: UploadFile = File(...),
    new_file: UploadFile = File(...)
) -> Any:
    old_xml = (await old_file.read()).decode()
    new_xml = (await new_file.read()).decode()
    old_components = parse_bom_xml(old_xml)
    new_components = parse_bom_xml(new_xml)

    added = []
    removed = []
    changed = []

    # Key fields for comparison - PART-NUM is primary, then check other fields
    def key_fields(part):
        return (
            part.get("PART-NUM", ""),
            part.get("OPT", ""),
            part.get("QTY", ""),
            part.get("CORP-NUM", "")
        )

    # Check for added and changed components
    for ref, new_comp in new_components.items():
        if ref not in old_components:
            added.append(format_part(new_comp))
        else:
            old_comp = old_components[ref]
            if key_fields(old_comp) != key_fields(new_comp):
                changed.append({
                    "reference": ref,
                    "original": format_part(old_comp),
                    "modified": format_part(new_comp)
                })
    
    # Check for removed components
    for ref, old_comp in old_components.items():
        if ref not in new_components:
            removed.append(format_part(old_comp))

    return {
        "added": added,
        "removed": removed,
        "changed": changed,
        "addedComponents": added,
        "deletedComponents": removed,
        "changedComponents": changed
    }
