import React, { useEffect, useState } from "react";
import { ComparisonResult, ElectronicComponent } from "@/types"; // Import necessary types
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BOMComponent {
  Reference: string;
  Value: string;
  Manufacturer: string;
  PartNumber: string;
}

// Update interface to accept ComparisonResult directly
interface BOMCompareProps {
  comparisonResult: ComparisonResult | null;
}

const BOMCompare: React.FC<BOMCompareProps> = ({ comparisonResult }) => {
  const [hasData, setHasData] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
    // Debug the comparison result in real-time
  useEffect(() => {
    console.log("🚀 BOMCompare rendered with data:", comparisonResult);
    console.log("🚀 ComparisonResult keys:", comparisonResult ? Object.keys(comparisonResult) : 'null');
    
    if (comparisonResult?.changedComponents?.length > 0) {
      console.log("🚀 Sample changed component:", comparisonResult.changedComponents[0]);
      console.log("🚀 Sample changed component JSON:", JSON.stringify(comparisonResult.changedComponents[0], null, 2));
    }
  }, [comparisonResult]);
  
  useEffect(() => {
    // Check if there is any data to display
    if (comparisonResult) {
      const hasAddedComponents = comparisonResult.addedComponents && comparisonResult.addedComponents.length > 0;
      const hasDeletedComponents = comparisonResult.deletedComponents && comparisonResult.deletedComponents.length > 0;
      const hasChangedComponents = comparisonResult.changedComponents && comparisonResult.changedComponents.length > 0;
      
      setHasData(hasAddedComponents || hasDeletedComponents || hasChangedComponents);
      
      console.log("BOMCompare data check:", {
        hasAddedComponents,
        hasDeletedComponents,
        hasChangedComponents,
        addedComponents: comparisonResult.addedComponents,
        deletedComponents: comparisonResult.deletedComponents,
        changedComponents: comparisonResult.changedComponents
      });
      
      // Debug the first changed component structure
      if (hasChangedComponents && comparisonResult.changedComponents.length > 0) {
        const firstChanged = comparisonResult.changedComponents[0];
        console.log("First changed component structure:", firstChanged);
        console.log("First changed component fields:", Object.keys(firstChanged || {}));
        if (firstChanged?.original) {
          console.log("Original fields:", Object.keys(firstChanged.original));
        }
        if (firstChanged?.modified) {
          console.log("Modified fields:", Object.keys(firstChanged.modified));
        }
      }
    } else {
      setHasData(false);
    }
  }, [comparisonResult]);

  // Extract BOM specific comparison data from the general ComparisonResult
  const addedComponents = comparisonResult?.addedComponents || [];
  const deletedComponents = comparisonResult?.deletedComponents || [];
  const changedComponents = comparisonResult?.changedComponents || [];
  const validationWarnings = comparisonResult?.validationWarnings || [];
  const statistics = comparisonResult?.statistics || {};  // Always hide manufacturer column for XML tables
  const hasManufacturerData = false;

  // Export functions
  const exportToCSV = () => {
    const csvRows = [];
      // Header (without manufacturer)
    csvRows.push(['Change Type', 'Reference', 'Part Name', 'Quantity', 'Package', 'Description'].join(','));
      // Added components
    addedComponents.forEach(comp => {      csvRows.push([
        'Added',
        comp.reference || '',
        comp.partNumber || '',  // Use partNumber field (which contains PART-NUM)
        comp.quantity || '',
        comp.footprint || '',
        comp.description || ''
      ].map(field => `"${field}"`).join(','));
    });
    
    // Removed components
    deletedComponents.forEach(comp => {      csvRows.push([
        'Removed',
        comp.reference || '',
        comp.partNumber || '',  // Use partNumber field (which contains PART-NUM)
        comp.quantity || '',
        comp.footprint || '',
        comp.description || ''
      ].map(field => `"${field}"`).join(','));
    });
      // Changed components
    changedComponents.forEach(chg => {      csvRows.push([
        'Changed (Old)',
        chg.reference || '',
        chg.original?.partNumber || '',  // Use partNumber field (which contains PART-NUM)
        chg.original?.quantity || '',
        chg.original?.footprint || '',
        chg.original?.description || ''
      ].map(field => `"${field}"`).join(','));
        csvRows.push([
        'Changed (New)',
        chg.reference || '',
        chg.modified?.partNumber || '',  // Use partNumber field (which contains PART-NUM)
        chg.modified?.quantity || '',
        chg.modified?.footprint || '',
        chg.modified?.description || ''
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
    
    if (addedComponents.length > 0) {      report.push(`Added Components (${addedComponents.length}):`);
      (addedComponents as any[]).forEach(comp => {
        const ref = comp.REFDES || comp.reference || comp.Reference || '';
        const partNum = comp.PartNumber || comp.partNumber || comp['PART-NUM'] || '';
        const qty = comp.QTY || comp.quantity || comp.value || '';
        report.push(`  ${ref}: ${partNum} (${qty})`);
      });
      report.push('');
    }
    
    if (deletedComponents.length > 0) {
      report.push(`Removed Components (${deletedComponents.length}):`);
      (deletedComponents as any[]).forEach(comp => {
        const ref = comp.REFDES || comp.reference || comp.Reference || '';
        const partNum = comp.PartNumber || comp.partNumber || comp['PART-NUM'] || '';
        const qty = comp.QTY || comp.quantity || comp.value || '';
        report.push(`  ${ref}: ${partNum} (${qty})`);
      });
      report.push('');
    }
    
    if (changedComponents.length > 0) {      report.push(`Changed Components (${changedComponents.length}):`);
      (changedComponents as any[]).forEach(chg => {
        const ref = chg.Reference || chg.reference || '';
        const original = chg.Original || chg.original || {};
        const modified = chg.Modified || chg.modified || {};
        
        const origPartNum = original?.PartNumber || original?.partNumber || original?.['PART-NUM'] || '';
        const origQty = original?.QTY || original?.quantity || original?.value || '';
        const modPartNum = modified?.PartNumber || modified?.partNumber || modified?.['PART-NUM'] || '';
        const modQty = modified?.QTY || modified?.quantity || modified?.value || '';
        
        report.push(`  ${ref}:`);
        report.push(`    Old: ${origPartNum} (${origQty})`);
        report.push(`    New: ${modPartNum} (${modQty})`);
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
  };
  // Only render if there are any BOM comparison results
  if (!hasData) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/20 mt-6">
        <h3 className="text-lg font-medium mb-2">No Component Differences Found</h3>
        <p className="text-muted-foreground">
          The BOM comparison didn't find any added, removed, or changed components between the two files.
        </p>
      </div>
    );
  }  const renderComponentRow = (comp: any, i: number) => (
    <tr key={i} className="hover:bg-gray-50">      <td className="p-2 border">{comp.reference || ''}</td>
      <td className="p-2 border font-mono text-sm">{comp.partNumber || ''}</td>
      <td className="p-2 border text-center">{comp.quantity || ''}</td>
      <td className="p-2 border">{comp.footprint || ''}</td>
      <td className="p-2 border text-sm">{comp.description || ''}</td>
    </tr>
  );  const renderChangedComponentRow = (chg: any, i: number) => {
    console.log(`🎨 Rendering changed component row ${i}:`, chg);
    
    // Backend returns lowercase field names: 'reference', 'original', 'modified'
    const ref = chg.reference || '';
    const original = chg.original || {};
    const modified = chg.modified || {};
    
    console.log(`🎨 Fields - ref: ${ref}, original:`, original, 'modified:', modified);

    // Helper function to render field changes in a clear inline format
    const renderFieldChange = (fieldName: string, originalValue: string | undefined, modifiedValue: string | undefined) => {
      const oldVal = originalValue || '';
      const newVal = modifiedValue || '';
      
      console.log(`🎨 Field ${fieldName}: "${oldVal}" → "${newVal}"`);
      
      if (oldVal !== newVal && (oldVal || newVal)) {
        return (
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-red-600 line-through decoration-2 bg-red-50 px-2 py-1 rounded border">
              {oldVal || '(empty)'}
            </span>
            <span className="text-blue-500 font-bold text-lg">→</span>
            <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded border border-green-200">
              {newVal || '(empty)'}
            </span>
          </div>
        );
      }
      
      // If no change, show the current value normally
      return (
        <span className="text-gray-700 font-medium">
          {oldVal || newVal || '-'}
        </span>
      );
    };

    const hasAnyChange = 
      (original?.partNumber || '') !== (modified?.partNumber || '') ||
      (original?.quantity || '') !== (modified?.quantity || '') ||
      (original?.footprint || '') !== (modified?.footprint || '') ||
      (original?.description || '') !== (modified?.description || '');

    console.log(`🎨 Component ${ref} has changes: ${hasAnyChange}`);

    return (
      <tr key={i} className={`hover:bg-gray-50 ${hasAnyChange ? 'border-l-4 border-l-blue-500 bg-blue-50' : 'bg-gray-50'}`}>
        <td className="p-3 border font-bold text-gray-900 bg-blue-100">
          {ref}
          {hasAnyChange && <span className="ml-2 text-blue-600 text-xs">● CHANGED</span>}
        </td>
        <td className="p-3 border">
          {renderFieldChange('partNumber', original?.partNumber, modified?.partNumber)}
        </td>
        <td className="p-3 border text-center">
          {renderFieldChange('quantity', original?.quantity, modified?.quantity)}
        </td>
        <td className="p-3 border">
          {renderFieldChange('footprint', original?.footprint, modified?.footprint)}
        </td>
        <td className="p-3 border text-sm">
          {renderFieldChange('description', original?.description, modified?.description)}
        </td>
      </tr>
    );
  };return (
    <div className="space-y-6">
      {/* Debug Panel - Temporary */}
      {showDebug && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm font-mono">
              <div>
                <strong>hasData:</strong> {hasData.toString()}
              </div>
              <div>
                <strong>addedComponents.length:</strong> {addedComponents.length}
              </div>
              <div>
                <strong>deletedComponents.length:</strong> {deletedComponents.length}
              </div>
              <div>
                <strong>changedComponents.length:</strong> {changedComponents.length}
              </div>
              {changedComponents.length > 0 && (
                <div>
                  <strong>First changed component:</strong>
                  <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-x-auto">
                    {JSON.stringify(changedComponents[0], null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <strong>comparisonResult keys:</strong> {Object.keys(comparisonResult || {}).join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Statistics */}
      <Card><CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              BOM Comparison Summary
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportSummaryReport}>
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
        </Alert>
      )}

      {/* Debug Information */}
      {showDebug && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Total Components Found:</strong> {addedComponents.length + deletedComponents.length + changedComponents.length}</div>
              {statistics && Object.keys(statistics).length > 0 && (
                <div>
                  <strong>Statistics:</strong>
                  <pre className="mt-1 text-xs">{JSON.stringify(statistics, null, 2)}</pre>
                </div>
              )}
              {changedComponents.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">View First Changed Component Structure</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(changedComponents[0], null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {addedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Added Components
              <Badge variant="secondary">{addedComponents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">                <thead>                  <tr className="bg-green-50">
                    <th className="p-2 border text-left">Reference</th>
                    <th className="p-2 border text-left">Part Name</th>
                    <th className="p-2 border text-left">Quantity</th>
                    <th className="p-2 border text-left">Package</th>
                    <th className="p-2 border text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {addedComponents.map(renderComponentRow)}
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
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">                <thead>                  <tr className="bg-red-50">
                    <th className="p-2 border text-left">Reference</th>
                    <th className="p-2 border text-left">Part Name</th>
                    <th className="p-2 border text-left">Quantity</th>
                    <th className="p-2 border text-left">Package</th>
                    <th className="p-2 border text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedComponents.map(renderComponentRow)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {changedComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Changed Components
              <Badge variant="outline">{changedComponents.length}</Badge>
            </CardTitle>
          </CardHeader>          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">How to Read Changes:</h4>
              <div className="flex items-center gap-6 flex-wrap text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                  <span className="line-through text-red-600">Old values</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 font-bold text-lg">→</span>
                  <span className="text-gray-600">indicates change to</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                  <span className="font-semibold text-green-600">New values</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-blue-700">Blue border = component with changes</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">                <thead>                  <tr className="bg-blue-50">
                    <th className="p-2 border text-left">Reference</th>
                    <th className="p-2 border text-left">Part Name</th>
                    <th className="p-2 border text-left">Quantity</th>
                    <th className="p-2 border text-left">Package</th>
                    <th className="p-2 border text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {changedComponents.map((chg: any, i: number) => {
                    // Add debug logging to inspect the component structure at render time
                    if (i === 0) {
                      console.log("BOMCompare rendering changed component:", chg);
                    }
                    
                    return renderChangedComponentRow(chg, i);
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BOMCompare;
