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

# Helper to parse BOM XML and ignore Description and NUMBER

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
                "OPT": "",
                "PACKAGE": "",
                "PART-NAME": "",
                "PART-NUM": comp.findtext("PartNumber", "").strip(),
                "QTY": comp.findtext("Value", "").strip(),
                "REFDES": ref
            }
    return components

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

    def key_fields(part):
        return (
            part.get("REFDES", ""),
            part.get("QTY", ""),
            part.get("CORP-NUM", ""),
            part.get("PART-NUM", "")
        )

    for ref, new_comp in new_components.items():
        if ref not in old_components:
            added.append(new_comp)
        else:
            old_comp = old_components[ref]
            if key_fields(old_comp) != key_fields(new_comp):
                changed.append({
                    "REFDES": ref,
                    "Original": old_comp,
                    "Modified": new_comp
                })
    for ref, old_comp in old_components.items():
        if ref not in new_components:
            removed.append(old_comp)

    return {
        "added": added,
        "removed": removed,
        "changed": changed,
        "addedComponents": added,
        "deletedComponents": removed,
        "changedComponents": changed
    }
