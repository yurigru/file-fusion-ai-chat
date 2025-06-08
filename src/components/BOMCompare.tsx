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
    csvRows.push(['Change Type', 'Reference', 'Part Number', 'Quantity', 'Package', 'Description'].join(','));
    
    // Added components
    addedComponents.forEach(comp => {
      csvRows.push([
        'Added',
        comp.reference || '',
        comp.partNumber || '',
        comp.quantity || '',
        comp.footprint || '',
        comp.description || ''
      ].map(field => `"${field}"`).join(','));
    });
    
    // Removed components
    deletedComponents.forEach(comp => {
      csvRows.push([
        'Removed',
        comp.reference || '',
        comp.partNumber || '',
        comp.quantity || '',
        comp.footprint || '',
        comp.description || ''
      ].map(field => `"${field}"`).join(','));
    });
    
    // Changed components
    changedComponents.forEach(chg => {
      csvRows.push([
        'Changed (Old)',
        chg.reference || '',
        chg.original?.partNumber || '',
        chg.original?.quantity || '',
        chg.original?.footprint || '',
        chg.original?.description || ''
      ].map(field => `"${field}"`).join(','));
      
      csvRows.push([
        'Changed (New)',
        chg.reference || '',
        chg.modified?.partNumber || '',
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
    
    if (addedComponents.length > 0) {
      report.push(`Added Components (${addedComponents.length}):`);
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
    
    if (changedComponents.length > 0) {
      report.push(`Changed Components (${changedComponents.length}):`);
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
  );

  const renderChangedComponentRow = (chg: any, i: number) => {
    // Debug logging for each row render
    console.log(`🔍 Rendering changed row ${i}:`, chg);
    console.log(`🔍 Row ${i} keys:`, Object.keys(chg || {}));
    
    // Backend returns lowercase field names: 'reference', 'original', 'modified'
    const ref = chg.reference || '';
    const original = chg.original || {};
    const modified = chg.modified || {};
    
    console.log(`🔍 Row ${i} reference:`, ref);
    console.log(`🔍 Row ${i} original:`, original);
    console.log(`🔍 Row ${i} original keys:`, Object.keys(original));
    console.log(`🔍 Row ${i} modified:`, modified);
    console.log(`🔍 Row ${i} modified keys:`, Object.keys(modified));
    
    // Test specific field access
    console.log(`🔍 Row ${i} original.partNumber:`, original?.partNumber);
    console.log(`🔍 Row ${i} modified.partNumber:`, modified?.partNumber);
    console.log(`🔍 Row ${i} original.quantity:`, original?.quantity);
    console.log(`🔍 Row ${i} modified.quantity:`, modified?.quantity);
      const hasPartNumberChange = (original?.partNumber) !== (modified?.partNumber);
    const hasQuantityChange = (original?.quantity) !== (modified?.quantity);
    const hasPackageChange = (original?.footprint) !== (modified?.footprint);
    const hasDescriptionChange = (original?.description) !== (modified?.description);

    return (
      <tr key={i} className="hover:bg-gray-50">
        <td className="p-2 border font-medium">{ref}</td>
        <td className={`p-2 border font-mono text-sm ${hasPartNumberChange ? 'bg-yellow-50' : ''}`}>
          <div className="space-y-1">
            <div className="text-red-600">- {original?.partNumber || ''}</div>
            <div className="text-green-600">+ {modified?.partNumber || ''}</div>
          </div>
        </td>
        <td className={`p-2 border text-center ${hasQuantityChange ? 'bg-yellow-50' : ''}`}>
          <div className="space-y-1">
            <div className="text-red-600">- {original?.quantity || ''}</div>
            <div className="text-green-600">+ {modified?.quantity || ''}</div>
          </div>        </td>
        <td className={`p-2 border ${hasPackageChange ? 'bg-yellow-50' : ''}`}>
          {hasPackageChange ? (
            <div className="space-y-1">
              <div className="text-red-600">- {original?.footprint || ''}</div>
              <div className="text-green-600">+ {modified?.footprint || ''}</div>
            </div>
          ) : (
            <span>{original?.footprint || ''}</span>
          )}
        </td>
        <td className={`p-2 border text-sm ${hasDescriptionChange ? 'bg-yellow-50' : ''}`}>
          {hasDescriptionChange ? (
            <div className="space-y-1">
              <div className="text-red-600">- {original?.description || ''}</div>
              <div className="text-green-600">+ {modified?.description || ''}</div>
            </div>
          ) : (
            <span>{original?.description || ''}</span>
          )}
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
                    <th className="p-2 border text-left">Part Number</th>
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
                    <th className="p-2 border text-left">Part Number</th>
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
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border"></div>
                  <span>Removed values</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border"></div>
                  <span>Added values</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-50 border"></div>
                  <span>Changed fields</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">                <thead>                  <tr className="bg-blue-50">
                    <th className="p-2 border text-left">Reference</th>
                    <th className="p-2 border text-left">Part Number</th>
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
