
import React from "react";
import { ComparisonResult, ElectronicComponent } from "@/types"; // Import necessary types
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BOMCompareProps {
  comparisonResult: ComparisonResult | null;
}

const BOMCompare: React.FC<BOMCompareProps> = ({ comparisonResult }) => {
  // Extract BOM specific comparison data from the general ComparisonResult
  const addedComponents = comparisonResult?.addedComponents || [];
  const deletedComponents = comparisonResult?.deletedComponents || [];
  const changedComponents = comparisonResult?.changedComponents || [];

  // Only render if there are any BOM comparison results
  if (!comparisonResult || (addedComponents.length === 0 && deletedComponents.length === 0 && changedComponents.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {addedComponents.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-2">Added Components</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Value/Quantity</TableHead>
                <TableHead>Option</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addedComponents.map((comp, i) => (
                <TableRow key={i}>
                  <TableCell>{comp.reference}</TableCell>
                  <TableCell>{comp.partNumber}</TableCell>
                  <TableCell>{comp.value}</TableCell>
                  <TableCell>{comp.opt || '-'}</TableCell>
                  <TableCell>{comp.package || '-'}</TableCell>
                  <TableCell>{comp.description || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {deletedComponents.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-2">Removed Components</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Value/Quantity</TableHead>
                <TableHead>Option</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedComponents.map((comp, i) => (
                <TableRow key={i}>
                  <TableCell>{comp.reference}</TableCell>
                  <TableCell>{comp.partNumber}</TableCell>
                  <TableCell>{comp.value}</TableCell>
                  <TableCell>{comp.opt || '-'}</TableCell>
                  <TableCell>{comp.package || '-'}</TableCell>
                  <TableCell>{comp.description || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {changedComponents.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-2">Changed Components</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Original Part#</TableHead>
                <TableHead>New Part#</TableHead>
                <TableHead>Original Value</TableHead>
                <TableHead>New Value</TableHead>
                <TableHead>Original Opt</TableHead>
                <TableHead>New Opt</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changedComponents.map((chg, i) => (
                <TableRow key={i}>
                  <TableCell>{chg.reference}</TableCell>
                  <TableCell>{chg.original.partNumber}</TableCell>
                  <TableCell>{chg.modified.partNumber}</TableCell>
                  <TableCell>{chg.original.value}</TableCell>
                  <TableCell>{chg.modified.value}</TableCell>
                  <TableCell>{chg.original.opt || '-'}</TableCell>
                  <TableCell>{chg.modified.opt || '-'}</TableCell>
                  <TableCell>{chg.modified.description || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BOMCompare;
