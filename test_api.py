#!/usr/bin/env python3
"""
Simple test to verify API response structure
"""

import requests

def test_api():
    print("🧪 Testing BOM Comparison API")
    print("=" * 40)
    
    # Test with our known files
    files = {
        'old_file': ('a_old.xml', open('debug/a_old.xml', 'rb')),
        'new_file': ('a_new.xml', open('debug/a_new.xml', 'rb'))
    }
    
    try:
        response = requests.post('http://localhost:8000/compare-bom', files=files)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Response received")
            print(f"  Changed components: {len(data.get('changed', []))}")
            
            if data.get('changed'):
                first = data['changed'][0]
                print(f"  First changed component:")
                print(f"    Reference: {first.get('reference')}")
                print(f"    Original partNumber: {first.get('original', {}).get('partNumber')}")
                print(f"    Modified partNumber: {first.get('modified', {}).get('partNumber')}")
                print(f"    Original quantity: {first.get('original', {}).get('quantity')}")
                print(f"    Modified quantity: {first.get('modified', {}).get('quantity')}")
                
                # Check manufacturer data
                print(f"    Original manufacturer: '{first.get('original', {}).get('manufacturer')}'")
                print(f"    Modified manufacturer: '{first.get('modified', {}).get('manufacturer')}'")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        # Close files
        for file_obj in files.values():
            file_obj[1].close()

if __name__ == "__main__":
    test_api()
