import requests
import json

# Test with the existing debug files
with open('a_old.xml', 'rb') as f1, open('a_new.xml', 'rb') as f2:
    files = {
        'old_file': ('a_old.xml', f1, 'application/xml'),
        'new_file': ('a_new.xml', f2, 'application/xml')
    }
    try:
        response = requests.post('http://localhost:8080/compare-bom', files=files, timeout=30)
        print(f'Status: {response.status_code}')
        if response.status_code == 200:
            data = response.json()
            print(f'Changed components: {len(data.get("changedComponents", []))}')
            if data.get('changedComponents'):
                print(f'First changed component:')
                print(json.dumps(data["changedComponents"][0], indent=2))
        else:
            print(f'Error: {response.text}')
    except Exception as e:
        print(f'Error: {e}')
