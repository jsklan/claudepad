/**
 * Linear Burndown Chart Script
 * Auto-refreshes issue data from Linear projects
 * Supports multiple customer projects with dropdown selector
 */

// Project configuration
const PROJECTS = {
  'Square': '857fa6e14378',
  'Intercom': '9eb5c238a630',
  'Elevenlabs': 'f2059a25931a',
  'Cohere': 'ac784cf01e1d'
};

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const PROPERTY_KEY = 'LINEAR_API_TOKEN';

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Linear Sync')
    .addItem('Refresh All Customers', 'refreshAllCustomers')
    .addItem('Setup API Token', 'setupLinearToken')
    .addToUi();
}

/**
 * Prompts user to set up Linear API token
 */
function setupLinearToken() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Linear API Token',
    'Enter your Linear API token (from linear.app/settings/api):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    const token = response.getResponseText().trim();
    PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY, token);
    ui.alert('Success', 'Linear API token saved!', ui.ButtonSet.OK);
  }
}

/**
 * Gets stored Linear API token
 */
function getLinearToken() {
  const token = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY);
  if (!token) {
    throw new Error('Linear API token not set. Run "Linear Sync → Setup API Token" first.');
  }
  return token;
}

/**
 * Makes GraphQL request to Linear API
 */
function queryLinear(query, variables = {}) {
  const token = getLinearToken();

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': token
    },
    payload: JSON.stringify({ query, variables }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(LINEAR_API_URL, options);
  const json = JSON.parse(response.getContentText());

  if (json.errors) {
    throw new Error('Linear API error: ' + JSON.stringify(json.errors));
  }

  return json.data;
}

/**
 * Fetches issues for a specific project
 */
function fetchProjectIssues(projectId) {
  const query = `
    query($projectId: String!) {
      project(id: $projectId) {
        id
        name
        issues {
          nodes {
            id
            identifier
            title
            state {
              name
              type
            }
            createdAt
            completedAt
          }
        }
      }
    }
  `;

  const data = queryLinear(query, { projectId });
  return data.project;
}

/**
 * Filters issues for those with "ghIssue" in title
 */
function filterGhIssues(issues) {
  return issues.filter(issue =>
    issue.title.toLowerCase().includes('ghissue')
  );
}

/**
 * Prepares burndown data from issues
 */
function prepareBurndownData(issues) {
  // Sort by creation date
  const sorted = issues.sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  const data = [];
  let totalCreated = 0;
  let totalCompleted = 0;

  // Track daily changes
  const dateMap = new Map();

  sorted.forEach(issue => {
    const createdDate = new Date(issue.createdAt).toDateString();

    if (!dateMap.has(createdDate)) {
      dateMap.set(createdDate, { created: 0, completed: 0 });
    }

    dateMap.get(createdDate).created++;

    if (issue.completedAt) {
      const completedDate = new Date(issue.completedAt).toDateString();
      if (!dateMap.has(completedDate)) {
        dateMap.set(completedDate, { created: 0, completed: 0 });
      }
      dateMap.get(completedDate).completed++;
    }
  });

  // Build cumulative burndown data
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
    new Date(a) - new Date(b)
  );

  sortedDates.forEach(dateStr => {
    const stats = dateMap.get(dateStr);
    totalCreated += stats.created;
    totalCompleted += stats.completed;
    const remaining = totalCreated - totalCompleted;

    data.push({
      date: new Date(dateStr),
      created: totalCreated,
      completed: totalCompleted,
      remaining: remaining
    });
  });

  // Add current date if not present
  const today = new Date().toDateString();
  if (data.length === 0 || data[data.length - 1].date.toDateString() !== today) {
    data.push({
      date: new Date(),
      created: totalCreated,
      completed: totalCompleted,
      remaining: totalCreated - totalCompleted
    });
  }

  return data;
}


/**
 * Refreshes all customer sheets
 */
function refreshAllCustomers() {
  const projectNames = Object.keys(PROJECTS);

  SpreadsheetApp.getActiveSpreadsheet().toast('Fetching data for all customers...', 'Loading', -1);

  let successCount = 0;
  let errorCount = 0;

  projectNames.forEach(projectName => {
    try {
      refreshCustomerSheet(projectName);
      successCount++;
    } catch (error) {
      errorCount++;
      Logger.log(`Error refreshing ${projectName}: ${error.message}`);
    }
  });

  const message = `Refreshed ${successCount} customer(s)` + (errorCount > 0 ? `, ${errorCount} failed` : '');
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Complete', 3);
}

/**
 * Refreshes a single customer sheet
 */
function refreshCustomerSheet(projectName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projectId = PROJECTS[projectName];

  if (!projectId) {
    throw new Error(`Invalid project: ${projectName}`);
  }

  // Get or create sheet for this customer
  let sheet = ss.getSheetByName(projectName);
  if (!sheet) {
    sheet = ss.insertSheet(projectName);
  }

  try {
    // Fetch project data
    const project = fetchProjectIssues(projectId);
    const allIssues = project.issues.nodes;
    const ghIssues = filterGhIssues(allIssues);

    // Prepare burndown data
    const burndownData = prepareBurndownData(ghIssues);

    // Clear existing data
    sheet.clear();

    // Add title
    sheet.getRange('A1').setValue(`${projectName} - GitHub Issue Burndown`)
      .setFontSize(14)
      .setFontWeight('bold');

    // Write headers
    sheet.getRange('A3:D3').setValues([[
      'Date',
      'Total Created',
      'Total Completed',
      'Remaining'
    ]]).setFontWeight('bold');

    // Write data
    if (burndownData.length > 0) {
      const dataRows = burndownData.map(row => [
        row.date,
        row.created,
        row.completed,
        row.remaining
      ]);

      sheet.getRange(4, 1, dataRows.length, 4).setValues(dataRows);

      // Format date column
      sheet.getRange(4, 1, dataRows.length, 1).setNumberFormat('yyyy-mm-dd');
    }

    // Create or update chart
    createBurndownChart(sheet, projectName, burndownData.length);

    // Add summary stats
    if (burndownData.length > 0) {
      const lastRow = burndownData[burndownData.length - 1];
      sheet.getRange('F3').setValue('Summary:').setFontWeight('bold');
      sheet.getRange('F4:G7').setValues([
        ['Total Issues:', lastRow.created],
        ['Completed:', lastRow.completed],
        ['Remaining:', lastRow.remaining],
        ['Last Updated:', new Date()]
      ]);

      // Format summary
      sheet.getRange('F4:F7').setFontWeight('bold');
      sheet.getRange('G7').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }

    // Auto-resize columns
    sheet.autoResizeColumns(1, 7);

  } catch (error) {
    throw new Error(`Failed to refresh ${projectName}: ${error.message}`);
  }
}


/**
 * Creates or updates the burndown chart
 */
function createBurndownChart(sheet, projectName, dataRows) {
  // Remove existing charts
  const charts = sheet.getCharts();
  charts.forEach(chart => sheet.removeChart(chart));

  if (dataRows === 0) return;

  // Create new chart
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange(3, 1, dataRows + 1, 1)) // Date column
    .addRange(sheet.getRange(3, 2, dataRows + 1, 1)) // Total Created
    .addRange(sheet.getRange(3, 3, dataRows + 1, 1)) // Total Completed
    .addRange(sheet.getRange(3, 4, dataRows + 1, 1)) // Remaining
    .setPosition(9, 1, 0, 0)
    .setOption('title', `${projectName} - GitHub Issue Burndown`)
    .setOption('width', 800)
    .setOption('height', 400)
    .setOption('hAxis', { title: 'Date', format: 'MMM d' })
    .setOption('vAxis', { title: 'Issue Count', minValue: 0 })
    .setOption('legend', { position: 'bottom' })
    .setOption('series', {
      0: { color: '#4285F4', lineWidth: 2 }, // Total Created - blue
      1: { color: '#34A853', lineWidth: 2 }, // Total Completed - green
      2: { color: '#EA4335', lineWidth: 3 }  // Remaining - red, thicker
    })
    .build();

  sheet.insertChart(chart);
}

/**
 * Initial setup function - creates all sheets and prompts for token
 */
function initialSetup() {
  setupLinearToken();
  refreshAllCustomers();
}
