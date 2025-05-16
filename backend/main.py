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
    for comp in root.findall(".//Component"):
        ref = comp.findtext("Reference", "").strip()
        value = comp.findtext("Value", "").strip()
        manufacturer = comp.findtext("Manufacturer", "").strip()
        part_number = comp.findtext("PartNumber", "").strip()
        # Use Reference as key for easy comparison
        components[ref] = {
            "Reference": ref,
            "Value": value,
            "Manufacturer": manufacturer,
            "PartNumber": part_number
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

    for ref, new_comp in new_components.items():
        if ref not in old_components:
            added.append(new_comp)
        else:
            old_comp = old_components[ref]
            # Compare relevant fields
            if (
                old_comp["Value"] != new_comp["Value"] or
                old_comp["Manufacturer"] != new_comp["Manufacturer"] or
                old_comp["PartNumber"] != new_comp["PartNumber"]
            ):
                changed.append({
                    "Reference": ref,
                    "Old": old_comp,
                    "New": new_comp
                })
    for ref, old_comp in old_components.items():
        if ref not in new_components:
            removed.append(old_comp)

    return {
        "added": added,
        "removed": removed,
        "changed": changed
    }
