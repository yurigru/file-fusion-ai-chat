#!/usr/bin/env python3
"""
Detailed field mapping test for changed components
"""
import requests
import json

def test_changed_component_fields():
    print("🔍 Testing Changed Component Field Mapping")
    print("=" * 60)
    
    try:
        with open('debug/a_old.xml', 'rb') as f1, open('debug/a_new.xml', 'rb') as f2:
            files = {
                'old_file': ('a_old.xml', f1, 'application/xml'),
                'new_file': ('a_new.xml', f2, 'application/xml')
            }
            
            response = requests.post('http://127.0.0.1:8000/compare-bom', files=files)
            
            if response.status_code == 200:
                data = response.json()
                
                changed = data.get('changedComponents', [])
                print(f"📊 Found {len(changed)} changed components")
                
                if changed:
                    for i, comp in enumerate(changed[:2]):  # Show first 2
                        print(f"\n📋 Changed Component #{i+1}:")
                        print(f"  Reference: '{comp.get('reference', 'MISSING')}'")
                        
                        original = comp.get('original', {})
                        modified = comp.get('modified', {})
                        
                        print(f"  📤 Original component:")
                        print(f"    partNumber: '{original.get('partNumber', 'MISSING')}'")
                        print(f"    quantity: '{original.get('quantity', 'MISSING')}'")
                        print(f"    footprint: '{original.get('footprint', 'MISSING')}'")
                        print(f"    description: '{original.get('description', 'MISSING')}'")
                        
                        print(f"  📥 Modified component:")
                        print(f"    partNumber: '{modified.get('partNumber', 'MISSING')}'")
                        print(f"    quantity: '{modified.get('quantity', 'MISSING')}'")
                        print(f"    footprint: '{modified.get('footprint', 'MISSING')}'")
                        print(f"    description: '{modified.get('description', 'MISSING')}'")
                        
                        # Test the comparison logic
                        hasPartNumberChange = original.get('partNumber') != modified.get('partNumber')
                        hasQuantityChange = original.get('quantity') != modified.get('quantity')
                        hasFootprintChange = original.get('footprint') != modified.get('footprint')
                        hasDescriptionChange = original.get('description') != modified.get('description')
                        
                        print(f"  🔄 Change Detection:")
                        print(f"    partNumber changed: {hasPartNumberChange}")
                        print(f"    quantity changed: {hasQuantityChange}")
                        print(f"    footprint changed: {hasFootprintChange}")
                        print(f"    description changed: {hasDescriptionChange}")
                        
                        # Check if fields are actually empty
                        print(f"  🚨 Empty Field Check:")
                        print(f"    original.partNumber empty: {not original.get('partNumber')}")
                        print(f"    modified.partNumber empty: {not modified.get('partNumber')}")
                        print(f"    original.quantity empty: {not original.get('quantity')}")
                        print(f"    modified.quantity empty: {not modified.get('quantity')}")
                        
            else:
                print(f"❌ API call failed: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_changed_component_fields()
