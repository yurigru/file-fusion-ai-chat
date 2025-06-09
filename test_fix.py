import requests
import json

# Test the BOM comparison with the debug files
with open('debug/a_old.xml', 'rb') as f1, open('debug/a_new.xml', 'rb') as f2:
    files = {
        'old_file': ('a_old.xml', f1, 'application/xml'),
        'new_file': ('a_new.xml', f2, 'application/xml')
    }
    
    response = requests.post('http://127.0.0.1:8000/compare-bom', files=files)
    
    if response.status_code == 200:
        result = response.json()
        print('BOM Comparison Result:')
        print(f'Added: {len(result.get("addedComponents", []))}')
        print(f'Removed: {len(result.get("deletedComponents", []))}')
        print(f'Changed: {len(result.get("changedComponents", []))}')
        
        # Check the structure of a changed component
        if result.get('changedComponents'):
            print('\nFirst changed component structure:')
            first_changed = result['changedComponents'][0]
            print(json.dumps(first_changed, indent=2))
            
            # Check if the fields are properly mapped
            original = first_changed.get('original', {})
            modified = first_changed.get('modified', {})
            print(f'\nField mapping check:')
            print(f'Reference: {first_changed.get("reference")}')
            print(f'Original partNumber: {original.get("partNumber")}')
            print(f'Modified partNumber: {modified.get("partNumber")}')
            print(f'Original quantity: {original.get("quantity")}')
            print(f'Modified quantity: {modified.get("quantity")}')
    else:
        print(f'Error: {response.status_code} - {response.text}')
