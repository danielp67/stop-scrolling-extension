// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const periodButtons = document.querySelectorAll('.period-btn');

// Chart objects
let trendsChart = null;
let sitesChart = null;
let dailyChart = null;
let weeklyChart = null;
let monthlyChart = null;
let topSitesChart = null;

// Current selected period
let currentPeriod = 'week';

// Statistics data
let statisticsData = null;

// Initialize the report page
document.addEventListener('DOMContentLoaded', function() {
  // Set up tab switching
  setupTabs();

  // Set up period selector
  setupPeriodSelector();

  // Load statistics
  loadStatistics();
});

// Set up tab switching
function setupTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      // Refresh charts when tab is changed
      if (statisticsData) {
        refreshCharts(tabId);
      }
    });
  });
}

// Set up period selector
function setupPeriodSelector() {
  periodButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all period buttons
      periodButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Update current period
      currentPeriod = button.getAttribute('data-period');

      // Refresh overview charts
      if (statisticsData) {
        refreshOverviewCharts();
      }
    });
  });
}

// Load statistics from storage
function loadStatistics() {
  chrome.storage.local.get('statistics', function(result) {
    if (result.statistics) {
      statisticsData = result.statistics;

      // Initialize all charts and tables
      initializeCharts();
      populateTables();
    } else {
      // Show message if no data is available
      showNoDataMessage();
    }
  });
}

// Show message when no data is available
function showNoDataMessage() {
  const containers = document.querySelectorAll('.chart-container, table tbody');
  containers.forEach(container => {
    container.innerHTML = '<div class="no-data">No scrolling data available yet. Start browsing to collect data.</div>';
  });

  document.querySelectorAll('.stat-value').forEach(el => {
    el.textContent = '0';
  });

  // Style for no-data message
  const style = document.createElement('style');
  style.textContent = `
    .no-data {
      text-align: center;
      padding: 50px 20px;
      color: #777;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
}

// Initialize all charts
function initializeCharts() {
  initializeOverviewCharts();
  initializeDailyChart();
  initializeWeeklyChart();
  initializeMonthlyChart();
  initializeTopSitesChart();
}

// Initialize overview charts
function initializeOverviewCharts() {
  // Update summary statistics
  updateSummaryStatistics();

  // Initialize trends chart
  initializeTrendsChart();

  // Initialize sites chart
  initializeSitesChart();
}

// Update summary statistics based on selected period
function updateSummaryStatistics() {
  let totalScrollTime = 0;
  let totalScrollDistance = 0;
  let thresholdExceeded = 0;
  let blockingTriggered = 0;

  // Calculate totals based on selected period
  if (currentPeriod === 'week') {
    // Sum up data from the current week
    const weekData = getCurrentWeekData();
    if (weekData) {
      totalScrollTime = weekData.scrollTime;
      totalScrollDistance = weekData.scrollDistance;
      thresholdExceeded = weekData.thresholdExceeded;
      blockingTriggered = weekData.blockingTriggered;
    }
  } else if (currentPeriod === 'month') {
    // Sum up data from the current month
    const monthData = getCurrentMonthData();
    if (monthData) {
      totalScrollTime = monthData.scrollTime;
      totalScrollDistance = monthData.scrollDistance;
      thresholdExceeded = monthData.thresholdExceeded;
      blockingTriggered = monthData.blockingTriggered;
    }
  } else if (currentPeriod === 'year') {
    // Sum up data from the current year
    const yearData = getCurrentYearData();
    if (yearData) {
      totalScrollTime = yearData.scrollTime;
      totalScrollDistance = yearData.scrollDistance;
      thresholdExceeded = yearData.thresholdExceeded;
      blockingTriggered = yearData.blockingTriggered;
    }
  } else if (currentPeriod === 'all') {
    // Sum up all data
    // Daily data
    totalScrollTime += statisticsData.daily.scrollTime;
    totalScrollDistance += statisticsData.daily.scrollDistance;
    thresholdExceeded += statisticsData.daily.thresholdExceeded;
    blockingTriggered += statisticsData.daily.blockingTriggered;

    // Weekly data
    Object.values(statisticsData.weekly).forEach(week => {
      totalScrollTime += week.scrollTime;
      totalScrollDistance += week.scrollDistance;
      thresholdExceeded += week.thresholdExceeded;
      blockingTriggered += week.blockingTriggered;
    });

    // Monthly data
    Object.values(statisticsData.monthly).forEach(month => {
      // We don't add these to avoid double counting
      // (monthly data is derived from daily/weekly)
    });
  }

  // Update UI
  document.getElementById('totalScrollTime').textContent = Math.round(totalScrollTime / 60); // Convert to minutes
  document.getElementById('totalScrollDistance').textContent = Math.round(totalScrollDistance / 1000); // Convert to meters
  document.getElementById('thresholdExceededCount').textContent = thresholdExceeded;
  document.getElementById('blockingTriggeredCount').textContent = blockingTriggered;
}

// Get data for the current week
function getCurrentWeekData() {
  const now = new Date();
  const weekNum = getWeekNumber(now);
  const year = now.getFullYear();
  const weekKey = `${year}-W${weekNum}`;

  return statisticsData.weekly[weekKey];
}

// Get data for the current month
function getCurrentMonthData() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

  return statisticsData.monthly[monthKey];
}

// Get data for the current year
function getCurrentYearData() {
  const now = new Date();
  const year = now.getFullYear();
  const yearKey = year.toString();

  return statisticsData.yearly[yearKey];
}

// Get the week number for a given date
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Initialize trends chart
function initializeTrendsChart() {
  const ctx = document.getElementById('trendsChart').getContext('2d');

  // Destroy existing chart if it exists
  if (trendsChart) {
    trendsChart.destroy();
  }

  // Prepare data based on selected period
  let labels = [];
  let scrollTimeData = [];
  let scrollDistanceData = [];

  if (currentPeriod === 'week') {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      labels.push(formatDate(date, 'short'));

      // Get data for this day if available
      const dayData = statisticsData[dateStr] || { scrollTime: 0, scrollDistance: 0 };
      scrollTimeData.push(Math.round(dayData.scrollTime / 60)); // Convert to minutes
      scrollDistanceData.push(Math.round(dayData.scrollDistance / 1000)); // Convert to meters
    }
  } else if (currentPeriod === 'month') {
    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const weekKey = `${year}-W${weekNum}`;

      labels.push(`Week ${weekNum}`);

      // Get data for this week if available
      const weekData = statisticsData.weekly[weekKey] || { scrollTime: 0, scrollDistance: 0 };
      scrollTimeData.push(Math.round(weekData.scrollTime / 60)); // Convert to minutes
      scrollDistanceData.push(Math.round(weekData.scrollDistance / 1000)); // Convert to meters
    }
  } else if (currentPeriod === 'year' || currentPeriod === 'all') {
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1; // 1-12
      const year = date.getFullYear();
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      labels.push(formatDate(date, 'month'));

      // Get data for this month if available
      const monthData = statisticsData.monthly[monthKey] || { scrollTime: 0, scrollDistance: 0 };
      scrollTimeData.push(Math.round(monthData.scrollTime / 60)); // Convert to minutes
      scrollDistanceData.push(Math.round(monthData.scrollDistance / 1000)); // Convert to meters
    }
  }

  // Create chart
  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scroll Time (minutes)',
          data: scrollTimeData,
          borderColor: '#4285f4',
          backgroundColor: 'rgba(66, 133, 244, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Scroll Distance (meters)',
          data: scrollDistanceData,
          borderColor: '#34a853',
          backgroundColor: 'rgba(52, 168, 83, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Initialize sites chart
function initializeSitesChart() {
  const ctx = document.getElementById('sitesChart').getContext('2d');

  // Destroy existing chart if it exists
  if (sitesChart) {
    sitesChart.destroy();
  }

  // Get top sites by scroll time
  const topSites = getTopSites(5);

  // Prepare data
  const labels = topSites.map(site => site.domain);
  const scrollTimeData = topSites.map(site => Math.round(site.scrollTime / 60)); // Convert to minutes

  // Create chart
  sitesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scroll Time (minutes)',
          data: scrollTimeData,
          backgroundColor: [
            '#4285f4',
            '#ea4335',
            '#fbbc05',
            '#34a853',
            '#673ab7'
          ],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        }
      }
    }
  });
}

// Get top sites by scroll time
function getTopSites(limit) {
  const sites = [];

  // Process site ranking data
  if (statisticsData.siteRanking) {
    for (const [domain, data] of Object.entries(statisticsData.siteRanking)) {
      sites.push({
        domain,
        scrollTime: data.scrollTime,
        scrollDistance: data.scrollDistance
      });
    }
  }

  // Sort by scroll time (descending)
  sites.sort((a, b) => b.scrollTime - a.scrollTime);

  // Return top N sites
  return sites.slice(0, limit);
}

// Initialize daily chart
function initializeDailyChart() {
  const ctx = document.getElementById('dailyChart').getContext('2d');

  // Destroy existing chart if it exists
  if (dailyChart) {
    dailyChart.destroy();
  }

  // Prepare data for the last 14 days
  const labels = [];
  const scrollTimeData = [];
  const thresholdExceededData = [];

  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    labels.push(formatDate(date, 'short'));

    // Get data for this day if available
    const dayData = statisticsData[dateStr] || { scrollTime: 0, thresholdExceeded: 0 };
    scrollTimeData.push(Math.round(dayData.scrollTime / 60)); // Convert to minutes
    thresholdExceededData.push(dayData.thresholdExceeded);
  }

  // Create chart
  dailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scroll Time (minutes)',
          data: scrollTimeData,
          backgroundColor: '#4285f4',
          borderWidth: 0,
          order: 2
        },
        {
          label: 'Threshold Exceeded',
          data: thresholdExceededData,
          type: 'line',
          borderColor: '#ea4335',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#ea4335',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes / Count'
          }
        }
      }
    }
  });
}

// Initialize weekly chart
function initializeWeeklyChart() {
  const ctx = document.getElementById('weeklyChart').getContext('2d');

  // Destroy existing chart if it exists
  if (weeklyChart) {
    weeklyChart.destroy();
  }

  // Prepare data for the last 10 weeks
  const labels = [];
  const scrollTimeData = [];
  const dailyAverageData = [];

  // Get current week
  const now = new Date();
  const currentWeekNum = getWeekNumber(now);
  const currentYear = now.getFullYear();

  for (let i = 9; i >= 0; i--) {
    // Calculate week number by subtracting from current week
    let weekNum = currentWeekNum - i;
    let year = currentYear;

    // Handle year boundary
    if (weekNum <= 0) {
      weekNum += getWeeksInYear(year - 1);
      year -= 1;
    }

    const weekKey = `${year}-W${weekNum}`;
    labels.push(`Week ${weekNum}`);

    // Get data for this week if available
    const weekData = statisticsData.weekly[weekKey] || { scrollTime: 0, days: 0 };
    scrollTimeData.push(Math.round(weekData.scrollTime / 60)); // Convert to minutes

    // Calculate daily average (avoid division by zero)
    const dailyAverage = weekData.days > 0 ? Math.round((weekData.scrollTime / 60) / weekData.days) : 0;
    dailyAverageData.push(dailyAverage);
  }

  // Create chart
  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Scroll Time (minutes)',
          data: scrollTimeData,
          backgroundColor: '#4285f4',
          borderWidth: 0,
          order: 2
        },
        {
          label: 'Daily Average (minutes)',
          data: dailyAverageData,
          type: 'line',
          borderColor: '#fbbc05',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#fbbc05',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        }
      }
    }
  });
}

// Get number of weeks in a year
function getWeeksInYear(year) {
  const d = new Date(year, 11, 31);
  const week = getWeekNumber(d);
  return week === 1 ? getWeekNumber(new Date(year, 11, 24)) : week;
}

// Initialize monthly chart
function initializeMonthlyChart() {
  const ctx = document.getElementById('monthlyChart').getContext('2d');

  // Destroy existing chart if it exists
  if (monthlyChart) {
    monthlyChart.destroy();
  }

  // Prepare data for the last 12 months
  const labels = [];
  const scrollTimeData = [];
  const scrollDistanceData = [];

  // Get current month
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  for (let i = 11; i >= 0; i--) {
    // Calculate month by subtracting from current month
    let month = currentMonth - i;
    let year = currentYear;

    // Handle year boundary
    while (month < 0) {
      month += 12;
      year -= 1;
    }

    const date = new Date(year, month, 1);
    const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;

    labels.push(formatDate(date, 'month'));

    // Get data for this month if available
    const monthData = statisticsData.monthly[monthKey] || { scrollTime: 0, scrollDistance: 0 };
    scrollTimeData.push(Math.round(monthData.scrollTime / 60)); // Convert to minutes
    scrollDistanceData.push(Math.round(monthData.scrollDistance / 1000)); // Convert to meters
  }

  // Create chart
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scroll Time (minutes)',
          data: scrollTimeData,
          backgroundColor: '#4285f4',
          borderWidth: 0
        },
        {
          label: 'Scroll Distance (meters)',
          data: scrollDistanceData,
          backgroundColor: '#34a853',
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes / Meters'
          }
        }
      }
    }
  });
}

// Initialize top sites chart
function initializeTopSitesChart() {
  const ctx = document.getElementById('topSitesChart').getContext('2d');

  // Destroy existing chart if it exists
  if (topSitesChart) {
    topSitesChart.destroy();
  }

  // Get top 10 sites by scroll time
  const topSites = getTopSites(10);

  // Prepare data
  const labels = topSites.map(site => site.domain);
  const scrollTimeData = topSites.map(site => Math.round(site.scrollTime / 60)); // Convert to minutes
  const scrollDistanceData = topSites.map(site => Math.round(site.scrollDistance / 1000)); // Convert to meters

  // Create chart
  topSitesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Scroll Time (minutes)',
          data: scrollTimeData,
          backgroundColor: '#4285f4',
          borderWidth: 0
        },
        {
          label: 'Scroll Distance (meters)',
          data: scrollDistanceData,
          backgroundColor: '#34a853',
          borderWidth: 0
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes / Meters'
          }
        }
      }
    }
  });
}

// Populate tables with data
function populateTables() {
  populateDailyTable();
  populateWeeklyTable();
  populateMonthlyTable();
  populateSitesTable();
}

// Populate daily table
function populateDailyTable() {
  const tbody = document.querySelector('#dailyTable tbody');
  tbody.innerHTML = '';

  // Get last 30 days of data
  const days = [];

  // Add current day
  days.push({
    date: new Date(),
    data: statisticsData.daily
  });

  // Add previous days
  for (let i = 1; i <= 29; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (statisticsData[dateStr]) {
      days.push({
        date: date,
        data: statisticsData[dateStr]
      });
    }
  }

  // Sort by date (newest first)
  days.sort((a, b) => b.date - a.date);

  // Create table rows
  days.forEach(day => {
    const row = document.createElement('tr');

    // Format date
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(day.date);
    row.appendChild(dateCell);

    // Scroll time
    const timeCell = document.createElement('td');
    timeCell.textContent = Math.round(day.data.scrollTime / 60); // Convert to minutes
    row.appendChild(timeCell);

    // Scroll distance
    const distanceCell = document.createElement('td');
    distanceCell.textContent = Math.round(day.data.scrollDistance / 1000); // Convert to meters
    row.appendChild(distanceCell);

    // Threshold exceeded
    const thresholdCell = document.createElement('td');
    thresholdCell.textContent = day.data.thresholdExceeded || 0;
    row.appendChild(thresholdCell);

    // Blocking triggered
    const blockingCell = document.createElement('td');
    blockingCell.textContent = day.data.blockingTriggered || 0;
    row.appendChild(blockingCell);

    tbody.appendChild(row);
  });

  // If no data, show message
  if (days.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No daily data available yet.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#777';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

// Populate weekly table
function populateWeeklyTable() {
  const tbody = document.querySelector('#weeklyTable tbody');
  tbody.innerHTML = '';

  // Get weekly data
  const weeks = [];

  for (const [weekKey, data] of Object.entries(statisticsData.weekly)) {
    // Parse week key (format: YYYY-WNN)
    const [year, weekNum] = weekKey.split('-W');

    weeks.push({
      weekKey,
      year: parseInt(year),
      week: parseInt(weekNum),
      data
    });
  }

  // Sort by year and week (newest first)
  weeks.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  // Create table rows
  weeks.forEach(week => {
    const row = document.createElement('tr');

    // Week
    const weekCell = document.createElement('td');
    weekCell.textContent = `${week.year} - Week ${week.week}`;
    row.appendChild(weekCell);

    // Scroll time
    const timeCell = document.createElement('td');
    timeCell.textContent = Math.round(week.data.scrollTime / 60); // Convert to minutes
    row.appendChild(timeCell);

    // Scroll distance
    const distanceCell = document.createElement('td');
    distanceCell.textContent = Math.round(week.data.scrollDistance / 1000); // Convert to meters
    row.appendChild(distanceCell);

    // Daily average
    const averageCell = document.createElement('td');
    const dailyAverage = week.data.days > 0 ? Math.round((week.data.scrollTime / 60) / week.data.days) : 0;
    averageCell.textContent = dailyAverage;
    row.appendChild(averageCell);

    // Threshold exceeded
    const thresholdCell = document.createElement('td');
    thresholdCell.textContent = week.data.thresholdExceeded || 0;
    row.appendChild(thresholdCell);

    tbody.appendChild(row);
  });

  // If no data, show message
  if (weeks.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No weekly data available yet.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#777';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

// Populate monthly table
function populateMonthlyTable() {
  const tbody = document.querySelector('#monthlyTable tbody');
  tbody.innerHTML = '';

  // Get monthly data
  const months = [];

  for (const [monthKey, data] of Object.entries(statisticsData.monthly)) {
    // Parse month key (format: YYYY-MM)
    const [year, month] = monthKey.split('-');

    months.push({
      monthKey,
      year: parseInt(year),
      month: parseInt(month),
      data
    });
  }

  // Sort by year and month (newest first)
  months.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Create table rows
  months.forEach(month => {
    const row = document.createElement('tr');

    // Month
    const monthCell = document.createElement('td');
    const date = new Date(month.year, month.month - 1, 1);
    monthCell.textContent = formatDate(date, 'month-year');
    row.appendChild(monthCell);

    // Scroll time
    const timeCell = document.createElement('td');
    timeCell.textContent = Math.round(month.data.scrollTime / 60); // Convert to minutes
    row.appendChild(timeCell);

    // Scroll distance
    const distanceCell = document.createElement('td');
    distanceCell.textContent = Math.round(month.data.scrollDistance / 1000); // Convert to meters
    row.appendChild(distanceCell);

    // Daily average
    const averageCell = document.createElement('td');
    const dailyAverage = month.data.days > 0 ? Math.round((month.data.scrollTime / 60) / month.data.days) : 0;
    averageCell.textContent = dailyAverage;
    row.appendChild(averageCell);

    // Threshold exceeded
    const thresholdCell = document.createElement('td');
    thresholdCell.textContent = month.data.thresholdExceeded || 0;
    row.appendChild(thresholdCell);

    tbody.appendChild(row);
  });

  // If no data, show message
  if (months.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No monthly data available yet.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#777';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

// Populate sites table
function populateSitesTable() {
  const tbody = document.querySelector('#sitesTable tbody');
  tbody.innerHTML = '';

  // Get site data
  const sites = getTopSites(100); // Get up to 100 sites

  // Create table rows
  sites.forEach(site => {
    const row = document.createElement('tr');

    // Site
    const siteCell = document.createElement('td');
    siteCell.textContent = site.domain;
    row.appendChild(siteCell);

    // Scroll time
    const timeCell = document.createElement('td');
    timeCell.textContent = Math.round(site.scrollTime / 60); // Convert to minutes
    row.appendChild(timeCell);

    // Scroll distance
    const distanceCell = document.createElement('td');
    distanceCell.textContent = Math.round(site.scrollDistance / 1000); // Convert to meters
    row.appendChild(distanceCell);

    // Threshold exceeded and blocking triggered
    // These are not tracked per site in our current data model, so we'll leave them empty
    const thresholdCell = document.createElement('td');
    thresholdCell.textContent = '-';
    row.appendChild(thresholdCell);

    const blockingCell = document.createElement('td');
    blockingCell.textContent = '-';
    row.appendChild(blockingCell);

    tbody.appendChild(row);
  });

  // If no data, show message
  if (sites.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No site data available yet.';
    cell.style.textAlign = 'center';
    cell.style.padding = '20px';
    cell.style.color = '#777';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

// Refresh charts when tab is changed
function refreshCharts(tabId) {
  switch (tabId) {
    case 'overview':
      refreshOverviewCharts();
      break;
    case 'daily':
      initializeDailyChart();
      break;
    case 'weekly':
      initializeWeeklyChart();
      break;
    case 'monthly':
      initializeMonthlyChart();
      break;
    case 'sites':
      initializeTopSitesChart();
      break;
  }
}

// Refresh overview charts
function refreshOverviewCharts() {
  updateSummaryStatistics();
  initializeTrendsChart();
  initializeSitesChart();
}

// Format date for display
function formatDate(date, format = 'full') {
  const options = {
    full: { year: 'numeric', month: 'long', day: 'numeric' },
    short: { month: 'short', day: 'numeric' },
    month: { month: 'short' },
    'month-year': { year: 'numeric', month: 'long' }
  };

  return date.toLocaleDateString(undefined, options[format]);
}
