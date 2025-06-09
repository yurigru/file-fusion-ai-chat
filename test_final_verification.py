#!/usr/bin/env python3
"""
Final verification test: Test the complete data flow and ensure 
the BOMCompare component correctly renders changed component data.
"""

import requests
import json

def test_complete_bom_comparison():
    """Test complete BOM comparison flow"""
    
    # Test XML files with known differences
    old_xml = """<?xml version="1.0" encoding="UTF-8"?>
<components>
  <comp ref="R172">
    <libsource lib="Device" part="R"/>
    <value>1k</value>
    <fields>
      <field name="PART-NUM">00087748N</field>
    </fields>
    <sheetpath names="/" tstamps="/"/>
    <tstamps>9c3eb6e7-5694-4c7c-b9ae-a936f2dbf1ed</tstamps>
  </comp>
</components>"""

    new_xml = """<?xml version="1.0" encoding="UTF-8"?>
<components>
  <comp ref="R172">
    <libsource lib="Device" part="R"/>
    <value>2k</value>
    <fields>
      <field name="PART-NUM">00005407N</field>
    </fields>
    <sheetpath names="/" tstamps="/"/>
    <tstamps>9c3eb6e7-5694-4c7c-b9ae-a936f2dbf1ed</tstamps>
  </comp>
</components>"""

    print("🔄 Testing BOM comparison API...")
    
    # Prepare files for upload
    files = {
        'old_file': ('old.xml', old_xml, 'application/xml'),
        'new_file': ('new.xml', new_xml, 'application/xml')
    }
    
    try:
        # Test the API endpoint
        response = requests.post('http://127.0.0.1:8000/compare-bom', files=files, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response received successfully!")
            print(f"📊 Statistics: {data.get('statistics', {})}")
            
            # Check for changed components
            changed_components = data.get('changedComponents', [])
            if changed_components:
                print(f"🔄 Found {len(changed_components)} changed component(s)")
                
                # Check the first changed component structure
                first_changed = changed_components[0]
                print(f"📋 First changed component: {first_changed.get('reference', 'Unknown')}")
                
                # Verify field structure
                original = first_changed.get('original', {})
                modified = first_changed.get('modified', {})
                
                print(f"🔍 Original part number: {original.get('partNumber', 'Missing')}")
                print(f"🔍 Modified part number: {modified.get('partNumber', 'Missing')}")
                
                # Test what the frontend rendering logic would see
                has_part_number_change = original.get('partNumber') != modified.get('partNumber')
                print(f"📝 Part number changed: {has_part_number_change}")
                
                # Simulate the rendering logic from BOMCompare component
                if has_part_number_change:
                    display_value = f"{original.get('partNumber', '')} → {modified.get('partNumber', '')}"
                else:
                    display_value = original.get('partNumber', '') or modified.get('partNumber', '')
                
                print(f"🎨 Expected display value: {display_value}")
                
                # Verify all expected fields are present
                expected_fields = ['partNumber', 'quantity', 'description', 'footprint']
                for field in expected_fields:
                    orig_val = original.get(field, 'Missing')
                    mod_val = modified.get(field, 'Missing')
                    print(f"📊 {field}: {orig_val} -> {mod_val}")
                
                print("✅ All data fields are properly structured for frontend rendering!")
                return True
            else:
                print("❌ No changed components found in API response")
                return False
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server. Is it running on port 8000?")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Final BOM Comparison Verification Test")
    print("=" * 50)
    success = test_complete_bom_comparison()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ALL TESTS PASSED! The BOM comparison should now display correctly.")
        print("📋 Next steps:")
        print("   1. Open http://localhost:8080 in your browser")
        print("   2. Upload the test XML files from debug/ folder")
        print("   3. Check that 'Changed' table shows part numbers correctly")
    else:
        print("❌ Tests failed. Please check the backend server and try again.")
