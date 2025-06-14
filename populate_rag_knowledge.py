#!/usr/bin/env python3
"""
Quick test to populate the RAG knowledge base with a sample BOM file
and demonstrate RAG-enhanced chat functionality.
"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:8000"
OLLAMA_URL = "http://localhost:11434"

def upload_test_bom():
    """Upload the test BOM file to populate the knowledge base."""
    
    print("🔄 Uploading test BOM to knowledge base...")
    
    # Read the test BOM file
    try:
        with open('test_new_simple.xml', 'r', encoding='utf-8') as f:
            bom_content = f.read()
        
        # Upload to knowledge base
        files = {'file': ('test_new_simple.xml', bom_content, 'application/xml')}
        data = {'source_name': 'test_new_simple.xml'}
        response = requests.post(f"{BACKEND_URL}/api/rag/add-bom", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   File: {result['source']}")
            print(f"   Components added: {result['component_count']}")
            print(f"   Status: {result['status']}")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_knowledge_stats():
    """Check the updated knowledge base statistics."""
    
    print("\n📊 Checking knowledge base stats...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/rag/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Knowledge Base Status:")
            print(f"   Total items: {stats['total']}")
            print(f"   Components: {stats['components']}")
            print(f"   Patterns: {stats['patterns']}")
            print(f"   Status: {stats['status']}")
            return stats
        else:
            print(f"❌ Failed to get stats: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_rag_query():
    """Test querying the knowledge base."""
    
    print("\n🔍 Testing knowledge base query...")
    
    try:
        query_data = {
            "query": "resistor 200 ohm",
            "n_results": 5
        }
        response = requests.post(f"{BACKEND_URL}/api/rag/query", json=query_data)
        
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Query successful! Found {len(results.get('results', []))} relevant items:")
            
            for i, result in enumerate(results.get('results', []), 1):
                metadata = result['metadata']
                similarity = result['similarity']
                print(f"   {i}. {metadata['component_ref']}: {metadata['description']}")
                print(f"      Part: {metadata['part_number']} | Package: {metadata['package']}")
                print(f"      Similarity: {similarity:.3f}")
                print()
            
            return results
        else:
            print(f"❌ Query failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_rag_chat():
    """Test RAG-enhanced chat."""
    
    print("💬 Testing RAG-enhanced chat...")
    
    try:
        chat_data = {
            "model": "llama3.2",
            "messages": [
                {"role": "user", "content": "What components are in the uploaded BOM? Tell me about the resistor specifications."}
            ],
            "ollama_url": OLLAMA_URL
        }
        response = requests.post(f"{BACKEND_URL}/api/chat/rag-completions", json=chat_data)
        
        if response.status_code == 200:
            chat_result = response.json()
            print(f"✅ RAG Chat successful!")
            
            # Get the response content
            response_content = ""
            if 'response' in chat_result:
                if isinstance(chat_result['response'], dict):
                    response_content = chat_result['response'].get('content', 'No content')
                else:
                    response_content = str(chat_result['response'])
            
            print(f"\n🤖 AI Response:")
            print(f"   {response_content[:200]}...")
            
            # Show RAG results used
            rag_results = chat_result.get('rag_results', [])
            print(f"\n🧠 Knowledge used: {len(rag_results)} items")
            for result in rag_results[:3]:  # Show first 3
                metadata = result['metadata']
                print(f"   - {metadata['component_ref']}: {metadata['description']}")
            
            return True
        else:
            print(f"❌ Chat failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Populating RAG Knowledge Base")
    print("=" * 50)
    
    # Upload test BOM
    if upload_test_bom():
        # Check updated stats
        stats = check_knowledge_stats()
        
        if stats and stats['total'] > 0:
            # Test knowledge query
            test_rag_query()
            
            # Test RAG chat
            test_rag_chat()
            
            print("\n🎉 RAG Knowledge Base is now populated and ready!")
            print("\n💡 Now you can:")
            print("   1. Go to http://localhost:8080")
            print("   2. Ask questions about components in the AI Chat")
            print("   3. See RAG-enhanced responses with retrieved knowledge")
            print("   4. Upload more BOM files to expand the knowledge base")
        else:
            print("❌ Knowledge base is still empty")
    else:
        print("❌ Failed to populate knowledge base")
