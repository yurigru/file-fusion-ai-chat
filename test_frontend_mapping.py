#!/usr/bin/env python3
"""
Test what the BOMCompare component receives after Index.tsx mapping
"""
import requests
import json

def simulate_frontend_mapping():
    print("🔧 Simulating Frontend Index.tsx Mapping")
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
                
                # Simulate the Index.tsx mapping for changed components
                backend_changed = data.get('changedComponents', [])
                
                print(f"📡 Backend returns {len(backend_changed)} changed components")
                
                # This is the mapping that Index.tsx does
                frontend_changed = []
                for chg in backend_changed:
                    if not chg or not chg.get('original') or not chg.get('modified'):
                        print(f"⚠️ Invalid component structure: {chg}")
                        continue
                        
                    mapped_component = {
                        "id": chg.get('reference'),
                        "reference": chg.get('reference'),
                        "original": {
                            "partNumber": chg['original'].get('partNumber') or "",
                            "quantity": int(chg['original'].get('quantity') or "0"),
                            "value": chg['original'].get('quantity') or "",
                            "reference": chg['original'].get('reference') or chg.get('reference'),
                            "footprint": chg['original'].get('footprint') or "",
                            "description": chg['original'].get('description') or "",
                            "manufacturer": chg['original'].get('manufacturer') or "",
                        },
                        "modified": {
                            "partNumber": chg['modified'].get('partNumber') or "",
                            "quantity": int(chg['modified'].get('quantity') or "0"),
                            "value": chg['modified'].get('quantity') or "",
                            "reference": chg['modified'].get('reference') or chg.get('reference'),
                            "footprint": chg['modified'].get('footprint') or "",
                            "description": chg['modified'].get('description') or "",
                            "manufacturer": chg['modified'].get('manufacturer') or "",
                        }
                    }
                    frontend_changed.append(mapped_component)
                
                print(f"🎯 Frontend receives {len(frontend_changed)} mapped components")
                
                # Show what BOMCompare.tsx should receive
                if frontend_changed:
                    comp = frontend_changed[0]
                    print(f"\n📋 First component that BOMCompare receives:")
                    print(f"  reference: '{comp['reference']}'")
                    print(f"  original.partNumber: '{comp['original']['partNumber']}'")
                    print(f"  modified.partNumber: '{comp['modified']['partNumber']}'")
                    print(f"  original.quantity: {comp['original']['quantity']}")
                    print(f"  modified.quantity: {comp['modified']['quantity']}")
                    print(f"  original.footprint: '{comp['original']['footprint']}'")
                    print(f"  modified.footprint: '{comp['modified']['footprint']}'")
                    print(f"  original.description: '{comp['original']['description']}'")
                    print(f"  modified.description: '{comp['modified']['description']}'")
                    
                    # Test the display logic that BOMCompare uses
                    print(f"\n🖥️ Display Logic Test:")
                    print(f"  partNumber display: '- {comp['original']['partNumber']}' → '+ {comp['modified']['partNumber']}'")
                    print(f"  quantity display: '- {comp['original']['quantity']}' → '+ {comp['modified']['quantity']}'")
                    print(f"  footprint display: '- {comp['original']['footprint']}' → '+ {comp['modified']['footprint']}'")
                    print(f"  description display: '- {comp['original']['description']}' → '+ {comp['modified']['description']}'")
                    
                    # Check if any are actually empty
                    empty_fields = []
                    if not comp['original']['partNumber']: empty_fields.append('original.partNumber')
                    if not comp['modified']['partNumber']: empty_fields.append('modified.partNumber')
                    if not comp['original']['description']: empty_fields.append('original.description')
                    if not comp['modified']['description']: empty_fields.append('modified.description')
                    
                    if empty_fields:
                        print(f"⚠️ Empty fields detected: {empty_fields}")
                    else:
                        print(f"✅ All key fields have values")
                        
            else:
                print(f"❌ API call failed: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    simulate_frontend_mapping()
