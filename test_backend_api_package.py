"""
Test the backend API to check PACKAGE field data
"""
import requests
import json

def test_backend_api():
    print("=== Testing Backend API PACKAGE Field ===")
    
    url = "http://localhost:8000/compare-bom"
    
    # Prepare files
    files = {
        'old_file': ('a_old.xml', open('test-data/a_old.xml', 'rb'), 'application/xml'),
        'new_file': ('a_new.xml', open('test-data/a_new.xml', 'rb'), 'application/xml')
    }
    
    try:
        response = requests.post(url, files=files)
        
        if response.status_code == 200:
            data = response.json()
            
            print("Response keys:", list(data.keys()))
            
            # Check added components for PACKAGE data
            if 'added' in data and data['added']:
                print(f"\nAdded components count: {len(data['added'])}")
                for i, comp in enumerate(data['added'][:3]):
                    print(f"Added component {i+1}:")
                    print(f"  REFDES: {comp.get('REFDES', 'N/A')}")
                    print(f"  PACKAGE: '{comp.get('PACKAGE', 'N/A')}'")
                    print(f"  OPT: '{comp.get('OPT', 'N/A')}'")
                    print(f"  All keys: {list(comp.keys())}")
                    print()
            
            # Check changed components for PACKAGE data
            if 'changed' in data and data['changed']:
                print(f"Changed components count: {len(data['changed'])}")
                for i, comp in enumerate(data['changed'][:3]):
                    print(f"Changed component {i+1}:")
                    print(f"  Reference: {comp.get('Reference', 'N/A')}")
                    if 'Original' in comp:
                        print(f"  Original PACKAGE: '{comp['Original'].get('PACKAGE', 'N/A')}'")
                        print(f"  Original OPT: '{comp['Original'].get('OPT', 'N/A')}'")
                    if 'Modified' in comp:
                        print(f"  Modified PACKAGE: '{comp['Modified'].get('PACKAGE', 'N/A')}'")
                        print(f"  Modified OPT: '{comp['Modified'].get('OPT', 'N/A')}'")
                    print()
            
            # Save full response for inspection
            with open('backend_response.json', 'w') as f:
                json.dump(data, f, indent=2)
            print("Full response saved to backend_response.json")
            
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Close files
        files['old_file'][1].close()
        files['new_file'][1].close()

if __name__ == "__main__":
    test_backend_api()
