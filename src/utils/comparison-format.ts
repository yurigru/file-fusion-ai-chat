import { ComparisonResult, ElectronicComponent } from "@/types";

export const formatAddedComponentsData = (components: ElectronicComponent[] | undefined) => {
  if (!components || components.length === 0) {
    return [];
  }
  
  return components.map(comp => ({
    reference: comp.reference || '',
    value: comp.value || '',
    manufacturer: comp.manufacturer || '',
    partNumber: comp.partNumber || '',
    opt: comp.opt || '',
    package: comp.package || '',
    description: comp.description || ''
  }));
};

export const formatDeletedComponentsData = (components: ElectronicComponent[] | undefined) => {
  return formatAddedComponentsData(components);
};

export const formatChangedComponentsData = (
  changedComponents: Array<{
    reference: string;
    original: Partial<ElectronicComponent>;
    modified: Partial<ElectronicComponent>;
  }> | undefined
) => {
  if (!changedComponents || changedComponents.length === 0) {
    return [];
  }
  
  return changedComponents.map(change => ({
    reference: change.reference || '',
    originalValue: change.original.value || '',
    newValue: change.modified.value || '',
    originalManufacturer: change.original.manufacturer || '',
    newManufacturer: change.modified.manufacturer || '',
    originalPartNumber: change.original.partNumber || '',
    newPartNumber: change.modified.partNumber || '',
    originalOpt: change.original.opt || '',
    newOpt: change.modified.opt || '',
    originalPackage: change.original.package || '',
    newPackage: change.modified.package || '',
    description: change.modified.description || change.original.description || ''
  }));
};

export const updateVisibleLines = (
  activeTab: string,
  result: ComparisonResult | null,
  file1Content: string,
  file2Content: string
) => {
  if (!result) return [];
  
  let nextVisibleLines: string[] = [];
  const file1Lines = file1Content.split('\n');
  const file2Lines = file2Content.split('\n');
  const allLines = new Map<number, { content: string; status: 'added' | 'deleted' | 'changed' | 'unchanged' }>();
  
  file1Lines.forEach((line, idx) => {
    allLines.set(idx, { content: line, status: 'unchanged' });
  });
  
  if (activeTab === 'all' || activeTab === 'deleted') {
    result.deleted.forEach(lineIdx => {
      const idx = parseInt(lineIdx);
      if (allLines.has(idx)) {
        allLines.set(idx, { content: file1Lines[idx], status: 'deleted' });
      }
    });
  }
  
  if (activeTab === 'all' || activeTab === 'added') {
    result.added.forEach(lineIdx => {
      const idx = parseInt(lineIdx);
      allLines.set(file1Lines.length + idx, { content: file2Lines[idx], status: 'added' });
    });
  }
  
  if (activeTab === 'all' || activeTab === 'changed') {
    result.changed.forEach(change => {
      allLines.set(change.line, { content: change.modified, status: 'changed' });
    });
  }
  
  nextVisibleLines = Array.from(allLines.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, value]) => {
      let prefix = '';
      switch (value.status) {
        case 'added': prefix = '+ '; break;
        case 'deleted': prefix = '- '; break;
        case 'changed': prefix = '~ '; break;
        default: prefix = '  ';
      }
      return `${prefix}${value.content}`;
    });
  
  return nextVisibleLines;
};

export const getLineClass = (line: string) => {
  if (line.startsWith('+ ')) return 'bg-added/10 text-added';
  if (line.startsWith('- ')) return 'bg-deleted/10 text-deleted';
  if (line.startsWith('~ ')) return 'bg-changed/10 text-changed';
  return '';
};
