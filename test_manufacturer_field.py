#!/usr/bin/env python3
"""
Test script to verify the manufacturer field is populated correctly
"""

import requests
import json

def test_manufacturer_field():
    print("🧪 Testing Manufacturer Field Population")
    print("="*50)
    
    # Test files
    old_file = "debug/a_old.xml"
    new_file = "debug/a_new.xml"
    
    print(f"📁 Uploading files: {old_file} and {new_file}")
    
    try:
        # Upload files to backend
        with open(old_file, 'rb') as f1, open(new_file, 'rb') as f2:
            files = {
                'old_file': ('a_old.xml', f1, 'application/xml'),
                'new_file': ('a_new.xml', f2, 'application/xml')
            }
            
            response = requests.post('http://127.0.0.1:8000/compare-bom', files=files)
            
        if response.status_code == 200:
            data = response.json()
            print("✅ API call successful!")
            
            # Check added components
            added = data.get('addedComponents', [])
            print(f"\n📈 Added Components: {len(added)}")
            for i, comp in enumerate(added[:3]):  # Show first 3
                print(f"  {i+1}. Reference: {comp.get('reference', 'N/A')}")
                print(f"     Part Name (manufacturer field): {comp.get('manufacturer', 'N/A')}")
                print(f"     Part Number (partNumber field): {comp.get('partNumber', 'N/A')}")
                print(f"     Description: {comp.get('description', 'N/A')[:50]}...")
                print()
            
            # Check removed components
            removed = data.get('deletedComponents', [])
            print(f"📉 Removed Components: {len(removed)}")
            for i, comp in enumerate(removed[:3]):  # Show first 3
                print(f"  {i+1}. Reference: {comp.get('reference', 'N/A')}")
                print(f"     Part Name (manufacturer field): {comp.get('manufacturer', 'N/A')}")
                print(f"     Part Number (partNumber field): {comp.get('partNumber', 'N/A')}")
                print(f"     Description: {comp.get('description', 'N/A')[:50]}...")
                print()
            
            # Check changed components
            changed = data.get('changedComponents', [])
            print(f"🔄 Changed Components: {len(changed)}")
            for i, comp in enumerate(changed[:3]):  # Show first 3
                print(f"  {i+1}. Reference: {comp.get('reference', 'N/A')}")
                original = comp.get('original', {})
                modified = comp.get('modified', {})
                print(f"     Original Part Name: {original.get('manufacturer', 'N/A')}")
                print(f"     Modified Part Name: {modified.get('manufacturer', 'N/A')}")
                print(f"     Original Part Number: {original.get('partNumber', 'N/A')}")
                print(f"     Modified Part Number: {modified.get('partNumber', 'N/A')}")
                print()
            
            print(f"🎯 Key Verification Points:")
            print(f"   - All components should have 'manufacturer' field populated with PART-NAME")
            print(f"   - 'partNumber' field should contain PART-NUM (internal company number)")
            print(f"   - Frontend will display 'manufacturer' field as 'Part Name'")
            
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_manufacturer_field()
