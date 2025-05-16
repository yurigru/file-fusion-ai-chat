
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ModelSelector from "./ModelSelector";
import { OllamaModel, ChatMessage, ComparisonResult, UploadedFile } from "@/types";

interface AIChatProps {
  selectedFile: UploadedFile | null;
  comparisonResult: ComparisonResult | null;
  comparedFiles: { file1: UploadedFile | null; file2: UploadedFile | null };
}

const AIChat = ({ selectedFile, comparisonResult, comparedFiles }: AIChatProps) => {
  const [model, setModel] = useState<OllamaModel>("llama3");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add a system message when files are selected or compared
    if (selectedFile || (comparedFiles.file1 && comparedFiles.file2)) {
      let systemMessage = "";
      
      if (selectedFile) {
        systemMessage = `Analyzing file: ${selectedFile.name}`;
      } else if (comparedFiles.file1 && comparedFiles.file2) {
        systemMessage = `Comparing files: ${comparedFiles.file1.name} and ${comparedFiles.file2.name}`;
      }
      
      if (systemMessage) {
        setMessages([
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: systemMessage,
            timestamp: Date.now()
          }
        ]);
      }
    }
  }, [selectedFile, comparedFiles.file1, comparedFiles.file2]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleModelChange = (newModel: OllamaModel) => {
    setModel(newModel);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (will be replaced with actual Ollama API call later)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "This is a simulated response. In the future, this will connect to the Ollama API for real AI responses based on your files and comparison data.",
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            AI Assistant
          </CardTitle>
          <Button variant="outline" size="icon" onClick={resetChat}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2">
          <ModelSelector selectedModel={model} onModelChange={handleModelChange} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col p-0 flex-1">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="space-y-2">
                <Bot className="h-10 w-10 text-primary/40 mx-auto" />
                <h3 className="text-lg font-medium">AI Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {selectedFile 
                    ? `Ask questions about the selected file "${selectedFile.name}"` 
                    : comparisonResult 
                      ? "Ask questions about the comparison results"
                      : "Select a file or compare files to start a conversation"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "system"
                        ? "bg-muted text-muted-foreground text-sm"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : message.role === "system" ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.role === "user"
                          ? "You"
                          : message.role === "system"
                          ? "System"
                          : "AI Assistant"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs opacity-50 mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-accent text-accent-foreground max-w-[80%] px-4 py-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t mt-auto">
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your files..."
              className="resize-none min-h-[60px]"
              disabled={isLoading || (!selectedFile && !comparisonResult)}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || (!selectedFile && !comparisonResult)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;
