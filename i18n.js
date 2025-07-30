// Custom i18n module to handle language preferences
let currentLanguage = '';

// Initialize by loading the user's language preference
function initI18n() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['defaultLanguage'], (result) => {
      currentLanguage = result.defaultLanguage || '';
      resolve(currentLanguage);
    });
  });
}

// Get message with respect to user's language preference
async function getMessage(messageName, substitutions) {
  // If language preference is not loaded yet, load it
  if (!currentLanguage && currentLanguage !== '') {
    await initI18n();
  }
  
  // If no language preference is set, use Chrome's default i18n
  if (!currentLanguage) {
    return chrome.i18n.getMessage(messageName, substitutions);
  }
  
  // Try to fetch the message from the preferred language
  try {
    // First try to get the message from the user's preferred language
    const response = await fetch(chrome.runtime.getURL(`_locales/${currentLanguage}/messages.json`));
    if (response.ok) {
      const messages = await response.json();
      if (messages[messageName] && messages[messageName].message) {
        let message = messages[messageName].message;
        
        // Handle substitutions if provided
        if (substitutions) {
          if (typeof substitutions === 'string') {
            message = message.replace(/\$1/g, substitutions);
          } else {
            substitutions.forEach((substitution, index) => {
              message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), substitution);
            });
          }
        }
        
        return message;
      }
    }
  } catch (error) {
    console.error('Error fetching localized message:', error);
  }
  
  // Fallback to Chrome's default i18n if preferred language message is not available
  return chrome.i18n.getMessage(messageName, substitutions);
}

// Update the current language
function setLanguage(language) {
  currentLanguage = language;
}

export { initI18n, getMessage, setLanguage };