import requests
import time

def upload_remaining_files():
    print("=== Uploading Remaining BOM Files ===")
    
    files_to_upload = [
        ('test-data/a_old.xml', 'a_old_bom'),
        ('test-data/a_new.xml', 'a_new_bom')
    ]
    
    for file_path, source_name in files_to_upload:
        print(f"\nUploading {file_path}...")
        start_time = time.time()
        
        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (file_path.split('/')[-1], f, 'application/xml')
                }
                data = {
                    'source_name': source_name
                }
                response = requests.post('http://localhost:8000/api/rag/add-bom', files=files, data=data, timeout=180)
                elapsed = time.time() - start_time
                
                print(f"  Completed in {elapsed:.2f} seconds")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"  Added {result.get('component_count', 0)} components")
                else:
                    print(f"  Error: {response.text}")
                    
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"  Error after {elapsed:.2f} seconds: {e}")
    
    # Final stats
    print("\n=== Final RAG Statistics ===")
    response = requests.get('http://localhost:8000/api/rag/stats')
    final_stats = response.json()
    print(f"Total components: {final_stats['components_count']}")
    print(f"Total documents: {final_stats['total_documents']}")
    print(f"Memory usage: {final_stats.get('memory_usage_mb', 0):.1f} MB")

if __name__ == "__main__":
    upload_remaining_files()
