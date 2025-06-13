"""
Simple backend test to check if PACKAGE field is being returned correctly
"""
import sys
import os
sys.path.append('backend')

from main import compare_bom_files
from fastapi import UploadFile
from io import BytesIO

def test_backend_package_field():
    print("=== Testing Backend PACKAGE Field ===")
    
    # Read test files
    with open('test-data/a_old.xml', 'rb') as f:
        old_content = f.read()
    
    with open('test-data/a_new.xml', 'rb') as f:
        new_content = f.read()
    
    # Create UploadFile objects
    old_file = UploadFile(
        filename="a_old.xml",
        file=BytesIO(old_content),
        headers={"content-type": "application/xml"}
    )
    
    new_file = UploadFile(
        filename="a_new.xml", 
        file=BytesIO(new_content),
        headers={"content-type": "application/xml"}
    )
    
    try:
        result = compare_bom_files(old_file, new_file)
        
        print("Result keys:", list(result.keys()))
        
        # Check added components
        if 'added' in result and result['added']:
            print(f"\nAdded components count: {len(result['added'])}")
            for i, comp in enumerate(result['added'][:3]):  # Show first 3
                print(f"Added component {i+1}:")
                print(f"  REFDES: {comp.get('REFDES', 'N/A')}")
                print(f"  PACKAGE: '{comp.get('PACKAGE', 'N/A')}'")
                print(f"  OPT: '{comp.get('OPT', 'N/A')}'")
                print(f"  All keys: {list(comp.keys())}")
                print()
        
        # Check changed components
        if 'changed' in result and result['changed']:
            print(f"Changed components count: {len(result['changed'])}")
            for i, comp in enumerate(result['changed'][:3]):  # Show first 3
                print(f"Changed component {i+1}:")
                print(f"  Reference: {comp.get('Reference', 'N/A')}")
                if 'Original' in comp:
                    print(f"  Original PACKAGE: '{comp['Original'].get('PACKAGE', 'N/A')}'")
                    print(f"  Original OPT: '{comp['Original'].get('OPT', 'N/A')}'")
                if 'Modified' in comp:
                    print(f"  Modified PACKAGE: '{comp['Modified'].get('PACKAGE', 'N/A')}'")
                    print(f"  Modified OPT: '{comp['Modified'].get('OPT', 'N/A')}'")
                print()
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_backend_package_field()
