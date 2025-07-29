// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValue = document.getElementById('thresholdValue');
const timeRestrictionToggle = document.getElementById('timeRestrictionToggle');
const timeSettings = document.getElementById('timeSettings');
const afterHourSelect = document.getElementById('afterHour');
const beforeHourSelect = document.getElementById('beforeHour');
const siteInput = document.getElementById('siteInput');
const addSiteBtn = document.getElementById('addSiteBtn');
const siteList = document.getElementById('siteList');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const moreOptionsBtn = document.getElementById('moreOptionsBtn');
const resetBtn = document.getElementById('resetBtn');
const viewReportBtn = document.getElementById('viewReportBtn');
const todayTimeElement = document.getElementById('todayTime');
const todayDistanceElement = document.getElementById('todayDistance');
const sessionTimeElement = document.getElementById('sessionTime');
const sessionDistanceElement = document.getElementById('sessionDistance');
const thresholdProgressElement = document.getElementById('thresholdProgress');
const statusTextElement = document.getElementById('statusText');

// Current settings and statistics
let currentSettings = {
  scrollThreshold: 5000,
  targetedSites: [],
  timeRestrictions: {
    enabled: false,
    afterHour: 23,
    beforeHour: 6
  },
  appearance: {
    language: 'en',
    darkMode: false,
    useSystemTheme: true
  }
};

let currentStatistics = {
  daily: {
    scrollTime: 0,
    scrollDistance: 0,
    thresholdExceeded: 0,
    blockingTriggered: 0
  },
  session: {
    scrollTime: 0,
    scrollDistance: 0,
    activeMode: 0
  }
};

// Replace i18n message placeholders
function replaceI18nMessages() {
  // Process all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue && node.nodeValue.includes('__MSG_')) {
      const matches = node.nodeValue.match(/__MSG_(\w+)__/g);
      if (matches) {
        let newValue = node.nodeValue;
        matches.forEach(match => {
          const messageName = match.replace(/__MSG_(\w+)__/, '$1');
          const translation = chrome.i18n.getMessage(messageName);
          if (translation) {
            newValue = newValue.replace(match, translation);
          }
        });
        node.nodeValue = newValue;
      }
    }
  }

  // Check for message placeholders in attributes
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    // Check attributes like title, placeholder, etc.
    ['title', 'placeholder', 'alt', 'aria-label'].forEach(attr => {
      if (element.hasAttribute(attr)) {
        const attrValue = element.getAttribute(attr);
        if (attrValue && attrValue.includes('__MSG_')) {
          const matches = attrValue.match(/__MSG_(\w+)__/g);
          if (matches) {
            let newValue = attrValue;
            matches.forEach(match => {
              const messageName = match.replace(/__MSG_(\w+)__/, '$1');
              const translation = chrome.i18n.getMessage(messageName);
              if (translation) {
                newValue = newValue.replace(match, translation);
              }
            });
            element.setAttribute(attr, newValue);
          }
        }
      }
    });
  });

  // Update document title
  if (document.title && document.title.includes('__MSG_')) {
    const matches = document.title.match(/__MSG_(\w+)__/g);
    if (matches) {
      let newTitle = document.title;
      matches.forEach(match => {
        const messageName = match.replace(/__MSG_(\w+)__/, '$1');
        const translation = chrome.i18n.getMessage(messageName);
        if (translation) {
          newTitle = newTitle.replace(match, translation);
        }
      });
      document.title = newTitle;
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
  // Check if we have a language override from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const langOverride = urlParams.get('lang');

  if (langOverride) {
    // Override Chrome's i18n.getUILanguage to use our specified language
    const originalGetUILanguage = chrome.i18n.getUILanguage;
    chrome.i18n.getUILanguage = function() {
      return langOverride;
    };
  }

  // Replace i18n messages immediately to avoid showing placeholders
  replaceI18nMessages();

  // Set up tab switching
  setupTabs();

  // Load settings and statistics
  loadSettings();
  loadStatistics();

  // Set up event listeners
  setupEventListeners();

  // Get current tab statistics
  getCurrentTabStatistics();
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
    });
  });
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['scrollThreshold', 'targetedSites', 'timeRestrictions', 'appearance'], function(result) {
    if (result.scrollThreshold) {
      currentSettings.scrollThreshold = result.scrollThreshold;
      thresholdSlider.value = result.scrollThreshold;
      thresholdValue.textContent = result.scrollThreshold;
    }

    if (result.targetedSites) {
      currentSettings.targetedSites = result.targetedSites;
      renderSiteList();
    }

    if (result.timeRestrictions) {
      currentSettings.timeRestrictions = result.timeRestrictions;
      timeRestrictionToggle.checked = result.timeRestrictions.enabled;
      afterHourSelect.value = result.timeRestrictions.afterHour;
      beforeHourSelect.value = result.timeRestrictions.beforeHour;

      if (result.timeRestrictions.enabled) {
        timeSettings.style.display = 'block';
      }
    }

    if (result.appearance) {
      currentSettings.appearance = result.appearance;

      // Apply language preference if set
      if (currentSettings.appearance.language) {
        // Override Chrome's i18n.getUILanguage to use our specified language
        const originalGetUILanguage = chrome.i18n.getUILanguage;
        chrome.i18n.getUILanguage = function() {
          return currentSettings.appearance.language;
        };

        // Re-apply i18n messages with the new language
        replaceI18nMessages();
      }

      // Apply dark mode if enabled or check system preference
      if (currentSettings.appearance.useSystemTheme) {
        checkSystemThemePreference();
      } else if (currentSettings.appearance.darkMode) {
        applyDarkMode(true);
      }
    } else {
      // If no appearance settings, check system preference by default
      checkSystemThemePreference();
    }
  });
}

// Check system theme preference
function checkSystemThemePreference() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyDarkMode(true);
  } else {
    applyDarkMode(false);
  }
}

// Apply dark mode
function applyDarkMode(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');

    // Update progress bar colors for dark mode
    if (thresholdProgressElement) {
      const activeMode = currentStatistics.session.activeMode;
      switch(activeMode) {
        case 0:
          thresholdProgressElement.style.backgroundColor = "#1a73e8"; // Dark mode blue
          break;
        case 1:
          thresholdProgressElement.style.backgroundColor = "#c79a05"; // Dark mode yellow
          break;
        case 2:
          thresholdProgressElement.style.backgroundColor = "#d68100"; // Dark mode orange
          break;
        case 3:
          thresholdProgressElement.style.backgroundColor = "#cf6679"; // Dark mode red
          break;
      }
    }
  } else {
    document.documentElement.removeAttribute('data-theme');

    // Restore progress bar colors for light mode
    if (thresholdProgressElement) {
      const activeMode = currentStatistics.session.activeMode;
      switch(activeMode) {
        case 0:
          thresholdProgressElement.style.backgroundColor = "#4285f4"; // Light mode blue
          break;
        case 1:
          thresholdProgressElement.style.backgroundColor = "#fbbc05"; // Light mode yellow
          break;
        case 2:
          thresholdProgressElement.style.backgroundColor = "#ff9800"; // Light mode orange
          break;
        case 3:
          thresholdProgressElement.style.backgroundColor = "#f44336"; // Light mode red
          break;
      }
    }
  }
}

// Load statistics from storage
function loadStatistics() {
  chrome.storage.local.get('statistics', function(result) {
    if (result.statistics && result.statistics.daily) {
      currentStatistics.daily = result.statistics.daily;

      // Update UI with daily statistics
      updateStatisticsUI();
    }
  });
}

// Get current tab statistics
function getCurrentTabStatistics() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      // Check if the tab URL is one where content scripts can run
      const url = tabs[0].url || '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatistics'}, function(response) {
          if (chrome.runtime.lastError) {
            // Handle the error silently - content script might not be loaded yet
            console.log('Could not connect to content script:', chrome.runtime.lastError.message);
            // Still update UI with default values
            updateSessionUI();
            updateInterventionStatus();
            return;
          }

          if (response) {
            currentStatistics.session.scrollTime = response.scrollTime || 0;
            currentStatistics.session.scrollDistance = response.scrollDistance || 0;
            currentStatistics.session.activeMode = response.activeMode || 0;

            // Update session statistics in UI
            updateSessionUI();

            // Update intervention status
            updateInterventionStatus();
          }
        });
      } else {
        // For URLs where content scripts don't run, just update UI with default values
        updateSessionUI();
        updateInterventionStatus();
      }
    }
  });
}

// Update statistics UI
function updateStatisticsUI() {
  // Convert seconds to minutes for display
  const timeInMinutes = Math.round(currentStatistics.daily.scrollTime / 60);
  todayTimeElement.textContent = timeInMinutes;

  // Convert pixels to meters for display (rough approximation)
  const distanceInMeters = Math.round(currentStatistics.daily.scrollDistance / 1000);
  todayDistanceElement.textContent = distanceInMeters;
}

// Update session UI
function updateSessionUI() {
  // Convert seconds to minutes for display
  const timeInMinutes = Math.round(currentStatistics.session.scrollTime / 60);
  sessionTimeElement.textContent = timeInMinutes;

  // Convert pixels to meters for display
  const distanceInMeters = Math.round(currentStatistics.session.scrollDistance / 1000);
  sessionDistanceElement.textContent = distanceInMeters;
}

// Update intervention status
function updateInterventionStatus() {
  const threshold = currentSettings.scrollThreshold;
  const scrollDistance = currentStatistics.session.scrollDistance;
  const activeMode = currentStatistics.session.activeMode;

  // Calculate progress percentage
  let progressPercentage = (scrollDistance / threshold) * 100;
  progressPercentage = Math.min(progressPercentage, 100); // Cap at 100%

  // Update progress bar
  thresholdProgressElement.style.width = `${progressPercentage}%`;

  // Check if dark mode is active
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  // Update status text based on active mode
  switch(activeMode) {
    case 0:
      statusTextElement.textContent = chrome.i18n.getMessage("noInterventionActive");
      thresholdProgressElement.style.backgroundColor = isDarkMode ? "#1a73e8" : "#4285f4";
      break;
    case 1:
      statusTextElement.textContent = chrome.i18n.getMessage("level1Title");
      thresholdProgressElement.style.backgroundColor = isDarkMode ? "#c79a05" : "#fbbc05";
      break;
    case 2:
      statusTextElement.textContent = chrome.i18n.getMessage("level2Title");
      thresholdProgressElement.style.backgroundColor = isDarkMode ? "#d68100" : "#ff9800";
      break;
    case 3:
      statusTextElement.textContent = chrome.i18n.getMessage("level3Title");
      thresholdProgressElement.style.backgroundColor = isDarkMode ? "#cf6679" : "#f44336";
      break;
  }
}

// Render site list
function renderSiteList() {
  siteList.innerHTML = '';

  currentSettings.targetedSites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';

    const siteName = document.createElement('span');
    siteName.textContent = site;

    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      removeSite(site);
    });

    siteItem.appendChild(siteName);
    siteItem.appendChild(removeButton);
    siteList.appendChild(siteItem);
  });
}

// Remove site from list
function removeSite(site) {
  currentSettings.targetedSites = currentSettings.targetedSites.filter(s => s !== site);
  renderSiteList();
}

// Set up event listeners
function setupEventListeners() {
  // Threshold slider
  thresholdSlider.addEventListener('input', function() {
    thresholdValue.textContent = this.value;
  });

  // Time restriction toggle
  timeRestrictionToggle.addEventListener('change', function() {
    timeSettings.style.display = this.checked ? 'block' : 'none';
  });

  // Add site button
  addSiteBtn.addEventListener('click', function() {
    const site = siteInput.value.trim();
    if (site && !currentSettings.targetedSites.includes(site)) {
      currentSettings.targetedSites.push(site);
      renderSiteList();
      siteInput.value = '';
    }
  });

  // Save settings button
  saveSettingsBtn.addEventListener('click', function() {
    saveSettings();
  });

  // Reset button
  resetBtn.addEventListener('click', function() {
    resetSession();
  });

  // View report button
  viewReportBtn.addEventListener('click', function() {
    openReportPage();
  });

  // More options button
  moreOptionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
}

// Save settings
function saveSettings() {
  // Update settings object
  currentSettings.scrollThreshold = parseInt(thresholdSlider.value);
  currentSettings.timeRestrictions.enabled = timeRestrictionToggle.checked;
  currentSettings.timeRestrictions.afterHour = parseInt(afterHourSelect.value);
  currentSettings.timeRestrictions.beforeHour = parseInt(beforeHourSelect.value);

  // Save to storage
  chrome.storage.sync.set({
    scrollThreshold: currentSettings.scrollThreshold,
    targetedSites: currentSettings.targetedSites,
    timeRestrictions: currentSettings.timeRestrictions,
    appearance: currentSettings.appearance
  }, function() {
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.textContent = 'Settings saved!';

    // Use theme-appropriate colors for success message
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    successMessage.style.backgroundColor = isDarkMode ? 'var(--status-success)' : '#4CAF50';
    successMessage.style.color = 'white';
    successMessage.style.padding = '10px';
    successMessage.style.textAlign = 'center';
    successMessage.style.position = 'fixed';
    successMessage.style.bottom = '10px';
    successMessage.style.left = '50%';
    successMessage.style.transform = 'translateX(-50%)';
    successMessage.style.borderRadius = '4px';
    successMessage.style.zIndex = '1000';

    document.body.appendChild(successMessage);

    // Remove after 2 seconds
    setTimeout(() => {
      document.body.removeChild(successMessage);
    }, 2000);

    // Update settings in active tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        // Only send messages to tabs where content scripts can run
        const url = tab.url || '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateSettings',
            settings: currentSettings
          }, function() {
            // Ignore any runtime errors that occur when the content script isn't available
            if (chrome.runtime.lastError) {
              console.log('Could not send settings to tab:', chrome.runtime.lastError.message);
            }
          });
        }
      });
    });
  });
}

// Reset session
function resetSession() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      // Check if the tab URL is one where content scripts can run
      const url = tabs[0].url || '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'resetInterventions'}, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Could not reset session:', chrome.runtime.lastError.message);
            // Still reset local statistics and update UI
            currentStatistics.session = {
              scrollTime: 0,
              scrollDistance: 0,
              activeMode: 0
            };
            updateSessionUI();
            updateInterventionStatus();
            return;
          }

          if (response && response.success) {
            // Reset session statistics
            currentStatistics.session = {
              scrollTime: 0,
              scrollDistance: 0,
              activeMode: 0
            };

            // Update UI
            updateSessionUI();
            updateInterventionStatus();
          }
        });
      } else {
        // For URLs where content scripts don't run, just reset local statistics and update UI
        currentStatistics.session = {
          scrollTime: 0,
          scrollDistance: 0,
          activeMode: 0
        };
        updateSessionUI();
        updateInterventionStatus();
      }
    }
  });
}

// Open report page
function openReportPage() {
  chrome.tabs.create({url: 'report.html'});
}
