import requests
import json

def test_with_specific_files():
    # Let's test with files that we know have differences
    # First, let's check if the API is working at all
    try:
        response = requests.get('http://127.0.0.1:8000/')
        print(f"API Health Check: {response.status_code}")
    except Exception as e:
        print(f"Cannot connect to backend: {e}")
        return

    # Test the BOM comparison
    try:
        with open('debug/a_old.xml', 'rb') as f1, open('debug/a_new.xml', 'rb') as f2:
            files = {
                'old_file': ('a_old.xml', f1, 'application/xml'),
                'new_file': ('a_new.xml', f2, 'application/xml')
            }
            
            print("Sending BOM comparison request...")
            response = requests.post('http://127.0.0.1:8000/compare-bom', files=files)
            
            if response.status_code == 200:
                result = response.json()
                print('BOM Comparison Result:')
                print(f'Added: {len(result.get("addedComponents", []))}')
                print(f'Removed: {len(result.get("deletedComponents", []))}')
                print(f'Changed: {len(result.get("changedComponents", []))}')
                
                # Check if there are any validation warnings
                warnings = result.get('validationWarnings', [])
                if warnings:
                    print('\nValidation Warnings:')
                    for warning in warnings:
                        print(f'  - {warning}')
                
                # Check statistics
                stats = result.get('statistics', {})
                if stats:
                    print('\nStatistics:')
                    for key, value in stats.items():
                        print(f'  {key}: {value}')
                
                # Show added components if any
                if result.get('addedComponents'):
                    print('\nFirst few added components:')
                    for i, comp in enumerate(result['addedComponents'][:3]):
                        print(f'  {i+1}: {json.dumps(comp, indent=4)}')
                
                # Show a sample changed component structure if any
                if result.get('changedComponents'):
                    print('\nFirst changed component structure:')
                    first_changed = result['changedComponents'][0]
                    print(json.dumps(first_changed, indent=2))
                    
                    # Check if the fields are properly mapped
                    original = first_changed.get('original', {})
                    modified = first_changed.get('modified', {})
                    print(f'\nField mapping check:')
                    print(f'Reference: "{first_changed.get("reference")}"')
                    print(f'Original partNumber: "{original.get("partNumber")}"')
                    print(f'Modified partNumber: "{modified.get("partNumber")}"')
                    print(f'Original quantity: "{original.get("quantity")}"')
                    print(f'Modified quantity: "{modified.get("quantity")}"')
                
            else:
                print(f'Error: {response.status_code} - {response.text}')
                
    except Exception as e:
        print(f"Error during request: {e}")

if __name__ == "__main__":
    test_with_specific_files()
