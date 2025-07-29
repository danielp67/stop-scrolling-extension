// DOM Elements
const limitTypeSelect = document.getElementById('limitType');
const pixelsThresholdGroup = document.getElementById('pixelsThresholdGroup');
const metersThresholdGroup = document.getElementById('metersThresholdGroup');
const timeThresholdGroup = document.getElementById('timeThresholdGroup');
const scrollThresholdSlider = document.getElementById('scrollThreshold');
const scrollThresholdValue = document.getElementById('scrollThresholdValue');
const metersThresholdSlider = document.getElementById('metersThreshold');
const metersThresholdValue = document.getElementById('metersThresholdValue');
const timeThresholdSlider = document.getElementById('timeThreshold');
const timeThresholdValue = document.getElementById('timeThresholdValue');
const level1Multiplier = document.getElementById('level1Multiplier');
const level2Multiplier = document.getElementById('level2Multiplier');
const level3Multiplier = document.getElementById('level3Multiplier');
const timeRestrictionToggle = document.getElementById('timeRestrictionToggle');
const timeSettings = document.getElementById('timeSettings');
const afterHourSelect = document.getElementById('afterHour');
const beforeHourSelect = document.getElementById('beforeHour');
const restrictionLevelSelect = document.getElementById('restrictionLevel');
const siteInput = document.getElementById('siteInput');
const addSiteBtn = document.getElementById('addSiteBtn');
const siteList = document.getElementById('siteList');
const soundToggle = document.getElementById('soundToggle');
const visualToggle = document.getElementById('visualToggle');
const resetDailyBtn = document.getElementById('resetDailyBtn');
const resetWeeklyBtn = document.getElementById('resetWeeklyBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusMessage = document.getElementById('statusMessage');
const languageSelect = document.getElementById('languageSelect');
const darkModeToggle = document.getElementById('darkModeToggle');
const systemThemeToggle = document.getElementById('systemThemeToggle');

// Current settings
let currentSettings = {
  limitType: 'pixels', // 'pixels', 'meters', 'time', or 'both'
  scrollThreshold: 5000, // in pixels
  metersThreshold: 5, // in meters
  timeThreshold: 300, // in seconds
  levelMultipliers: {
    level1: 1,
    level2: 2,
    level3: 3
  },
  timeRestrictions: {
    enabled: false,
    afterHour: 23,
    beforeHour: 6,
    restrictionLevel: 3
  },
  targetedSites: [],
  notifications: {
    sound: true,
    visual: true
  },
  appearance: {
    language: 'en',
    darkMode: false,
    useSystemTheme: true
  }
};

// Initialize options page
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

  // Load settings first
  loadSettings();

  // Set up event listeners
  setupEventListeners();
});

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

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get([
    'limitType',
    'scrollThreshold',
    'metersThreshold',
    'timeThreshold',
    'levelMultipliers',
    'timeRestrictions',
    'targetedSites',
    'notifications',
    'appearance'
  ], function(result) {
    // Update current settings with stored values
    if (result.limitType) {
      currentSettings.limitType = result.limitType;
    }

    if (result.scrollThreshold) {
      currentSettings.scrollThreshold = result.scrollThreshold;
    }

    if (result.metersThreshold) {
      currentSettings.metersThreshold = result.metersThreshold;
    }

    if (result.timeThreshold) {
      currentSettings.timeThreshold = result.timeThreshold;
    }

    if (result.levelMultipliers) {
      currentSettings.levelMultipliers = result.levelMultipliers;
    }

    if (result.timeRestrictions) {
      currentSettings.timeRestrictions = result.timeRestrictions;
    }

    if (result.targetedSites) {
      currentSettings.targetedSites = result.targetedSites;
    }

    if (result.notifications) {
      currentSettings.notifications = result.notifications;
    }

    if (result.appearance) {
      currentSettings.appearance = result.appearance;
    }

    // Check system theme preference if enabled
    if (currentSettings.appearance.useSystemTheme) {
      checkSystemThemePreference();
    } else if (currentSettings.appearance.darkMode) {
      applyDarkMode(true);
    }

    // Update UI with loaded settings
    updateUI();

    // Replace i18n message placeholders after settings are loaded
    replaceI18nMessages();
  });
}

// Check system theme preference
function checkSystemThemePreference() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyDarkMode(true);
    currentSettings.appearance.darkMode = true;
  } else {
    applyDarkMode(false);
    currentSettings.appearance.darkMode = false;
  }
}

// Apply dark mode
function applyDarkMode(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Update UI with current settings
function updateUI() {
  // Limit type
  limitTypeSelect.value = currentSettings.limitType;

  // Show/hide threshold groups based on limit type
  updateThresholdVisibility(currentSettings.limitType);

  // Scroll threshold (pixels)
  scrollThresholdSlider.value = currentSettings.scrollThreshold;
  scrollThresholdValue.textContent = currentSettings.scrollThreshold;

  // Meters threshold
  metersThresholdSlider.value = currentSettings.metersThreshold;
  metersThresholdValue.textContent = currentSettings.metersThreshold;

  // Time threshold
  timeThresholdSlider.value = currentSettings.timeThreshold;
  const minutes = Math.floor(currentSettings.timeThreshold / 60);
  const seconds = currentSettings.timeThreshold % 60;
  timeThresholdValue.textContent = `${currentSettings.timeThreshold} seconds (${minutes}:${seconds.toString().padStart(2, '0')})`;

  // Level multipliers
  level1Multiplier.value = currentSettings.levelMultipliers.level1;
  level2Multiplier.value = currentSettings.levelMultipliers.level2;
  level3Multiplier.value = currentSettings.levelMultipliers.level3;

  // Time restrictions
  timeRestrictionToggle.checked = currentSettings.timeRestrictions.enabled;
  afterHourSelect.value = currentSettings.timeRestrictions.afterHour;
  beforeHourSelect.value = currentSettings.timeRestrictions.beforeHour;
  restrictionLevelSelect.value = currentSettings.timeRestrictions.restrictionLevel;

  // Show/hide time settings based on toggle
  timeSettings.style.display = currentSettings.timeRestrictions.enabled ? 'block' : 'none';

  // Targeted sites
  renderSiteList();

  // Notification settings
  soundToggle.checked = currentSettings.notifications.sound;
  visualToggle.checked = currentSettings.notifications.visual;

  // Appearance settings
  // Set language dropdown to match the actual language being used by Chrome's i18n system
  const currentUILanguage = chrome.i18n.getUILanguage();
  // Check if the UI language is available in our dropdown
  const languageOptions = Array.from(languageSelect.options).map(option => option.value);
  if (languageOptions.includes(currentUILanguage)) {
    languageSelect.value = currentUILanguage;
    currentSettings.appearance.language = currentUILanguage;
  } else {
    languageSelect.value = currentSettings.appearance.language;
  }
  darkModeToggle.checked = currentSettings.appearance.darkMode;
  systemThemeToggle.checked = currentSettings.appearance.useSystemTheme;

  // Disable dark mode toggle if system theme is enabled
  darkModeToggle.disabled = currentSettings.appearance.useSystemTheme;
}

// Update threshold visibility based on limit type
function updateThresholdVisibility(limitType) {
  // Hide all threshold groups first
  pixelsThresholdGroup.style.display = 'none';
  metersThresholdGroup.style.display = 'none';
  timeThresholdGroup.style.display = 'none';

  // Show appropriate threshold groups based on limit type
  switch (limitType) {
    case 'pixels':
      pixelsThresholdGroup.style.display = 'block';
      break;
    case 'meters':
      metersThresholdGroup.style.display = 'block';
      break;
    case 'time':
      timeThresholdGroup.style.display = 'block';
      break;
    case 'both':
      metersThresholdGroup.style.display = 'block';
      timeThresholdGroup.style.display = 'block';
      break;
  }
}

// Set up event listeners
function setupEventListeners() {
  // Limit type select
  limitTypeSelect.addEventListener('change', function() {
    updateThresholdVisibility(this.value);
  });

  // Scroll threshold slider (pixels)
  scrollThresholdSlider.addEventListener('input', function() {
    scrollThresholdValue.textContent = this.value;
  });

  // Meters threshold slider
  metersThresholdSlider.addEventListener('input', function() {
    metersThresholdValue.textContent = this.value;
  });

  // Time threshold slider
  timeThresholdSlider.addEventListener('input', function() {
    const timeValue = parseInt(this.value);
    const minutes = Math.floor(timeValue / 60);
    const seconds = timeValue % 60;
    timeThresholdValue.textContent = `${timeValue} seconds (${minutes}:${seconds.toString().padStart(2, '0')})`;
  });

  // Time restriction toggle
  timeRestrictionToggle.addEventListener('change', function() {
    timeSettings.style.display = this.checked ? 'block' : 'none';
  });

  // Add site button
  addSiteBtn.addEventListener('click', function() {
    addSite();
  });

  // Site input enter key
  siteInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addSite();
    }
  });

  // Reset buttons
  resetDailyBtn.addEventListener('click', function() {
    resetStatistics('daily');
  });

  resetWeeklyBtn.addEventListener('click', function() {
    resetStatistics('weekly');
  });

  resetAllBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      resetStatistics('all');
    }
  });

  // Language select
  languageSelect.addEventListener('change', function() {
    currentSettings.appearance.language = this.value;
    // Show message about reloading immediately when language is changed
    showStatusMessage('Language changed. Changes will take effect after saving settings and reloading the extension.', 'success');
  });

  // Dark mode toggle
  darkModeToggle.addEventListener('change', function() {
    currentSettings.appearance.darkMode = this.checked;
    applyDarkMode(this.checked);
  });

  // System theme toggle
  systemThemeToggle.addEventListener('change', function() {
    currentSettings.appearance.useSystemTheme = this.checked;
    darkModeToggle.disabled = this.checked;

    if (this.checked) {
      checkSystemThemePreference();
    }
  });

  // Listen for system theme changes if system theme is enabled
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if (currentSettings.appearance.useSystemTheme) {
        applyDarkMode(e.matches);
        currentSettings.appearance.darkMode = e.matches;
        darkModeToggle.checked = e.matches;
      }
    });
  }

  // Save button
  saveBtn.addEventListener('click', function() {
    saveSettings();
  });

  // Cancel button
  cancelBtn.addEventListener('click', function() {
    if (confirm('Discard changes and reload settings?')) {
      loadSettings();
    }
  });
}

// Add site to the list
function addSite() {
  const site = siteInput.value.trim();

  if (site) {
    // Clean up input (remove http://, https://, www.)
    let cleanSite = site.toLowerCase();
    cleanSite = cleanSite.replace(/^(https?:\/\/)?(www\.)?/, '');

    // Check if site already exists
    if (!currentSettings.targetedSites.includes(cleanSite)) {
      currentSettings.targetedSites.push(cleanSite);
      renderSiteList();
      siteInput.value = '';
    } else {
      showStatusMessage('Site already in list', 'error');
    }
  }
}

// Remove site from the list
function removeSite(site) {
  currentSettings.targetedSites = currentSettings.targetedSites.filter(s => s !== site);
  renderSiteList();
}

// Render site list
function renderSiteList() {
  siteList.innerHTML = '';

  if (currentSettings.targetedSites.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'site-item';
    emptyMessage.textContent = 'No sites added. All sites will be monitored.';
    emptyMessage.style.color = 'var(--site-note)';
    emptyMessage.style.fontStyle = 'italic';
    siteList.appendChild(emptyMessage);
    return;
  }

  currentSettings.targetedSites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';

    const siteName = document.createElement('span');
    siteName.textContent = site;

    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.title = 'Remove site';
    removeButton.addEventListener('click', () => {
      removeSite(site);
    });

    siteItem.appendChild(siteName);
    siteItem.appendChild(removeButton);
    siteList.appendChild(siteItem);
  });
}

// Reset statistics
function resetStatistics(type) {
  // First, try to wake up the service worker by sending a ping
  chrome.runtime.sendMessage({ action: 'ping' }, function() {
    // Ignore any error from the ping, it's just to wake up the service worker
    // Now send the actual reset message
    chrome.runtime.sendMessage({
      action: 'resetStatistics',
      type: type
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error resetting statistics:", chrome.runtime.lastError);
        showStatusMessage('Failed to reset statistics. Please try again.', 'error');
        return;
      }

      if (response && response.success) {
        showStatusMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} statistics reset successfully`, 'success');
      } else {
        showStatusMessage('Failed to reset statistics', 'error');
      }
    });
  });
}

// Save settings
function saveSettings() {
  // Update settings object with current UI values
  currentSettings.limitType = limitTypeSelect.value;
  currentSettings.scrollThreshold = parseInt(scrollThresholdSlider.value);
  currentSettings.metersThreshold = parseInt(metersThresholdSlider.value);
  currentSettings.timeThreshold = parseInt(timeThresholdSlider.value);

  currentSettings.levelMultipliers = {
    level1: parseFloat(level1Multiplier.value),
    level2: parseFloat(level2Multiplier.value),
    level3: parseFloat(level3Multiplier.value)
  };

  currentSettings.timeRestrictions = {
    enabled: timeRestrictionToggle.checked,
    afterHour: parseInt(afterHourSelect.value),
    beforeHour: parseInt(beforeHourSelect.value),
    restrictionLevel: parseInt(restrictionLevelSelect.value)
  };

  currentSettings.notifications = {
    sound: soundToggle.checked,
    visual: visualToggle.checked
  };

  currentSettings.appearance = {
    language: languageSelect.value,
    darkMode: darkModeToggle.checked,
    useSystemTheme: systemThemeToggle.checked
  };

  // Validate settings
  if (!validateSettings()) {
    return;
  }

  // Save to storage
  chrome.storage.sync.set({
    limitType: currentSettings.limitType,
    scrollThreshold: currentSettings.scrollThreshold,
    metersThreshold: currentSettings.metersThreshold,
    timeThreshold: currentSettings.timeThreshold,
    levelMultipliers: currentSettings.levelMultipliers,
    timeRestrictions: currentSettings.timeRestrictions,
    targetedSites: currentSettings.targetedSites,
    notifications: currentSettings.notifications,
    appearance: currentSettings.appearance
  }, function() {
    // Show success message
    showStatusMessage('Settings saved successfully', 'success');

    // Update settings in active tabs
    updateActiveTabsSettings();

    // If language changed, reload the page to apply the new language
    if (currentSettings.appearance.language !== chrome.i18n.getUILanguage()) {
      showStatusMessage('Language changed. Refreshing page to apply changes...', 'success');

      // Wait a moment for the user to see the message, then refresh the page
      setTimeout(() => {
        // First, notify the background script about the language change
        chrome.runtime.sendMessage({
          action: 'languageChanged',
          language: currentSettings.appearance.language
        }, function() {
          // Then reload the current page with the language parameter
          window.location.href = `${window.location.pathname}?lang=${currentSettings.appearance.language}`;
          // Don't reload the entire extension, just refresh the current page
        });
      }, 1500);
    }
  });
}

// Validate settings
function validateSettings() {
  // Check level multipliers are in ascending order
  if (currentSettings.levelMultipliers.level1 >= currentSettings.levelMultipliers.level2) {
    showStatusMessage('Level 1 multiplier must be less than Level 2', 'error');
    return false;
  }

  if (currentSettings.levelMultipliers.level2 >= currentSettings.levelMultipliers.level3) {
    showStatusMessage('Level 2 multiplier must be less than Level 3', 'error');
    return false;
  }

  // Check time restrictions
  if (currentSettings.timeRestrictions.enabled) {
    const afterHour = currentSettings.timeRestrictions.afterHour;
    const beforeHour = currentSettings.timeRestrictions.beforeHour;

    // If after hour is less than before hour, it means the time range doesn't cross midnight
    // In this case, after hour should be greater than before hour
    if (afterHour < beforeHour) {
      showStatusMessage('Restriction start time must be later than end time', 'error');
      return false;
    }
  }

  return true;
}

// Update settings in active tabs
function updateActiveTabsSettings() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateSettings',
        settings: {
          limitType: currentSettings.limitType,
          scrollThreshold: currentSettings.scrollThreshold,
          metersThreshold: currentSettings.metersThreshold,
          timeThreshold: currentSettings.timeThreshold,
          targetedSites: currentSettings.targetedSites,
          timeRestrictions: currentSettings.timeRestrictions,
          levelMultipliers: currentSettings.levelMultipliers,
          notifications: currentSettings.notifications
        }
      });
    });
  });
}

// Show status message
function showStatusMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message';
  statusMessage.classList.add(`status-${type}`);
  statusMessage.style.display = 'block';

  // Hide after 3 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}
