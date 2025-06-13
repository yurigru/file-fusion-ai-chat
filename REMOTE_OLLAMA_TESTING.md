# Testing Remote Ollama Connection

This guide explains how to test the AI assistant with a remote Ollama server.

## Setup

### 1. Frontend (Current Computer)
- Frontend running on: http://localhost:8081
- Backend running on: http://localhost:8000

### 2. Remote Ollama Server
If your Ollama is running on another computer, make sure it's accessible:

```bash
# On the remote computer, check if Ollama is running and accessible
curl http://localhost:11434/api/tags

# To make Ollama accessible from other machines, you might need to:
# Option 1: Start Ollama with host binding
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# Option 2: Or if already running, check if it's bound to all interfaces
netstat -tuln | grep 11434
```

## Testing Steps

### 1. Test Local Connection First
1. Open http://localhost:8081
2. Go to AI Assistant section
3. Click the Settings icon
4. In Ollama tab, make sure URL is: `http://localhost:11434`
5. Click "Connect" - should show green "Connected" status

### 2. Test Remote Connection
1. In the Ollama Server URL field, enter your remote server:
   - `http://192.168.1.100:11434` (replace with actual IP)
   - `http://your-server-hostname:11434`
2. Click "Connect"
3. Should show available models from remote server

### 3. Send Test Message
1. Select a model from the dropdown
2. Type a message like: "Hello, can you help me analyze BOM files?"
3. Click Send
4. Should receive response from the remote Ollama server

## Troubleshooting

### Connection Issues
- **Timeout errors**: Remote server might be too slow or unreachable
- **CORS errors**: Make sure Ollama server allows cross-origin requests
- **Network errors**: Check firewall/network connectivity

### Testing Connectivity
You can test the connection using curl:
```bash
# Test from your current computer to remote Ollama
curl http://[REMOTE_IP]:11434/api/tags

# If this works, the app should work too
```

### Backend API Testing
You can also test the backend endpoints directly:
```bash
# Test Ollama status through backend
curl "http://localhost:8000/api/ollama/status?ollama_url=http://192.168.1.100:11434"

# Test connection details
curl "http://localhost:8000/api/ollama/test-connection?ollama_url=http://192.168.1.100:11434"

# Get models
curl "http://localhost:8000/api/ollama/models?ollama_url=http://192.168.1.100:11434"
```

## Features Implemented

✅ **Remote Ollama Support**
- Configure custom Ollama server URLs
- Connection status indicators
- Timeout handling for remote connections
- Model fetching from remote servers

✅ **Enhanced UI**
- URL validation with visual feedback
- Connection examples and help text
- Loading states and error messages
- Real-time connection testing

✅ **Backend Integration**
- Proxy API for Ollama requests
- Timeout handling for remote connections
- Detailed error reporting
- Connection testing endpoints

## Next Steps

The AI assistant is now ready to connect to remote Ollama servers. You can:
1. Configure the URL to point to your remote Ollama installation
2. Select models from the remote server
3. Have conversations powered by the remote AI models
4. Analyze BOM files with AI assistance
