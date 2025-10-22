# Multi-Sheet Implementation Summary

## Changes Made

Updated the Linear burndown script to create **separate sheets for each customer** instead of a single sheet with a dropdown selector.

## Key Improvements

### Before (Single Sheet)
- One "Burndown Data" sheet with dropdown selector in B1
- User had to select project and click refresh to switch
- Only one burndown chart visible at a time
- Required manual switching to compare customers

### After (Multi-Sheet)
- Four separate sheets: **Square**, **Intercom**, **Elevenlabs**, **Cohere**
- Each sheet has its own data table, chart, and summary stats
- Click "Refresh All Customers" once to update all sheets
- Easy tab switching to compare different customers
- All data always up-to-date simultaneously

## New Behavior

### Single Refresh Button
- Menu: **Linear Sync → Refresh All Customers**
- Fetches data for all 4 projects in one operation
- Shows success/failure count: "Refreshed 4 customer(s)" or "Refreshed 3 customer(s), 1 failed"
- Each sheet updates independently (failures don't block others)

### Sheet Structure
Each customer sheet contains:
1. **Title**: `[Customer] - GitHub Issue Burndown` (e.g., "Square - GitHub Issue Burndown")
2. **Data Table**: Date, Total Created, Total Completed, Remaining
3. **Burndown Chart**: Three-line visualization
4. **Summary Panel**: Total, Completed, Remaining, Last Updated timestamp

### Error Handling
- Individual project failures logged but don't stop other refreshes
- Success message shows how many customers updated successfully
- Detailed errors available in Apps Script execution log

## Code Changes

### Removed
- `setupProjectSelector()` function (no longer needed)
- `refreshLinearData()` as primary function (kept as legacy alias)
- Project dropdown UI logic
- Single-sheet management code

### Added
- `refreshAllCustomers()` - Main entry point, refreshes all projects
- `refreshCustomerSheet(projectName)` - Refreshes individual customer sheet
- Error counting and summary reporting
- Sheet creation per customer with proper titles

### Modified
- `onOpen()` menu - Changed "Refresh Data" to "Refresh All Customers"
- Chart titles now include customer name
- Each sheet gets its own chart instead of reusing one

## User Experience

### Setup (First Time)
1. Extensions → Apps Script → Paste code
2. Linear Sync → Setup API Token
3. Linear Sync → Refresh All Customers
4. **Done!** Four sheets created with all data

### Daily Usage
1. Open Google Sheet
2. Click **Linear Sync → Refresh All Customers**
3. View any customer by clicking their sheet tab
4. Compare customers by switching between tabs

### Auto-Refresh (Optional)
- Set trigger for `refreshAllCustomers` function
- All 4 customers update in single execution
- More efficient than separate triggers per customer

## Technical Benefits

### Performance
- Parallel data fetching possible (if needed in future)
- One API call per project (4 total)
- Charts render once per sheet (no re-rendering on switch)

### Maintainability
- Simpler code without selector logic
- Easier to add new customers (just add to PROJECTS constant)
- Clear separation of concerns (one function per sheet)

### Reliability
- Individual project failures don't affect others
- Clear error reporting per customer
- Sheet state preserved even if one refresh fails

## Adding New Customers

To add a new customer (e.g., "Acme"):

1. Get the Linear project ID from the URL
2. Add to PROJECTS constant:
   ```javascript
   const PROJECTS = {
     'Square': '857fa6e14378',
     'Intercom': '9eb5c238a630',
     'Elevenlabs': 'f2059a25931a',
     'Cohere': 'ac784cf01e1d',
     'Acme': 'new-project-id-here'  // Add here
   };
   ```
3. Save and refresh - new "Acme" sheet will be created automatically

## Backwards Compatibility

- `refreshLinearData()` still exists but now calls `refreshAllCustomers()`
- Existing sheets will be cleared and repopulated with new format
- No data loss - everything pulled fresh from Linear API
- Old "Burndown Data" sheet can be manually deleted if desired
