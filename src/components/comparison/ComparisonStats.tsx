
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ComparisonStatsProps {
  addedCount: number;
  deletedCount: number;
  changedCount: number;
  onRefresh: () => void;
}

const ComparisonStats: React.FC<ComparisonStatsProps> = ({ 
  addedCount, 
  deletedCount, 
  changedCount, 
  onRefresh 
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-added"></div>
          <span className="text-sm text-muted-foreground">
            {addedCount} Added
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-deleted"></div>
          <span className="text-sm text-muted-foreground">
            {deletedCount} Deleted
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-changed"></div>
          <span className="text-sm text-muted-foreground">
            {changedCount} Changed
          </span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh} 
        className="text-xs"
      >
        <RefreshCw className="mr-1 h-3 w-3" /> Refresh
      </Button>
    </div>
  );
};

export default ComparisonStats;
