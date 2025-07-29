// Background script for Scroll Limiter extension

// Initialize storage with default values if not already set
function initializeStorage() {
  chrome.storage.sync.get(['scrollThreshold', 'targetedSites', 'timeRestrictions', 'initialized'], function(result) {
    if (!result.initialized) {
      chrome.storage.sync.set({
        scrollThreshold: 5000, // Default threshold in pixels
        targetedSites: [], // Empty array means all sites
        timeRestrictions: {
          enabled: false,
          afterHour: 23, // 11 PM
          beforeHour: 6  // 6 AM
        },
        initialized: true
      });
    }
  });

  // Initialize local storage for statistics
  chrome.storage.local.get(['statistics', 'statsInitialized'], function(result) {
    if (!result.statsInitialized) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      chrome.storage.local.set({
        statistics: {
          daily: {
            date: today,
            scrollTime: 0,
            scrollDistance: 0,
            thresholdExceeded: 0,
            blockingTriggered: 0,
            siteData: {}
          },
          weekly: {},
          monthly: {},
          yearly: {},
          siteRanking: {}
        },
        statsInitialized: true
      });
    }
  });
}

// Update statistics with data from content script
function updateStatistics(data) {
  chrome.storage.local.get('statistics', function(result) {
    const stats = result.statistics;
    const today = new Date().toISOString().split('T')[0];

    // Check if we need to reset daily statistics (new day)
    if (stats.daily.date !== today) {
      // Archive yesterday's data before resetting
      archiveDailyStatistics(stats);

      // Reset daily statistics
      stats.daily = {
        date: today,
        scrollTime: 0,
        scrollDistance: 0,
        thresholdExceeded: 0,
        blockingTriggered: 0,
        siteData: {}
      };
    }

    // Update daily statistics
    stats.daily.scrollTime += data.scrollTime || 0;
    stats.daily.scrollDistance += data.scrollDistance || 0;
    stats.daily.thresholdExceeded += data.thresholdExceeded || 0;
    stats.daily.blockingTriggered += data.blockingTriggered || 0;

    // Update site-specific data
    if (data.site) {
      if (!stats.daily.siteData[data.site]) {
        stats.daily.siteData[data.site] = {
          scrollTime: 0,
          scrollDistance: 0,
          thresholdExceeded: 0,
          blockingTriggered: 0
        };
      }

      stats.daily.siteData[data.site].scrollTime += data.scrollTime || 0;
      stats.daily.siteData[data.site].scrollDistance += data.scrollDistance || 0;
      stats.daily.siteData[data.site].thresholdExceeded += data.thresholdExceeded || 0;
      stats.daily.siteData[data.site].blockingTriggered += data.blockingTriggered || 0;

      // Update site ranking
      if (!stats.siteRanking[data.site]) {
        stats.siteRanking[data.site] = {
          scrollTime: 0,
          scrollDistance: 0
        };
      }

      stats.siteRanking[data.site].scrollTime += data.scrollTime || 0;
      stats.siteRanking[data.site].scrollDistance += data.scrollDistance || 0;
    }

    // Save updated statistics
    chrome.storage.local.set({ statistics: stats });
  });
}

// Archive daily statistics to weekly, monthly, and yearly aggregates
function archiveDailyStatistics(stats) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const weekNum = getWeekNumber(yesterday);
  const month = yesterday.getMonth() + 1; // 1-12
  const year = yesterday.getFullYear();

  // Weekly statistics
  const weekKey = `${year}-W${weekNum}`;
  if (!stats.weekly[weekKey]) {
    stats.weekly[weekKey] = {
      scrollTime: 0,
      scrollDistance: 0,
      thresholdExceeded: 0,
      blockingTriggered: 0,
      days: 0
    };
  }

  stats.weekly[weekKey].scrollTime += stats.daily.scrollTime;
  stats.weekly[weekKey].scrollDistance += stats.daily.scrollDistance;
  stats.weekly[weekKey].thresholdExceeded += stats.daily.thresholdExceeded;
  stats.weekly[weekKey].blockingTriggered += stats.daily.blockingTriggered;
  stats.weekly[weekKey].days += 1;

  // Monthly statistics
  const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
  if (!stats.monthly[monthKey]) {
    stats.monthly[monthKey] = {
      scrollTime: 0,
      scrollDistance: 0,
      thresholdExceeded: 0,
      blockingTriggered: 0,
      days: 0
    };
  }

  stats.monthly[monthKey].scrollTime += stats.daily.scrollTime;
  stats.monthly[monthKey].scrollDistance += stats.daily.scrollDistance;
  stats.monthly[monthKey].thresholdExceeded += stats.daily.thresholdExceeded;
  stats.monthly[monthKey].blockingTriggered += stats.daily.blockingTriggered;
  stats.monthly[monthKey].days += 1;

  // Yearly statistics
  const yearKey = year.toString();
  if (!stats.yearly[yearKey]) {
    stats.yearly[yearKey] = {
      scrollTime: 0,
      scrollDistance: 0,
      thresholdExceeded: 0,
      blockingTriggered: 0,
      days: 0
    };
  }

  stats.yearly[yearKey].scrollTime += stats.daily.scrollTime;
  stats.yearly[yearKey].scrollDistance += stats.daily.scrollDistance;
  stats.yearly[yearKey].thresholdExceeded += stats.daily.thresholdExceeded;
  stats.yearly[yearKey].blockingTriggered += stats.daily.blockingTriggered;
  stats.yearly[yearKey].days += 1;

  // Archive daily data with date as key for historical reference
  stats[yesterdayStr] = stats.daily;
}

// Get the week number for a given date
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Set up alarms for periodic tasks
function setupAlarms() {
  // Daily alarm to check and reset statistics at midnight
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60 // Daily
  });
}

// Get timestamp for next midnight
function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Tomorrow
    0, 0, 0 // Midnight (00:00:00)
  );
  return midnight.getTime();
}

// Handle alarms
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'dailyReset') {
    // Check and reset daily statistics if needed
    chrome.storage.local.get('statistics', function(result) {
      const stats = result.statistics;
      const today = new Date().toISOString().split('T')[0];

      if (stats.daily.date !== today) {
        archiveDailyStatistics(stats);

        // Reset daily statistics
        stats.daily = {
          date: today,
          scrollTime: 0,
          scrollDistance: 0,
          thresholdExceeded: 0,
          blockingTriggered: 0,
          siteData: {}
        };

        chrome.storage.local.set({ statistics: stats });
      }
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateStatistics') {
    updateStatistics(message.data);
    sendResponse({ success: true });
  } else if (message.action === 'getStatistics') {
    chrome.storage.local.get('statistics', function(result) {
      sendResponse({ statistics: result.statistics });
    });
    return true; // Required for async sendResponse
  } else if (message.action === 'resetStatistics') {
    resetStatistics(message.type);
    sendResponse({ success: true });
  } else if (message.action === 'getSettings') {
    chrome.storage.sync.get(['scrollThreshold', 'targetedSites', 'timeRestrictions'], function(result) {
      sendResponse({ settings: result });
    });
    return true; // Required for async sendResponse
  } else if (message.action === 'ping') {
    // This is just to wake up the service worker
    sendResponse({ success: true });
  } else if (message.action === 'languageChanged') {
    // Handle language change
    console.log('Language changed to:', message.language);
    // Store the language preference
    chrome.storage.sync.get('appearance', function(result) {
      const appearance = result.appearance || {};
      appearance.language = message.language;
      chrome.storage.sync.set({ appearance: appearance }, function() {
        console.log('Language preference saved');
        sendResponse({ success: true });
      });
    });
    return true; // Required for async sendResponse
  }
});

// Reset statistics by type (daily, weekly, monthly, yearly, all)
function resetStatistics(type) {
  chrome.storage.local.get('statistics', function(result) {
    const stats = result.statistics;
    const today = new Date().toISOString().split('T')[0];

    if (type === 'daily' || type === 'all') {
      stats.daily = {
        date: today,
        scrollTime: 0,
        scrollDistance: 0,
        thresholdExceeded: 0,
        blockingTriggered: 0,
        siteData: {}
      };
    }

    if (type === 'weekly' || type === 'all') {
      stats.weekly = {};
    }

    if (type === 'monthly' || type === 'all') {
      stats.monthly = {};
    }

    if (type === 'yearly' || type === 'all') {
      stats.yearly = {};
    }

    if (type === 'sites' || type === 'all') {
      stats.siteRanking = {};
    }

    chrome.storage.local.set({ statistics: stats });
  });
}

// Initialize when the extension is installed or updated
chrome.runtime.onInstalled.addListener(function(details) {
  initializeStorage();
  setupAlarms();
});

// Initialize when the background script starts
initializeStorage();
setupAlarms();
