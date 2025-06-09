#!/usr/bin/env python3
"""
Direct test of the backend API response structure
"""
import requests
import json

def test_api_response():
    print("🧪 Testing Backend API Response Structure")
    print("=" * 50)
    
    try:
        with open('debug/a_old.xml', 'rb') as f1, open('debug/a_new.xml', 'rb') as f2:
            files = {
                'old_file': ('a_old.xml', f1, 'application/xml'),
                'new_file': ('a_new.xml', f2, 'application/xml')
            }
            
            response = requests.post('http://127.0.0.1:8000/compare-bom', files=files)
            
            if response.status_code == 200:
                data = response.json()
                
                print("✅ Backend API Response:")
                print(f"Root fields: {list(data.keys())}")
                
                # Check each expected field
                added = data.get('addedComponents', [])
                deleted = data.get('deletedComponents', [])
                changed = data.get('changedComponents', [])
                
                print(f"\n📊 Component Counts:")
                print(f"  addedComponents: {len(added)}")
                print(f"  deletedComponents: {len(deleted)}")
                print(f"  changedComponents: {len(changed)}")
                
                # Show structure of first components
                if added:
                    print(f"\n📋 First added component:")
                    print(f"  Fields: {list(added[0].keys())}")
                    print(f"  Reference: {added[0].get('reference')}")
                    print(f"  PartNumber: {added[0].get('partNumber')}")
                
                if changed:
                    print(f"\n📋 First changed component:")
                    print(f"  Fields: {list(changed[0].keys())}")
                    print(f"  Reference: {changed[0].get('reference')}")
                    if 'original' in changed[0]:
                        print(f"  Original fields: {list(changed[0]['original'].keys())}")
                        print(f"  Original partNumber: {changed[0]['original'].get('partNumber')}")
                    if 'modified' in changed[0]:
                        print(f"  Modified fields: {list(changed[0]['modified'].keys())}")
                        print(f"  Modified partNumber: {changed[0]['modified'].get('partNumber')}")
                
                # Simulate frontend hasData check
                hasData = len(added) > 0 or len(deleted) > 0 or len(changed) > 0
                print(f"\n🎯 hasData check: {hasData}")
                
                if hasData:
                    print("✅ Frontend should display component tables!")
                else:
                    print("❌ Frontend will show 'No Differences Found'")
                    
            else:
                print(f"❌ API call failed: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_api_response()
