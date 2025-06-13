#!/usr/bin/env python3
"""
Test script to verify RAG integration is working properly.
Tests uploading a BOM, querying knowledge, and RAG-enhanced chat.
"""

import requests
import json
import os

# Configuration
BACKEND_URL = "http://localhost:8000"
OLLAMA_URL = "http://localhost:11434"

def test_rag_endpoints():
    """Test all RAG endpoints to ensure they're working."""
    
    print("🧪 Testing RAG Integration...")
    print("=" * 50)
    
    # Test 1: Check RAG stats (should work even with empty database)
    print("1️⃣ Testing RAG stats endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/rag/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ RAG stats: {stats}")
        else:
            print(f"❌ RAG stats failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ RAG stats error: {e}")
        return False
    
    # Test 2: Upload a test BOM file
    print("\n2️⃣ Testing BOM upload to knowledge base...")
    test_bom_content = """<?xml version="1.0" encoding="UTF-8"?>
<export version="D">
  <design>
    <components>
      <comp ref="R1">
        <value>10K</value>
        <footprint>Package_TO_SOT_SMD:SOT-23</footprint>
        <fields>
          <field name="Part">RC0603FR-0710KL</field>
          <field name="Description">RES SMD 10K OHM 1% 1/10W 0603</field>
          <field name="Package">0603</field>
        </fields>
      </comp>
      <comp ref="C1">
        <value>100nF</value>
        <footprint>Capacitor_SMD:C_0603_1608Metric</footprint>
        <fields>
          <field name="Part">CL10B104KB8NNNC</field>
          <field name="Description">CAP CER 0.1UF 50V X7R 0603</field>
          <field name="Package">0603</field>
        </fields>
      </comp>
    </components>
  </design>
</export>"""
    
    try:
        files = {'file': ('test_bom.xml', test_bom_content, 'application/xml')}
        data = {'source_name': 'test_bom.xml'}
        response = requests.post(f"{BACKEND_URL}/api/rag/add-bom", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ BOM uploaded: {result}")
        else:
            print(f"❌ BOM upload failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ BOM upload error: {e}")
        return False
    
    # Test 3: Query knowledge base
    print("\n3️⃣ Testing knowledge query...")
    try:
        query_data = {
            "query": "resistor 10K",
            "n_results": 3
        }
        response = requests.post(f"{BACKEND_URL}/api/rag/query", json=query_data)
        
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Knowledge query results: {len(results.get('results', []))} items found")
            for result in results.get('results', []):
                print(f"   - {result['metadata']['component_ref']}: {result['metadata']['description']}")
        else:
            print(f"❌ Knowledge query failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Knowledge query error: {e}")
        return False
    
    # Test 4: RAG-enhanced chat
    print("\n4️⃣ Testing RAG-enhanced chat...")
    try:
        chat_data = {
            "model": "llama3.2",
            "messages": [
                {"role": "user", "content": "What resistors are in the uploaded BOM? Tell me about their specifications."}
            ],
            "ollama_url": OLLAMA_URL
        }
        response = requests.post(f"{BACKEND_URL}/api/chat/rag-completions", json=chat_data)
        
        if response.status_code == 200:
            chat_result = response.json()
            print(f"✅ RAG chat successful!")
            print(f"   Response: {chat_result.get('response', {}).get('content', 'No content')[:100]}...")
            print(f"   RAG results used: {len(chat_result.get('rag_results', []))}")
        else:
            print(f"❌ RAG chat failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ RAG chat error: {e}")
        return False
    
    print("\n🎉 All RAG tests passed!")
    return True

def check_ollama_connection():
    """Check if Ollama is running and has the required models."""
    print("🔍 Checking Ollama connection...")
    
    try:
        # Check if Ollama is running
        response = requests.get(f"{OLLAMA_URL}/api/tags")
        if response.status_code == 200:
            models = response.json()
            print(f"✅ Ollama is running with {len(models.get('models', []))} models")
            
            # Check for required models
            model_names = [model['name'] for model in models.get('models', [])]
            required_models = ['nomic-embed-text:latest', 'llama3.2:latest']
            
            for model in required_models:
                if any(model in name for name in model_names):
                    print(f"✅ Found model: {model}")
                else:
                    print(f"⚠️  Model not found: {model}")
            
            return True
        else:
            print(f"❌ Ollama not responding: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ollama connection error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 RAG Integration Test Suite")
    print("=" * 50)
    
    # Check Ollama first
    if not check_ollama_connection():
        print("\n❌ Please make sure Ollama is running and the required models are installed:")
        print("   ollama pull llama3.2")
        print("   ollama pull nomic-embed-text")
        exit(1)
    
    print("\n" + "=" * 50)
    
    # Test RAG endpoints
    if test_rag_endpoints():
        print("\n🎉 RAG integration is working correctly!")
        print("\nYou can now:")
        print("1. Upload BOM files to the knowledge base")
        print("2. Ask questions about components")
        print("3. Get RAG-enhanced AI responses")
    else:
        print("\n❌ RAG integration has issues. Check the backend logs.")
        exit(1)
