import React, { useEffect, useState } from "react";

interface BOMComponent {
  Reference: string;
  Value: string;
  Manufacturer: string;
  PartNumber: string;
}

interface BOMCompareResult {
  added: BOMComponent[];
  removed: BOMComponent[];
  changed: { Reference: string; Old: BOMComponent; New: BOMComponent }[];
}

interface BOMCompareProps {
  oldFile: File | null;
  newFile: File | null;
}

const BOMCompare: React.FC<BOMCompareProps> = ({ oldFile, newFile }) => {
  const [result, setResult] = useState<BOMCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const compare = async () => {
      if (!oldFile || !newFile) return;
      setLoading(true);
      setError(null);
      setResult(null);
      const formData = new FormData();
      formData.append("old_file", oldFile);
      formData.append("new_file", newFile);
      try {
        const response = await fetch("http://localhost:8000/compare-bom", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Comparison failed");
        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    compare();
  }, [oldFile, newFile]);

  if (!oldFile || !newFile) return null;

  if (!result || (result.added.length === 0 && result.removed.length === 0 && result.changed.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {loading && <div>Comparing BOM files...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {result.added.length > 0 && (
        <div>
          <h3 className="font-bold">Added Components</h3>
          <ul className="list-disc ml-6">
            {result.added.map((comp, i) => (
              <li key={i}>{comp.Reference} | {comp.Value} | {comp.Manufacturer} | {comp.PartNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {result.removed.length > 0 && (
        <div>
          <h3 className="font-bold">Removed Components</h3>
          <ul className="list-disc ml-6">
            {result.removed.map((comp, i) => (
              <li key={i}>{comp.Reference} | {comp.Value} | {comp.Manufacturer} | {comp.PartNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {result.changed.length > 0 && (
        <div>
          <h3 className="font-bold">Changed Components</h3>
          <ul className="list-disc ml-6">
            {result.changed.map((chg, i) => (
              <li key={i}>
                {chg.Reference}: Old [ {chg.Old.Value} | {chg.Old.Manufacturer} | {chg.Old.PartNumber} ] → New [ {chg.New.Value} | {chg.New.Manufacturer} | {chg.New.PartNumber} ]
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BOMCompare;
