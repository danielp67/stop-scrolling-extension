// Global variables to track scrolling
let scrollStartTime = null;
let totalScrollTime = 0;
let scrollDistance = 0;
let lastScrollPosition = 0;
let scrollThreshold = 5000; // Default threshold in pixels
let activeMode = 0; // 0: No intervention, 1: Slow, 2: Visual effects, 3: Block
let isTimeRestricted = false;
let targetedSites = []; // Sites to monitor
let statistics = {
  dailyScrollTime: 0,
  dailyScrollDistance: 0,
  thresholdExceeded: 0,
  blockingTriggered: 0
};

// Elements for visual feedback
let overlayElement = null;
let messageElement = null;

// Initialize when the content script loads
function initialize() {
  // Load user settings from storage
  if (chrome && chrome.storage) {
    try {
      chrome.storage.sync.get([
        'scrollThreshold',
        'targetedSites',
        'timeRestrictions',
        'statistics'
      ], function(result) {
        if (result.scrollThreshold) scrollThreshold = result.scrollThreshold;
        if (result.targetedSites) targetedSites = result.targetedSites;
        if (result.statistics) statistics = result.statistics;

        // Check if current site is in targeted sites
        const currentHost = window.location.hostname;
        if (targetedSites.length === 0 || targetedSites.includes(currentHost)) {
          setupScrollListeners();
          createOverlayElements();
          checkTimeRestrictions();
        }
      });
    } catch (e) {
      console.log('Error loading settings:', e);
      // Set up default behavior even if we can't load settings
      setupScrollListeners();
      createOverlayElements();
    }
  } else {
    // Set up default behavior even if chrome.storage is not available
    setupScrollListeners();
    createOverlayElements();
  }

  // Get last scroll position from session storage if available
  const savedPosition = sessionStorage.getItem('scrollPosition');
  if (savedPosition) {
    lastScrollPosition = parseInt(savedPosition);
    scrollDistance = parseInt(sessionStorage.getItem('scrollDistance') || '0');
  }
}

// Set up scroll event listeners
function setupScrollListeners() {
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Save data when user leaves the page
  window.addEventListener('beforeunload', saveScrollData);
}

// Handle scroll events
function handleScroll() {
  // Start tracking time if not already started
  if (!scrollStartTime) {
    scrollStartTime = Date.now();
  }

  // Calculate scroll distance
  const currentPosition = window.scrollY;
  const delta = Math.abs(currentPosition - lastScrollPosition);
  scrollDistance += delta;
  lastScrollPosition = currentPosition;

  // Save current position to session storage
  sessionStorage.setItem('scrollPosition', currentPosition.toString());
  sessionStorage.setItem('scrollDistance', scrollDistance.toString());

  // Check if threshold is exceeded
  if (scrollDistance > scrollThreshold) {
    applyInterventions();
  }
}

// Apply progressive interventions based on scroll amount
function applyInterventions() {
  // Calculate how much the threshold has been exceeded
  const excessScroll = scrollDistance - scrollThreshold;

  // Level 1: Slow down scrolling (exceeded by 0-100%)
  if (excessScroll <= scrollThreshold) {
    if (activeMode < 1) {
      activeMode = 1;
      statistics.thresholdExceeded++;
      slowDownScrolling();
    }
  } 
  // Level 2: Visual effects (exceeded by 100-200%)
  else if (excessScroll <= scrollThreshold * 2) {
    if (activeMode < 2) {
      activeMode = 2;
      applyVisualEffects();
    }
  } 
  // Level 3: Block scrolling (exceeded by >200%)
  else {
    if (activeMode < 3) {
      activeMode = 3;
      statistics.blockingTriggered++;
      blockScrolling();
    }
  }

  // Update statistics
  updateStatistics();
}

// Level 1 intervention: Slow down scrolling
function slowDownScrolling() {
  // Create a CSS class to modify scroll behavior
  const style = document.createElement('style');
  style.innerHTML = `
    html, body {
      scroll-behavior: smooth !important;
      transition: scroll 0.5s ease-in-out !important;
    }
  `;
  document.head.appendChild(style);

  // Show a subtle notification
  showNotification("Scrolling slowed down. Consider taking a break soon.", "warning");
}

// Level 2 intervention: Visual effects
function applyVisualEffects() {
  // Add screen vibration effect
  document.body.classList.add('scroll-vibration');

  // Add dim effect to the overlay
  if (overlayElement) {
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    overlayElement.style.display = 'block';
  }

  // Add CSS for vibration
  const style = document.createElement('style');
  style.innerHTML = `
    .scroll-vibration {
      animation: vibrate 0.3s linear infinite both;
    }
    @keyframes vibrate {
      0% { transform: translate(0); }
      20% { transform: translate(-2px, 2px); }
      40% { transform: translate(-2px, -2px); }
      60% { transform: translate(2px, 2px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0); }
    }
  `;
  document.head.appendChild(style);

  // Show a stronger notification
  showNotification("You've been scrolling for a while. Time for a break?", "alert");

  // Play a sound if possible
  playAlertSound();
}

// Level 3 intervention: Block scrolling
function blockScrolling() {
  // Prevent further scrolling
  document.body.style.overflow = 'hidden';

  // Show full overlay with message
  if (overlayElement && messageElement) {
    overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlayElement.style.display = 'flex';
    messageElement.textContent = "You need a break! You've been scrolling too much.";
    messageElement.style.display = 'block';

    // Add a continue button that appears after 5 seconds
    setTimeout(() => {
      const continueButton = document.createElement('button');
      continueButton.textContent = 'Continue anyway';
      continueButton.style.padding = '10px 20px';
      continueButton.style.marginTop = '20px';
      continueButton.style.backgroundColor = '#4CAF50';
      continueButton.style.border = 'none';
      continueButton.style.borderRadius = '5px';
      continueButton.style.color = 'white';
      continueButton.style.cursor = 'pointer';

      continueButton.addEventListener('click', () => {
        // Reset intervention
        resetInterventions();
        // But keep tracking
        scrollDistance = scrollThreshold; // Reset to threshold level
      });

      messageElement.appendChild(continueButton);
    }, 5000);
  }

  // Play a more noticeable sound
  playBlockSound();
}

// Create overlay elements for visual feedback
function createOverlayElements() {
  // Create overlay
  overlayElement = document.createElement('div');
  overlayElement.style.position = 'fixed';
  overlayElement.style.top = '0';
  overlayElement.style.left = '0';
  overlayElement.style.width = '100%';
  overlayElement.style.height = '100%';
  overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  overlayElement.style.display = 'none';
  overlayElement.style.zIndex = '9999';
  overlayElement.style.justifyContent = 'center';
  overlayElement.style.alignItems = 'center';
  overlayElement.style.transition = 'background-color 0.5s ease';

  // Create message element
  messageElement = document.createElement('div');
  messageElement.style.color = 'white';
  messageElement.style.fontSize = '24px';
  messageElement.style.fontWeight = 'bold';
  messageElement.style.textAlign = 'center';
  messageElement.style.padding = '20px';
  messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  messageElement.style.borderRadius = '10px';
  messageElement.style.maxWidth = '80%';
  messageElement.style.display = 'none';

  overlayElement.appendChild(messageElement);
  document.body.appendChild(overlayElement);
}

// Show notification
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '10000';
  notification.style.fontSize = '16px';

  if (type === 'warning') {
    notification.style.backgroundColor = '#FFC107';
    notification.style.color = 'black';
  } else if (type === 'alert') {
    notification.style.backgroundColor = '#F44336';
    notification.style.color = 'white';
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Play alert sound
function playAlertSound() {
  if (chrome && chrome.runtime) {
    try {
      const audio = new Audio(chrome.runtime.getURL('sounds/alert.mp3'));
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (e) {
      console.log('Error playing alert sound:', e);
    }
  }
}

// Play block sound
function playBlockSound() {
  if (chrome && chrome.runtime) {
    try {
      const audio = new Audio(chrome.runtime.getURL('sounds/block.mp3'));
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (e) {
      console.log('Error playing block sound:', e);
    }
  }
}

// Reset interventions
function resetInterventions() {
  // Remove slow scrolling
  document.body.style.scrollBehavior = '';

  // Remove vibration
  document.body.classList.remove('scroll-vibration');

  // Hide overlay
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }

  // Re-enable scrolling
  document.body.style.overflow = '';

  // Reset active mode
  activeMode = 0;
}

// Check time restrictions
function checkTimeRestrictions() {
  if (chrome && chrome.storage) {
    try {
      chrome.storage.sync.get('timeRestrictions', function(result) {
        if (result.timeRestrictions) {
          const now = new Date();
          const currentHour = now.getHours();

          // Example: restrict after 11 PM (23:00)
          if (result.timeRestrictions.afterHour && currentHour >= result.timeRestrictions.afterHour) {
            isTimeRestricted = true;
            blockScrolling();
            if (messageElement) {
              messageElement.textContent = "Scrolling is restricted during this time. Come back tomorrow!";
            }
          }
        }
      });
    } catch (e) {
      console.log('Error checking time restrictions:', e);
    }
  }
}

// Update statistics
function updateStatistics() {
  // Calculate scroll time
  if (scrollStartTime) {
    const now = Date.now();
    totalScrollTime += (now - scrollStartTime) / 1000; // in seconds
    scrollStartTime = now;
  }

  // Update daily statistics
  statistics.dailyScrollTime = totalScrollTime;
  statistics.dailyScrollDistance = scrollDistance;

  // Convert scroll distance to meters using a conversion factor that matches user expectations
  // We use a factor that makes each scroll action approximately 1 meter
  const pixelsPerMeter = 3023.62; // Adjusted to make 5 scrolls equal 5 meters
  const scrollDistanceInMeters = scrollDistance / pixelsPerMeter;

  // Send statistics to background script for storage
  if (chrome && chrome.runtime) {
    try {
      chrome.runtime.sendMessage({
        action: 'updateStatistics',
        data: {
          site: window.location.hostname,
          scrollTime: totalScrollTime,
          scrollDistance: scrollDistanceInMeters,
          thresholdExceeded: statistics.thresholdExceeded,
          blockingTriggered: statistics.blockingTriggered
        }
      });
    } catch (e) {
      console.log('Error sending statistics:', e);
    }
  }
}

// Save scroll data before unloading the page
function saveScrollData() {
  // Update final statistics
  updateStatistics();

  // Reset scroll start time
  scrollStartTime = null;
}

// Listen for messages from popup or background script
if (chrome && chrome.runtime) {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getStatistics') {
        sendResponse({
          scrollDistance: scrollDistance,
          scrollTime: totalScrollTime,
          activeMode: activeMode
        });
      } else if (message.action === 'resetInterventions') {
        resetInterventions();
        scrollDistance = 0;
        sendResponse({ success: true });
      } else if (message.action === 'updateSettings') {
        if (message.settings.scrollThreshold) {
          scrollThreshold = message.settings.scrollThreshold;
        }
        if (message.settings.targetedSites) {
          targetedSites = message.settings.targetedSites;
        }
        sendResponse({ success: true });
      }
      return true;
    });
  } catch (e) {
    console.log('Error setting up message listener:', e);
  }
}

// Initialize the content script
initialize();
