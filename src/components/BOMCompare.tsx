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

  return (
    <div className="space-y-4">
      {addedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Added Components</h3>
          <ul className="list-disc ml-6">
            {addedComponents.map((comp, i) => (
              <li key={i}>{comp.reference} | {comp.value} | {comp.manufacturer} | {comp.partNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {deletedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Removed Components</h3>
          <ul className="list-disc ml-6">
            {deletedComponents.map((comp, i) => (
              <li key={i}>{comp.reference} | {comp.value} | {comp.manufacturer} | {comp.partNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {changedComponents.length > 0 && (
        <div>
          <h3 className="font-bold">Changed Components</h3>
          <ul className="list-disc ml-6">
            {changedComponents.map((chg, i) => (
              <li key={i}>
                {chg.reference}: Old [ {chg.original.Value} | {chg.original.Manufacturer} | {chg.original.PartNumber} ] → New [ {chg.modified.Value} | {chg.modified.Manufacturer} | {chg.modified.PartNumber} ]
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BOMCompare;
