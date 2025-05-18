import React from "react";
import { ComparisonResult, ElectronicComponent } from "@/types"; // Import necessary types

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

  // Extract BOM specific comparison data from the general ComparisonResult
  const addedComponents = comparisonResult?.addedComponents || [];
  const deletedComponents = comparisonResult?.deletedComponents || [];
  const changedComponents = comparisonResult?.changedComponents || [];

  // Only render if there are any BOM comparison results
  if (!comparisonResult || (addedComponents.length === 0 && deletedComponents.length === 0 && changedComponents.length === 0)) {
    return null;
  }

  const renderComponentRow = (comp: any, i: number) => (
    <tr key={i}>
      <td>{comp.REFDES || comp.reference || ''}</td>
      <td>{comp.PartNumber || comp.partNumber || ''}</td>
      <td>{comp.QTY || comp.quantity || ''}</td>
      <td>{comp.PACKAGE || comp.package || ''}</td>
      <td>{comp.OPT || comp.opt || ''}</td>
      <td>{comp.DESCRIPTION || comp.description || ''}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      {addedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Added Components</h3>
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Part Number</th>
                <th>Quantity</th>
                <th>Package</th>
                <th>Opt</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {addedComponents.map(renderComponentRow)}
            </tbody>
          </table>
        </div>
      )}
      {deletedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Removed Components</h3>
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Part Number</th>
                <th>Quantity</th>
                <th>Package</th>
                <th>Opt</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {deletedComponents.map(renderComponentRow)}
            </tbody>
          </table>
        </div>
      )}
      {changedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Changed Components</h3>
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th>Reference</th>
                <th colSpan={5}>Change</th>
              </tr>
            </thead>
            <tbody>
              {changedComponents.map((chg: any, i: number) => (
                <tr key={i}>
                  <td>{chg.reference}</td>
                  <td colSpan={5}>
                    Old [ {chg.original.PartNumber || chg.original.partNumber || ''} | {chg.original.QTY || chg.original.quantity || ''} | {chg.original.PACKAGE || chg.original.package || ''} | {chg.original.OPT || chg.original.opt || ''} | {chg.original.DESCRIPTION || chg.original.description || ''} ] → New [ {chg.modified.PartNumber || chg.modified.partNumber || ''} | {chg.modified.QTY || chg.modified.quantity || ''} | {chg.modified.PACKAGE || chg.modified.package || ''} | {chg.modified.OPT || chg.modified.opt || ''} | {chg.modified.DESCRIPTION || chg.modified.description || ''} ]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BOMCompare;
