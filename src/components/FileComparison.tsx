
import { useState, useEffect } from "react";
import { ComparisonFiles } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight } from "lucide-react";
import FileHeader from "@/components/comparison/FileHeader";
import ComparisonStats from "@/components/comparison/ComparisonStats";
import TableTabContent from "@/components/comparison/TableTabContent";
import FileContent from "@/components/comparison/FileContent";
import { 
  formatAddedComponentsData, 
  formatDeletedComponentsData, 
  formatChangedComponentsData,
  updateVisibleLines
} from "@/utils/comparison-format";
import { Column } from "@/components/FileTable";

interface FileComparisonProps {
  comparisonFiles: ComparisonFiles;
  onCompare: () => void;
}

const FileComparison = ({ comparisonFiles, onCompare }: FileComparisonProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [addedTableData, setAddedTableData] = useState<Array<{ [key: string]: string }>>([]);
  const [deletedTableData, setDeletedTableData] = useState<Array<{ [key: string]: string }>>([]);
  const [changedTableData, setChangedTableData] = useState<Array<{ [key: string]: string }>>([]);
  
  const { file1, file2, result } = comparisonFiles;

  // Component columns definitions
  const componentColumns: Column[] = [
    { header: "Reference", accessor: "reference" },
    { header: "Value", accessor: "value" },
    { header: "Manufacturer", accessor: "manufacturer" },
    { header: "Part Number", accessor: "partNumber" }
  ];

  // Changed component columns
  const changedComponentColumns: Column[] = [
    { header: "Reference", accessor: "reference" },
    { header: "Original Value", accessor: "originalValue" },
    { header: "New Value", accessor: "newValue" },
    { header: "Original Manufacturer", accessor: "originalManufacturer" },
    { header: "New Manufacturer", accessor: "newManufacturer" },
    { header: "Original Part Number", accessor: "originalPartNumber" },
    { header: "New Part Number", accessor: "newPartNumber" }
  ];

  useEffect(() => {
    if (result) {
      refreshVisibleLines();
    }
  }, [result, activeTab]);

  useEffect(() => {
    if (result && file1 && file2) {
      // If both files are .xml and backend result is present, parse backend data for tables
      const isXML = file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml');
      if (isXML) {
        formatTableData(result);
      } else {
        resetTableData();
      }
    }
  }, [result, file1, file2]);

  const resetTableData = () => {
    setAddedTableData([]);
    setDeletedTableData([]);
    setChangedTableData([]);
  };

  const formatTableData = (result: ComparisonResult) => {
    // Format added components for FileTable
    setAddedTableData(formatAddedComponentsData(result.addedComponents));
    
    // Format deleted components for FileTable
    setDeletedTableData(formatDeletedComponentsData(result.deletedComponents));
    
    // Format changed components for FileTable
    setChangedTableData(formatChangedComponentsData(result.changedComponents));
  };

  const refreshVisibleLines = () => {
    if (!result || !file1 || !file2) return;
    
    // If result is empty and both files are .xml, show the full XML content
    const isXML = file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml');
    const noChanges = result.added.length === 0 && result.deleted.length === 0 && result.changed.length === 0;
    
    if (isXML && noChanges) {
      setVisibleLines(file2.content.split('\n'));
    } else {
      const lines = updateVisibleLines(activeTab, result, file1.content, file2.content);
      setVisibleLines(lines);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">File Comparison</h3>
        <Button
          onClick={onCompare}
          disabled={!file1 || !file2}
          className="flex items-center space-x-2"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Compare Files
        </Button>
      </div>

      <FileHeader file1={file1} file2={file2} />

      {result && (
        <div className="space-y-4">
          <ComparisonStats 
            addedCount={addedTableData.length || result.added.length}
            deletedCount={deletedTableData.length || result.deleted.length}
            changedCount={changedTableData.length || result.changed.length}
            onRefresh={refreshVisibleLines}
          />

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">All Changes</TabsTrigger>
              <TabsTrigger value="added">Added</TabsTrigger>
              <TabsTrigger value="deleted">Deleted</TabsTrigger>
              <TabsTrigger value="changed">Changed</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {addedTableData.length > 0 && (
                <>
                  <div className="font-bold mb-1">Added Components</div>
                  <TableTabContent 
                    columns={componentColumns}
                    data={addedTableData} 
                    emptyMessage="No added components"
                  />
                </>
              )}
              {deletedTableData.length > 0 && (
                <>
                  <div className="font-bold mt-4 mb-1">Deleted Components</div>
                  <TableTabContent 
                    columns={componentColumns}
                    data={deletedTableData} 
                    emptyMessage="No deleted components"
                  />
                </>
              )}
              {changedTableData.length > 0 && (
                <>
                  <div className="font-bold mt-4 mb-1">Changed Components</div>
                  <TableTabContent 
                    columns={changedComponentColumns}
                    data={changedTableData} 
                    emptyMessage="No changed components"
                  />
                </>
              )}
              {addedTableData.length === 0 && deletedTableData.length === 0 && changedTableData.length === 0 && (
                <FileContent visibleLines={visibleLines} />
              )}
            </TabsContent>
            <TabsContent value="added" className="mt-4">
              {addedTableData.length > 0 ? (
                <TableTabContent 
                  columns={componentColumns}
                  data={addedTableData} 
                  emptyMessage="No added components"
                />
              ) : (
                <FileContent visibleLines={visibleLines} />
              )}
            </TabsContent>
            <TabsContent value="deleted" className="mt-4">
              {deletedTableData.length > 0 ? (
                <TableTabContent 
                  columns={componentColumns}
                  data={deletedTableData} 
                  emptyMessage="No deleted components"
                />
              ) : (
                <FileContent visibleLines={visibleLines} />
              )}
            </TabsContent>
            <TabsContent value="changed" className="mt-4">
              {changedTableData.length > 0 ? (
                <TableTabContent 
                  columns={changedComponentColumns}
                  data={changedTableData} 
                  emptyMessage="No changed components"
                />
              ) : (
                <FileContent visibleLines={visibleLines} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default FileComparison;
