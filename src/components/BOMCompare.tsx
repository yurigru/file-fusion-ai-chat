import React, { useEffect, useState } from "react";
import { ComparisonResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LayoutGrid, Table } from "lucide-react";

// Update interface to accept ComparisonResult directly
interface BOMCompareProps {
  comparisonResult: ComparisonResult | null;
}

const BOMCompare: React.FC<BOMCompareProps> = ({ comparisonResult }) => {
  const [hasData, setHasData] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  useEffect(() => {
    // Check if there is any data to display
    if (comparisonResult) {
      const hasAddedComponents = (comparisonResult.addedComponents && comparisonResult.addedComponents.length > 0);
      const hasDeletedComponents = (comparisonResult.deletedComponents && comparisonResult.deletedComponents.length > 0);
      const hasChangedComponents = (comparisonResult.changedComponents && comparisonResult.changedComponents.length > 0);
      
      setHasData(hasAddedComponents || hasDeletedComponents || hasChangedComponents);
    } else {
      setHasData(false);
    }
  }, [comparisonResult]);// Extract BOM specific comparison data from the general ComparisonResult
  const addedComponents = comparisonResult?.addedComponents || [];
  const deletedComponents = comparisonResult?.deletedComponents || [];
  const changedComponents = comparisonResult?.changedComponents || [];
  const validationWarnings = comparisonResult?.validationWarnings || [];
  const statistics = comparisonResult?.statistics || {};// Always hide manufacturer column for XML tables
  const hasManufacturerData = false;

  // Export functions
  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push(['Change Type', 'Reference', 'Part Name', 'Package', 'OPT', 'Description'].join(','));    addedComponents.forEach(comp => {
      csvRows.push([
        'Added',
        getCompReference(comp),
        getPartNumber(comp),
        getFootprint(comp),
        getOpt(comp),
        getDescription(comp)
      ].map(field => `"${field}"`).join(','));
    });
      deletedComponents.forEach(comp => {
      csvRows.push([
        'Removed',
        getCompReference(comp),
        getPartNumber(comp),
        getFootprint(comp),
        getOpt(comp),
        getDescription(comp)
      ].map(field => `"${field}"`).join(','));
    });changedComponents.forEach(chg => {
      const original = chg.original || {}; // Frontend provides lowercase keys
      const modified = chg.modified || {}; // Frontend provides lowercase keys
      const ref = chg.reference || '';
      csvRows.push([
        'Changed (Old)',        ref, 
        getPartNumber(original),
        getFootprint(original),
        getOpt(original),
        getDescription(original)
      ].map(field => `"${field}"`).join(','));
      csvRows.push([
        'Changed (New)',
        ref,
        getPartNumber(modified),
        getFootprint(modified),
        getOpt(modified),
        getDescription(modified)
      ].map(field => `"${field}"`).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const exportSummaryReport = () => {
    const report = [];
    report.push('BOM Comparison Summary Report');
    report.push(`Generated: ${new Date().toLocaleString()}`);
    report.push('');
    
    if (statistics) {
      report.push('Statistics:');
      report.push(`  Original Components: ${statistics.old_components_count || 0}`);
      report.push(`  New Components: ${statistics.new_components_count || 0}`);
      report.push(`  Added: ${statistics.added_count || 0}`);
      report.push(`  Removed: ${statistics.removed_count || 0}`);
      report.push(`  Changed: ${statistics.changed_count || 0}`);
      report.push(`  Total Changes: ${statistics.total_changes || 0}`);
      report.push('');
    }
    
    if (validationWarnings.length > 0) {
      report.push('Validation Warnings:');
      validationWarnings.forEach(warning => {
        report.push(`  - ${warning}`);
      });
      report.push('');
    }
      if (addedComponents.length > 0) {
      report.push(`Added Components (${addedComponents.length}):`);
      (addedComponents as any[]).forEach(comp => {
        const ref = getCompReference(comp);
        const partNum = getPartNumber(comp);
        const opt = getOpt(comp);
        report.push(`  ${ref}: ${partNum}${opt ? ` (${opt})` : ''}`);
      });
      report.push('');
    }
      if (deletedComponents.length > 0) {
      report.push(`Removed Components (${deletedComponents.length}):`);
      (deletedComponents as any[]).forEach(comp => {
        const ref = getCompReference(comp);
        const partNum = getPartNumber(comp);
        const opt = getOpt(comp);
        report.push(`  ${ref}: ${partNum}${opt ? ` (${opt})` : ''}`);
      });
      report.push('');
    }if (changedComponents.length > 0) {
      report.push(`Changed Components (${changedComponents.length}):`);
      (changedComponents as any[]).forEach(chg => {        const ref = chg.reference || ''; 
        const original = chg.original || {}; // Frontend provides lowercase keys
        const modified = chg.modified || {}; // Frontend provides lowercase keys
        
        const origPartNum = getPartNumber(original);
        const origOpt = getOpt(original);
        const modPartNum = getPartNumber(modified);
        const modOpt = getOpt(modified);
        
        report.push(`  ${ref}:`);
        report.push(`    Old: ${origPartNum}${origOpt ? ` (${origOpt})` : ''}`);
        report.push(`    New: ${modPartNum}${modOpt ? ` (${modOpt})` : ''}`);
      });
    }
    
    const content = report.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom-comparison-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };  const getCompReference = (component: any): string => {
    const val = component?.REFDES || component?.reference || component?.Reference;
    return val ? String(val).trim() : '';
  };
  
  const getPartNumber = (component: any): string => {
    const val = component?.PartNumber || component?.partNumber || component?.['PART-NUM'];
    return val ? String(val).trim() : '';
  };
  
  const getQuantity = (component: any): string => {
    const val = component?.QTY || component?.quantity || component?.value;
    return val ? String(val).trim() : '';
  };
  
  const getFootprint = (component: any): string => {
    const val = component?.PACKAGE || component?.footprint || component?.FOOTPRINT || component?.Package;
    return val ? String(val).trim() : '';
  };
  
  const getDescription = (component: any): string => {
    const val = component?.DESCRIPTION || component?.description || component?.DESC;
    return val ? String(val).trim() : '';
  }
  const getOpt = (component: any): string => {
    const val = component?.OPT || component?.Opt || component?.opt || component?.OPTION;
    return val ? String(val).trim() : '';
  };

  // Only render if there are any BOM comparison results
  if (!hasData) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/20 mt-6">
        <h3 className="text-lg font-medium mb-2">No Component Differences Found</h3>
        <p className="text-muted-foreground">
          The BOM comparison didn't find any added, removed, or changed components between the two files.
        </p>
      </div>    );
  }
  const renderComponentRow = (comp: any, rowKey: string | number) => {
    const partNumber = getPartNumber(comp);
    const footprint = getFootprint(comp);
    const description = getDescription(comp);
    const reference = getCompReference(comp);
    const opt = getOpt(comp);    return (
      <tr key={rowKey} className="hover:bg-muted/30 transition-colors">
        <td className="p-2 border border-border text-foreground">{reference}</td>
        <td className="p-2 border border-border font-mono text-sm text-foreground">{partNumber}</td>
        <td className="p-2 border border-border text-foreground">{footprint}</td>
        <td className="p-2 border border-border text-foreground">{opt}</td>
        <td className="p-2 border border-border text-sm text-foreground">{description}</td>
      </tr>
    );};

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card><CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              BOM Comparison Summary
            </div><div className="flex gap-2">              <Button variant="outline" size="sm" onClick={exportSummaryReport}>
                Export Summary
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{addedComponents.length}</div>
              <div className="text-sm text-gray-500">Added</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{deletedComponents.length}</div>
              <div className="text-sm text-gray-500">Removed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{changedComponents.length}</div>
              <div className="text-sm text-gray-500">Changed</div>
            </div>
          </div>
        </CardContent>
      </Card>      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Validation Warnings:</strong></div>
              <ul className="list-disc list-inside space-y-1">
                {validationWarnings.map((warning, i) => (
                  <li key={i} className="text-sm text-orange-600">{warning}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>      )}

      {addedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Added Components
              <Badge variant="secondary">{addedComponents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-border">
                <thead className="bg-green-50 dark:bg-green-950/30">
                  <tr>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Reference</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Part Name</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Package</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">OPT</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {addedComponents.map((comp, i) => renderComponentRow(comp, getCompReference(comp) || i))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {deletedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Removed Components
              <Badge variant="destructive">{deletedComponents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-border">
                <thead className="bg-red-50 dark:bg-red-950/30">
                  <tr>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Reference</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Part Name</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Package</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">OPT</th>
                    <th className="p-2 border border-border text-left font-medium text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedComponents.map((comp, i) => renderComponentRow(comp, getCompReference(comp) || i))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}      {changedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Changed Components
                <Badge variant="outline">{changedComponents.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="flex items-center gap-1"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="flex items-center gap-1"
                >
                  <Table className="w-4 h-4" />
                  Table
                </Button>
              </div>
            </div>
          </CardHeader>          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">How to Read Component Changes:</h4>
              <div className="space-y-2 text-sm">
                <div className="text-xs text-gray-600">
                  {viewMode === "cards" ? (
                    <>
                      • Each component is shown as a separate card for clarity
                      • Changed fields show: <span className="text-red-600 line-through">old value</span> <span className="text-blue-600 font-bold">→</span> <span className="text-green-600 font-bold">new value</span>
                      • Unchanged fields are shown in gray with "(unchanged)" label
                    </>
                  ) : (
                    <>
                      • Table view shows old and new values side by side
                      • Only changed fields are highlighted
                      • Use cards view for detailed comparison of individual components
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {viewMode === "cards" ? (
              <div className="space-y-4">
                {changedComponents.map((chg: any, i: number) => {
                  // Handle both uppercase (backend) and lowercase (frontend) format
                  const ref = chg.Reference || chg.reference || `Component-${i}`;
                  const original = chg.Original || chg.original || {};
                  const modified = chg.Modified || chg.modified || {};
                    const originalPartNumber = getPartNumber(original);
                  const modifiedPartNumber = getPartNumber(modified);
                  const originalOpt = getOpt(original);
                  const modifiedOpt = getOpt(modified);
                  const originalFootprint = getFootprint(original);
                  const modifiedFootprint = getFootprint(modified);
                  const originalDescription = getDescription(original);
                  const modifiedDescription = getDescription(modified);
                  
                  const renderFieldComparison = (fieldName: string, oldVal: string, newVal: string) => {
                    const hasChange = oldVal !== newVal;
                    const hasData = oldVal || newVal;
                    
                    if (hasChange && hasData) {
                      return (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <span className="font-medium text-gray-700 min-w-[100px]">{fieldName}:</span>
                          <span className="text-red-600 line-through bg-red-50 px-2 py-1 rounded">{oldVal || '(empty)'}</span>
                          <span className="text-blue-600 font-bold">→</span>
                          <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">{newVal || '(empty)'}</span>
                        </div>
                      );
                    } else if (hasData) {
                      return (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="font-medium text-gray-700 min-w-[100px]">{fieldName}:</span>
                          <span className="text-gray-600">{newVal || oldVal || '(no data)'}</span>
                          <span className="text-xs text-gray-400">(unchanged)</span>
                        </div>
                      );
                    }
                    return null;
                  };
                    const hasAnyChange = 
                    originalPartNumber !== modifiedPartNumber ||
                    originalOpt !== modifiedOpt ||
                    originalFootprint !== modifiedFootprint ||
                    originalDescription !== modifiedDescription;
                  
                  return (
                    <Card key={ref} className={`border-l-4 ${hasAnyChange ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-300'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          📍 {ref}
                          {hasAnyChange && <Badge variant="outline" className="bg-blue-100">Changed</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">                        {/* Field comparisons */}
                        {renderFieldComparison("Part Number", originalPartNumber, modifiedPartNumber)}
                        {renderFieldComparison("OPT", originalOpt, modifiedOpt)}
                        {renderFieldComparison("Package", originalFootprint, modifiedFootprint)}
                        {renderFieldComparison("Description", originalDescription, modifiedDescription)}
                        
                        {/* Summary */}
                        <div className="mt-4 p-3 bg-blue-100 rounded">
                          <div className="text-sm font-medium text-blue-900">
                            {hasAnyChange ? '✅ Changes detected and displayed above' : '➡️ No changes in tracked fields'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-border">
                  <thead className="bg-blue-50 dark:bg-blue-950/30">
                    <tr>
                      <th className="p-2 border border-border text-left font-medium text-foreground">Reference</th>
                      <th className="p-2 border border-border text-left font-medium text-foreground">Field</th>
                      <th className="p-2 border border-border text-left font-medium text-foreground">Old Value</th>
                      <th className="p-2 border border-border text-left font-medium text-foreground">New Value</th>
                      <th className="p-2 border border-border text-left font-medium text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedComponents.map((chg: any, i: number) => {
                      // Handle both uppercase (backend) and lowercase (frontend) format
                      const ref = chg.Reference || chg.reference || `Component-${i}`;
                      const original = chg.Original || chg.original || {};
                      const modified = chg.Modified || chg.modified || {};
                        const fields = [
                        { name: 'Part Number', oldVal: getPartNumber(original), newVal: getPartNumber(modified) },
                        { name: 'OPT', oldVal: getOpt(original), newVal: getOpt(modified) },
                        { name: 'Package', oldVal: getFootprint(original), newVal: getFootprint(modified) },
                        { name: 'Description', oldVal: getDescription(original), newVal: getDescription(modified) }
                      ];
                      
                      return fields.map((field, fieldIndex) => {
                        const hasChange = field.oldVal !== field.newVal;
                        const hasData = field.oldVal || field.newVal;
                        
                        if (!hasData) return null;
                          return (
                          <tr key={`${ref}-${fieldIndex}`} className={hasChange ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-muted/20"}>
                            <td className="p-2 border border-border font-medium text-foreground">{fieldIndex === 0 ? ref : ''}</td>
                            <td className="p-2 border border-border text-foreground">{field.name}</td>
                            <td className={`p-2 border border-border ${hasChange ? 'text-red-600 dark:text-red-400 line-through' : 'text-muted-foreground'}`}>
                              {field.oldVal || '(empty)'}
                            </td>
                            <td className={`p-2 border border-border ${hasChange ? 'text-green-600 dark:text-green-400 font-bold' : 'text-muted-foreground'}`}>
                              {field.newVal || '(empty)'}
                            </td>
                            <td className="p-2 border border-border">
                              {hasChange ? (
                                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950/50">Changed</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Unchanged</span>
                              )}
                            </td>
                          </tr>
                        );
                      }).filter(row => row !== null);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BOMCompare;
