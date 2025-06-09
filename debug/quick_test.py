import requests
import json

def quick_test():
    """Quick test to verify backend and check browser console"""
    
    print("🧪 Quick Backend Test")
    print("=" * 30)
      # Test with the debug files
    with open('debug/a_old.xml', 'rb') as f1, open('debug/a_new.xml', 'rb') as f2:
        files = {
            'old_file': ('a_old.xml', f1, 'application/xml'),
            'new_file': ('a_new.xml', f2, 'application/xml')
        }
        
        try:
            response = requests.post('http://localhost:8080/compare-bom', files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Backend working: {len(data.get('changedComponents', []))} changed components")
                
                if data.get('changedComponents'):
                    first = data['changedComponents'][0]
                    print(f"📋 First changed component: {first.get('reference')}")
                    print(f"   Original part: {first.get('original', {}).get('partNumber')}")
                    print(f"   Modified part: {first.get('modified', {}).get('partNumber')}")
                    
                print("\n🔧 Next steps:")
                print("1. Open http://localhost:8082 in browser")
                print("2. Open Browser DevTools (F12)")
                print("3. Go to Console tab")
                print("4. Upload the XML files and compare")
                print("5. Look for '🎨 NEW RENDER:' messages in console")
                print("6. Check if table shows yellow background with pink headers")
                
            else:
                print(f"❌ Backend error: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    quick_test()
