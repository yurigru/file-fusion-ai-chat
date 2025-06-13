"""
Test EL files to check PACKAGE field population
"""
import requests
import json

def test_el_files():
    print("=== Testing EL Files for PACKAGE Data ===")
    
    url = 'http://localhost:8000/compare-bom'
    
    files = {
        'old_file': ('el_old.xml', open('test-data/el_old.xml', 'rb'), 'application/xml'),
        'new_file': ('el_new.xml', open('test-data/el_new.xml', 'rb'), 'application/xml')
    }
    
    try:
        response = requests.post(url, files=files)
        if response.status_code == 200:
            data = response.json()
            print('=== EL Test Files Results ===')
            
            # Check for components with PACKAGE data
            all_components = []
            if 'added' in data:
                all_components.extend([('added', comp) for comp in data['added']])
            if 'removed' in data:
                all_components.extend([('removed', comp) for comp in data['removed']])
            if 'changed' in data:
                for comp in data['changed']:
                    if 'Original' in comp:
                        all_components.append(('changed_orig', comp['Original']))
                    if 'Modified' in comp:
                        all_components.append(('changed_mod', comp['Modified']))
            
            # Find components with non-empty PACKAGE
            non_empty_packages = [comp for comp_type, comp in all_components if comp.get('PACKAGE', '').strip()]
            
            print(f'Total components checked: {len(all_components)}')
            print(f'Components with non-empty PACKAGE: {len(non_empty_packages)}')
            
            if non_empty_packages:
                print('\nComponents with PACKAGE data:')
                for comp_type, comp in all_components:
                    if comp.get('PACKAGE', '').strip():
                        print(f'  {comp_type}: {comp.get("REFDES", "N/A")} - PACKAGE: "{comp.get("PACKAGE", "")}"')
            else:
                print('\nNo components found with non-empty PACKAGE fields')
                print('Sample components:')
                for i, (comp_type, comp) in enumerate(all_components[:5]):
                    print(f'  {comp_type}: {comp.get("REFDES", "N/A")} - PACKAGE: "{comp.get("PACKAGE", "")}"')
        
        else:
            print(f'Error: {response.status_code}')
            print(response.text)
            
    finally:
        files['old_file'][1].close()
        files['new_file'][1].close()

if __name__ == "__main__":
    test_el_files()
