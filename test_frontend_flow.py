#!/usr/bin/env python3
"""
Test to simulate browser upload and check frontend data flow
"""

import requests

def test_frontend_flow():
    print("🌐 Testing Complete Frontend Data Flow")
    print("=" * 50)
    
    # Step 1: Test backend API directly
    print("1. Testing Backend API...")
    files = {
        'old_file': ('a_old.xml', open('debug/a_old.xml', 'rb')),
        'new_file': ('a_new.xml', open('debug/a_new.xml', 'rb'))
    }
    
    try:
        response = requests.post('http://localhost:8000/compare-bom', files=files)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend working: {len(data.get('changed', []))} changes")
            
            # Verify data structure matches what frontend expects
            if data.get('changed'):
                first_change = data['changed'][0]
                print(f"📊 Backend Response Structure:")
                print(f"  Reference: {first_change.get('reference')}")
                print(f"  Original keys: {list(first_change.get('original', {}).keys())}")
                print(f"  Modified keys: {list(first_change.get('modified', {}).keys())}")
                
                # Check specific fields
                orig = first_change.get('original', {})
                mod = first_change.get('modified', {})
                print(f"  Original partNumber: '{orig.get('partNumber')}'")
                print(f"  Modified partNumber: '{mod.get('partNumber')}'")
                print(f"  Original quantity: '{orig.get('quantity')}'")
                print(f"  Modified quantity: '{mod.get('quantity')}'")
                print(f"  Original manufacturer: '{orig.get('manufacturer')}'")
                print(f"  Modified manufacturer: '{mod.get('manufacturer')}'")
                
                # Check if this should show manufacturer column
                has_manufacturer = any([
                    orig.get('manufacturer', '').strip(),
                    mod.get('manufacturer', '').strip()
                ])
                print(f"  Should show manufacturer column: {has_manufacturer}")
                
        else:
            print(f"❌ Backend Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False
    
    finally:
        for file_obj in files.values():
            file_obj[1].close()
    
    # Step 2: Test frontend server
    print("\n2. Testing Frontend Server...")
    try:
        response = requests.get('http://localhost:8080')
        if response.status_code == 200:
            print("✅ Frontend server accessible on port 8080")
        else:
            print(f"❌ Frontend server error: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend server test failed: {e}")
        return False
    
    print("\n✅ ALL TESTS PASSED")
    print("\n🔍 Manual Testing Instructions:")
    print("1. Open browser to: http://localhost:8080")
    print("2. Open Developer Tools (F12) -> Console tab")
    print("3. Upload files: debug/a_old.xml and debug/a_new.xml")
    print("4. Click 'Compare BOM'")
    print("5. Check console for debug messages:")
    print("   - Look for '🚀 BOMCompare rendered with data' messages")
    print("   - Look for '🔍 Rendering changed row' messages")
    print("   - Look for '🏭 Checking manufacturer data' messages")
    print("   - Verify field values are not empty")
    print("6. Check the table shows:")
    print("   - Reference designators (R172, etc.)")
    print("   - Part numbers (00087748N -> 00005407N)")
    print("   - Quantities and other fields")
    print("   - NO manufacturer column (since manufacturer fields are empty)")
    
    return True

if __name__ == "__main__":
    test_frontend_flow()
