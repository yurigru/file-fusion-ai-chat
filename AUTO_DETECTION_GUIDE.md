# Auto-Detection of File Comparison Direction

## Overview

The file-fusion AI chat application now automatically detects the comparison direction when two files are selected based on their filenames. If the filenames contain "old" and "new", the system will automatically order them from old → new for the comparison.

## How It Works

### Auto-Detection Logic

When two files are selected for comparison, the system examines their filenames:

1. **Filename Analysis**: Converts filenames to lowercase and checks for keywords:
   - Files containing "old" are identified as the base/original version
   - Files containing "new" are identified as the target/modified version

2. **Automatic Ordering**: If both patterns are detected, files are automatically ordered:
   - File with "old" becomes File 1 (Old/Base)
   - File with "new" becomes File 2 (New/Target)

3. **Visual Feedback**: The UI provides clear indicators when auto-detection occurs

### Examples

These filename patterns will trigger auto-detection:

✅ **Detected**:
- `bom_old.xml` + `bom_new.xml`
- `schematic_old.net` + `schematic_new.net`
- `PCB_Layout_Old_v1.xml` + `PCB_Layout_New_v2.xml`
- `old_design.csv` + `new_design.csv`

❌ **Not Detected**:
- `design_v1.xml` + `design_v2.xml`
- `master.xml` + `feature_branch.xml`
- `baseline.csv` + `updated.csv`

## User Interface Features

### Auto-Detection Alert

When auto-detection occurs, an informational alert appears at the top of the comparison area:

```
ℹ️ Auto-detected comparison direction: bom_old.xml (old) → bom_new.xml (new) (files were automatically reordered)
```

### Enhanced File Labels

- **File 1**: Displays "Old/Base" label with blue background when auto-detected
- **File 2**: Displays "New/Target" label with green background when auto-detected
- **Fallback**: Shows "Base" and "Compare" labels when no auto-detection occurs

### Manual Override

Users can still manually swap the comparison direction using the "Swap Direction" button if needed.

## Implementation Details

### Frontend Changes

#### `src/pages/Index.tsx`
- Added auto-detection logic in the `useEffect` that handles `selectedFiles`
- Examines filenames for "old" and "new" keywords
- Automatically reorders files when both patterns are found
- Shows success toast notification when auto-detection occurs

#### `src/components/FileComparison.tsx`
- Added `getAutoDetectionInfo()` function to detect auto-ordering
- Enhanced UI with informational alert when auto-detection occurs
- Improved file labels with color-coded badges
- Maintains backward compatibility for manual file selection

### Key Functions

```typescript
// Auto-detection logic in Index.tsx
const file1Name = selectedFiles[0].name.toLowerCase();
const file2Name = selectedFiles[1].name.toLowerCase();

const file1HasOld = file1Name.includes('old');
const file1HasNew = file1Name.includes('new');
const file2HasOld = file2Name.includes('old');
const file2HasNew = file2Name.includes('new');

// Automatic reordering when patterns are detected
if ((file1HasOld && file2HasNew) || (file2HasOld && file1HasNew)) {
  // Order files so old comes first
}
```

## Benefits

1. **Improved UX**: Eliminates manual file ordering for common naming conventions
2. **Reduced Errors**: Prevents accidental reverse comparisons
3. **Clear Intent**: Makes comparison direction obvious through visual indicators
4. **Non-Intrusive**: Only activates when clear patterns are detected
5. **Flexible**: Users can still manually override if needed

## Testing

### Test Files Created

Two test files have been created to demonstrate the feature:

- `test-data/bom_old.xml`: Contains 2 components (C1, R1)
- `test-data/bom_new.xml`: Contains 3 components (C1, R1 with quantity change, C2 added)

### Expected Behavior

1. Upload both test files
2. System auto-detects and orders `bom_old.xml` → `bom_new.xml`
3. Alert shows: "Auto-detected comparison direction: bom_old.xml (old) → bom_new.xml (new)"
4. File labels show "Old/Base" and "New/Target" with colored badges
5. Comparison results show R1 quantity changed from 1 → 2 and C2 added

## Future Enhancements

Potential improvements for this feature:

1. **Extended Pattern Recognition**: Support for version numbers (v1, v2), timestamps, etc.
2. **Configurable Keywords**: Allow users to define custom old/new keywords
3. **Smart Versioning**: Detect semantic version patterns (1.0 vs 2.0)
4. **File Timestamp**: Fall back to file modification dates when naming is ambiguous
5. **Bulk Comparison**: Extend auto-detection to multiple file pairs

## Compatibility

- ✅ Works with all supported file types (XML, CSV, NET)
- ✅ Backward compatible with existing manual selection workflow
- ✅ No breaking changes to existing comparison logic
- ✅ Maintains all existing comparison features
