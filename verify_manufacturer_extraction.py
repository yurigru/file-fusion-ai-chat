#!/usr/bin/env python3
"""
Verify manufacturer extraction from PART-NUM field
"""

import xml.etree.ElementTree as ET

def extract_manufacturer_from_part_num(part_name):
    """Extract manufacturer from PART-NAME field"""
    if not part_name:
        return ""
    
    # Common manufacturer prefixes - expand this list as needed
    manufacturer_prefixes = {
        'TI': 'Texas Instruments',
        'AD': 'Analog Devices',
        'LT': 'Linear Technology',
        'MAX': 'Maxim',
        'LM': 'National Semiconductor',
        'NE': 'Signetics',
        'SN': 'Texas Instruments',
        'MC': 'Motorola',
        'LF': 'National Semiconductor',
        'LP': 'National Semiconductor',
    }
    
    # Try to match manufacturer prefixes
    part_upper = part_name.upper()
    for prefix, manufacturer in manufacturer_prefixes.items():
        if part_upper.startswith(prefix):
            return manufacturer
    
    # For generic components, try to identify by pattern
    if part_upper.startswith('R') and any(c.isdigit() for c in part_upper[1:4]):
        return "Generic"  # Generic resistor
    elif part_upper.startswith('C') and any(c.isdigit() for c in part_upper[1:4]):
        return "Generic"  # Generic capacitor
    
    # If no match found, return empty string
    return ""

def test_manufacturer_extraction():
    print("🔍 Testing Manufacturer Extraction from XML Data")
    print("=" * 50)
    
    # Test with sample XML files
    xml_files = [
        "e:/work/file-fusion-ai-chat/debug/a_old.xml",
        "e:/work/file-fusion-ai-chat/debug/a_new.xml"
    ]
    
    for xml_file in xml_files:
        print(f"\n📁 Testing file: {xml_file}")
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
              # Find some sample parts - using correct XML structure
            details = root.find(".//DETAILS")
            if details is not None:
                records = details.findall("RECORD")[:5]  # First 5 records
                
                for record in records:
                    ref = record.findtext("REFDES", "N/A")
                    part_num = record.findtext("PART-NUM", "N/A")
                    part_name = record.findtext("PART-NAME", "N/A")
                    corp_num = record.findtext("CORP-NUM", "N/A")
                    opt = record.findtext("OPT", "N/A")
                    
                    manufacturer = extract_manufacturer_from_part_num(part_name)  # Use PART-NAME
                    
                    print(f"  {ref:10} | PART-NUM: {part_num:15} | PART-NAME: {part_name:20} | CORP-NUM: {corp_num:15} | OPT: {opt:5} | Manufacturer: {manufacturer}")
            else:
                print("  No DETAILS element found")
                
        except Exception as e:
            print(f"❌ Error reading {xml_file}: {e}")

if __name__ == "__main__":
    test_manufacturer_extraction()
