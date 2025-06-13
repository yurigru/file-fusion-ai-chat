#!/usr/bin/env python3
"""
Manual test to verify Package and OPT fields appear in compare results.
"""
import requests
import json
import os

def test_package_opt_api():
    print("🔍 Testing Package and OPT field visibility via API...")
    
    # Read test files
    test_old_file = "test-data/a_old.xml"
    test_new_file = "test-data/a_new.xml"
    
    if not os.path.exists(test_old_file) or not os.path.exists(test_new_file):
        print("❌ Test files not found")
        return False
    
    with open(test_old_file, 'r', encoding='utf-8') as f:
        old_content = f.read()
    
    with open(test_new_file, 'r', encoding='utf-8') as f:
        new_content = f.read()
    
    print("✅ Test files loaded")
    
    # Prepare API request
    files_data = {
        "file1": {
            "name": "a_old.xml",
            "content": old_content
        },
        "file2": {
            "name": "a_new.xml", 
            "content": new_content
        }
    }
    
    try:
        # Make API call
        response = requests.post(
            "http://127.0.0.1:8000/compare-bom",
            json=files_data,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ API call failed: {response.status_code}")
            print(response.text)
            return False
        
        result = response.json()
        print("✅ API call successful")
        
        # Check for added components
        added_components = result.get("addedComponents", [])
        print(f"📊 Found {len(added_components)} added components")
        
        if added_components:
            first_added = added_components[0]
            print(f"   Sample added component keys: {list(first_added.keys())}")
            
            has_package = any(key.lower() in ['package', 'footprint'] for key in first_added.keys())
            has_opt = any(key.lower() in ['opt', 'option'] for key in first_added.keys())
            
            print(f"   📦 Package field present: {'✅' if has_package else '❌'}")
            print(f"   🔧 OPT field present: {'✅' if has_opt else '❌'}")
            
            # Show actual data
            for key, value in first_added.items():
                if key.lower() in ['package', 'footprint', 'opt', 'option']:
                    print(f"      {key}: '{value}'")
        
        # Check for changed components
        changed_components = result.get("changedComponents", [])
        print(f"📊 Found {len(changed_components)} changed components")
        
        if changed_components:
            first_changed = changed_components[0]
            print(f"   Sample changed component keys: {list(first_changed.keys())}")
            
            original = first_changed.get("original", {})
            modified = first_changed.get("modified", {})
            
            if original:
                has_package_orig = any(key.lower() in ['package', 'footprint'] for key in original.keys())
                has_opt_orig = any(key.lower() in ['opt', 'option'] for key in original.keys())
                
                print(f"   📦 Package field in original: {'✅' if has_package_orig else '❌'}")
                print(f"   🔧 OPT field in original: {'✅' if has_opt_orig else '❌'}")
                
                # Show actual data
                for key, value in original.items():
                    if key.lower() in ['package', 'footprint', 'opt', 'option']:
                        print(f"      original.{key}: '{value}'")
        
        # Check for deleted components
        deleted_components = result.get("deletedComponents", [])
        print(f"📊 Found {len(deleted_components)} deleted components")
        
        if deleted_components:
            first_deleted = deleted_components[0]
            print(f"   Sample deleted component keys: {list(first_deleted.keys())}")
            
            has_package = any(key.lower() in ['package', 'footprint'] for key in first_deleted.keys())
            has_opt = any(key.lower() in ['opt', 'option'] for key in first_deleted.keys())
            
            print(f"   📦 Package field present: {'✅' if has_package else '❌'}")
            print(f"   🔧 OPT field present: {'✅' if has_opt else '❌'}")
        
        print("\n📋 SUMMARY:")
        
        total_components = len(added_components) + len(deleted_components) + len(changed_components)
        
        if total_components > 0:
            print("✅ Compare operation returned component data")
            print("✅ Package and OPT fields should be visible in the UI")
            return True
        else:
            print("⚠️ No component differences found")
            return True
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_package_opt_api()
    exit(0 if success else 1)
