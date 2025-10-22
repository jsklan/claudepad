# Linear Burndown Chart - Setup Guide

## Overview

This Google Apps Script creates an auto-refreshing burndown chart for GitHub issues (identified by "ghIssue" in the title) across multiple Linear enterprise support projects.

**Supported Projects:**
- Square Enterprise Support
- Intercom Enterprise Support
- Elevenlabs Enterprise Support
- Cohere Enterprise Support

## Setup Instructions

### 1. Get Your Linear API Token

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Click "Create a personal API key"
3. Give it a name (e.g., "Burndown Charts")
4. Copy the token (keep it secure)

### 2. Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Linear Burndown Charts" (or your preference)

### 3. Add the Script

1. In your sheet, click **Extensions → Apps Script**
2. Delete any default code
3. Copy the entire contents of `square_burndown_script.js`
4. Paste into the Apps Script editor
5. Click **Save** (💾 icon) and name the project "Linear Burndown"

### 4. Configure API Token

1. In your Google Sheet, you should see a new menu: **Linear Sync**
2. Click **Linear Sync → Setup API Token**
3. Paste your Linear API token from step 1
4. Click **OK**

### 5. First Data Refresh

1. Click **Linear Sync → Refresh All Customers**
2. **Grant permissions** when prompted (Google will ask to authorize the script)
3. Wait for the data to load (you'll see a loading toast notification)
4. Four separate sheets will be created, one for each customer!

## Using the Dashboard

### Sheet Structure

The script automatically creates **separate sheets** for each customer:
- **Square** - Square Enterprise Support burndown
- **Intercom** - Intercom Enterprise Support burndown
- **Elevenlabs** - Elevenlabs Enterprise Support burndown
- **Cohere** - Cohere Enterprise Support burndown

Each sheet contains its own:
- Data table with historical issue counts
- Burndown chart visualization
- Summary statistics panel

**Smart Refresh**: The script preserves any custom formatting you've applied to existing sheets. Only data values are updated, not formatting, column widths, or styles.

### Switching Between Customers

Simply click on the sheet tabs at the bottom to view different customer burndowns.

### Refreshing Data

Click **Linear Sync → Refresh All Customers** to update all four sheets simultaneously with the latest data from Linear.

### Chart Explanation

The burndown chart shows three lines:

1. **Total Created (Blue)**: Cumulative count of all GitHub issues created over time
2. **Total Completed (Green)**: Cumulative count of completed issues
3. **Remaining (Red)**: Active issues still open (Created - Completed)

### Summary Stats

On the right side of each sheet, you'll see:
- **Total Issues**: All-time count of GitHub issues in this project
- **Completed**: How many have been resolved
- **Remaining**: Current open GitHub issues
- **Last Updated**: When you last refreshed the data

## Data Table

Below the title on each sheet, you'll see a data table with:
- **Date**: Each date when issues were created or completed
- **Total Created**: Running total of issues created
- **Total Completed**: Running total of issues completed
- **Remaining**: Outstanding issues on that date

## Filtering Logic

The script automatically filters for issues that:
- Belong to the selected enterprise support project
- Have "ghIssue" (case-insensitive) in the title
- Format example: `[Square, python, ghIssue] Generated code triggers SyntaxWarning`

## Troubleshooting

### "Linear API token not set" error
- Run **Linear Sync → Setup API Token** again
- Make sure you pasted the full token

### "Linear API error" message
- Check that your API token is still valid at linear.app/settings/api
- Ensure you have access to the Linear workspace (buildwithfern)

### No data appearing on a sheet
- Verify that specific project has issues with "ghIssue" in the title
- Check the Apps Script logs: **Extensions → Apps Script → Execution log**
- The sheet may be created but empty if no matching issues exist

### Only some sheets updating
- Check the success message after refresh (shows count of successful/failed refreshes)
- Review Apps Script logs for specific error messages per customer
- Individual project API issues won't prevent other sheets from updating

### Chart not updating
- Click **Linear Sync → Refresh All Customers** to force refresh
- Check if the data table updated but chart didn't (might need to delete chart manually from the sheet)

### Permission warnings
- Google requires authorization for scripts that access external APIs
- Review permissions carefully - the script only accesses Linear API and your sheet

## Customization Options

### Adding More Projects

Edit the `PROJECTS` constant in the script:

```javascript
const PROJECTS = {
  'Square': '857fa6e14378',
  'Intercom': '9eb5c238a630',
  'Elevenlabs': 'f2059a25931a',
  'Cohere': 'ac784cf01e1d',
  'NewCustomer': 'project-id-here'  // Add new entry
};
```

To find a project ID:
1. Go to the Linear project page
2. Copy the ID from the URL: `linear.app/buildwithfern/project/NAME-{PROJECT_ID}/issues`

### Changing Filter Criteria

Edit the `filterGhIssues` function to change how issues are identified:

```javascript
function filterGhIssues(issues) {
  return issues.filter(issue =>
    issue.title.toLowerCase().includes('ghissue')  // Modify this condition
  );
}
```

Examples:
- Match specific label: `issue.labels.some(l => l.name === 'github-sync')`
- Match title prefix: `issue.title.startsWith('[Square')`
- Multiple conditions: `issue.title.includes('ghIssue') && issue.priority === 1`

### Auto-Refresh (Optional)

To refresh all customers automatically on a schedule:

1. In Apps Script editor, click **Triggers** (⏰ icon on left)
2. Click **+ Add Trigger**
3. Configure:
   - Function: `refreshAllCustomers`
   - Event source: `Time-driven`
   - Type: `Hour timer` or `Day timer`
   - Interval: Your preference (e.g., every hour, daily at 9 AM)
4. Click **Save**

**Note**: This will consume Google Apps Script quota more quickly, but all 4 customers will be refreshed in a single execution.

## Technical Details

### API Rate Limits

- Linear API: 1,500 requests per hour
- This script makes 1 request per refresh
- Safe to refresh multiple times per minute if needed

### Data Freshness

- Data is only as fresh as your last refresh
- Linear updates are not pushed automatically
- Consider hourly auto-refresh for near real-time data

### Performance

- Typical refresh time: 2-5 seconds
- Handles up to 1,000 issues efficiently
- Chart renders instantly after data load

## Support

For issues with:
- **The script itself**: Check the Apps Script execution logs
- **Linear API access**: Verify your token at linear.app/settings/api
- **Google Sheets permissions**: Review authorized apps in Google Account settings

## Version History

- **v1.0** (2025-10-22): Initial implementation with multi-project support
  - Square, Intercom, Elevenlabs, Cohere projects
  - GitHub issue filtering
  - Auto-refreshing burndown chart
  - Project selector dropdown
