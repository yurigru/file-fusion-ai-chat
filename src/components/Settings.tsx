import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ragService, RAGStats, RAGStatus } from "@/services/ragService";
import { toast } from "@/components/ui/sonner";
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Settings as SettingsIcon 
} from "lucide-react";

const Settings = () => {
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isClearingKB, setIsClearingKB] = useState(false);

  useEffect(() => {
    // Load RAG stats and status on component mount
    loadRagStats();
    loadRagStatus();
  }, []);
  const loadRagStats = async () => {
    try {
      const stats = await ragService.getKnowledgeStats();
      setRagStats(stats);
    } catch (error) {
      console.error("Failed to load RAG stats:", error);
    }
  };

  const loadRagStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const status = await ragService.getRAGStatus();
      setRagStatus(status);
    } catch (error) {
      console.error("Failed to load RAG status:", error);
      toast.error("Failed to load RAG status");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const clearKnowledgeBase = async () => {
    if (!confirm("Are you sure you want to clear ALL data from the knowledge base? This action cannot be undone.")) {
      return;
    }

    setIsClearingKB(true);
    try {
      const result = await ragService.clearKnowledgeBase();
      toast.success(`${result.message}`);
      await loadRagStats(); // Refresh stats
      await loadRagStatus(); // Refresh status
    } catch (error) {
      console.error("Failed to clear knowledge base:", error);
      toast.error(`Failed to clear knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearingKB(false);
    }
  };

  const refreshRAGStatus = async () => {
    await loadRagStatus();
    await loadRagStats();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* RAG System Status Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Knowledge Base (RAG) System
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshRAGStatus}
                disabled={isRefreshingStatus}
              >
                {isRefreshingStatus ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Status
              </Button>
            </div>

            {/* RAG Stats Summary */}
            {ragStats && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{ragStats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{ragStats.components}</div>
                  <div className="text-sm text-muted-foreground">Components</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{ragStats.patterns || 0}</div>
                  <div className="text-sm text-muted-foreground">Patterns</div>
                </div>
              </div>
            )}

            {/* Detailed RAG Status */}
            {ragStatus && (
              <div className="p-4 border rounded-lg bg-card">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">System Status</h4>
                    <Badge 
                      variant={ragStatus.status === 'operational' ? 'default' : 
                               ragStatus.status === 'degraded' ? 'secondary' : 'destructive'}
                    >
                      {ragStatus.status || ragStatus.overall_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Database Status */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        {ragStatus.database.accessible ? (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2 text-red-500" />
                        )}
                        <span className="font-medium">Database</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Status: {ragStatus.database.accessible ? 'Connected' : 'Disconnected'}</div>
                        <div>Type: {ragStatus.database.type || 'memory'}</div>
                        <div>Components: {ragStatus.database.components || ragStatus.collections?.bom_components?.count || 0}</div>
                        <div>Patterns: {ragStatus.database.patterns || ragStatus.collections?.design_patterns?.count || 0}</div>
                        <div>Total Items: {ragStatus.database.total_items || 0}</div>
                      </div>
                    </div>

                    {/* Embedding Service Status */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        {ragStatus.embedding_service.accessible ? (
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2 text-red-500" />
                        )}
                        <span className="font-medium">Embedding Service</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Status: {ragStatus.embedding_service.accessible ? 'Connected' : 'Disconnected'}</div>
                        <div>Model: {ragStatus.embedding_service.model}</div>
                        <div>URL: {ragStatus.embedding_service.url}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-medium">Knowledge Base Actions</h4>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={clearKnowledgeBase}
                  disabled={isClearingKB}
                >
                  {isClearingKB ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear Knowledge Base
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload BOM files from the AI Assistant tab to populate the knowledge base.
              </p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
