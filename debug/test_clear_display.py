import requests
import json

def test_clear_change_display():
    """Test the new clear change display format"""
    
    print("🧪 Testing Clear Change Display Format")
    print("=" * 50)
    
    # Test with the existing debug files
    with open('a_old.xml', 'rb') as f1, open('a_new.xml', 'rb') as f2:
        files = {
            'old_file': ('a_old.xml', f1, 'application/xml'),
            'new_file': ('a_new.xml', f2, 'application/xml')
        }
        
        try:
            response = requests.post('http://localhost:8080/compare-bom', files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ API Response: {response.status_code}")
                print(f"📊 Changed components: {len(data.get('changedComponents', []))}")
                
                # Simulate the new rendering logic
                changed_components = data.get('changedComponents', [])
                
                if changed_components:
                    print("\n🎨 How changes will be displayed:")
                    print("-" * 80)
                    print(f"{'Reference':<12} {'Part Number':<25} {'Quantity':<10} {'Package':<15}")
                    print("-" * 80)
                    
                    for component in changed_components[:3]:  # Show first 3
                        ref = component.get('reference', '')
                        original = component.get('original', {})
                        modified = component.get('modified', {})
                        
                        # Simulate the renderFieldChange logic
                        def format_change(field_name):
                            old_val = original.get(field_name, '') or ''
                            new_val = modified.get(field_name, '') or ''
                            
                            if old_val != new_val and (old_val or new_val):
                                return f"{old_val} → {new_val}"
                            else:
                                return old_val or new_val or '-'
                        
                        part_display = format_change('partNumber')
                        qty_display = format_change('quantity')
                        pkg_display = format_change('footprint')
                        
                        print(f"{ref:<12} {part_display:<25} {qty_display:<10} {pkg_display:<15}")
                    
                    print("-" * 80)
                    print("\n✨ New Display Features:")
                    print("  • Clear old → new format with arrow")
                    print("  • Strike-through for removed values")
                    print("  • Highlighted background for new values")
                    print("  • Blue left border for changed components")
                    print("  • Unchanged fields show normal values")
                    
                else:
                    print("❌ No changed components found")
                    
            else:
                print(f"❌ API Error: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_clear_change_display()
