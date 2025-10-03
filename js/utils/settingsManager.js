/**
 * Settings Manager
 * 
 * Manages user settings and preferences for the game.
 * Handles storing, retrieving, and applying settings.
 */
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            textSpeed: 50,               // Text display speed (1-100)
            imageFrequency: 'major-scenes', // Image generation frequency (always, major-scenes, never)
            narrativeStyle: 'detailed',  // Narrative style (concise, detailed)
            showSystemMessages: true,    // Whether to show system messages
            showTutorial: true           // Whether to show tutorial messages for new players
        };
        
        // Initialize settings
        this.settings = this._loadSettings();
        
        // Setup event listeners for the settings UI
        this._setupEventListeners();
    }
    
    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @returns {any} - Setting value
     */
    get(key) {
        return this.settings[key];
    }
    
    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    set(key, value) {
        this.settings[key] = value;
        this._saveSettings();
        
        // Update UI to reflect the change
        this._updateUI(key, value);
        
        // Trigger a custom event for other components
        const event = new CustomEvent('setting-changed', {
            detail: { key, value }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Reset settings to default values
     */
    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this._saveSettings();
        this._updateAllUI();
    }
    
    /**
     * Load settings from localStorage
     * @returns {Object} - Settings object
     * @private
     */
    _loadSettings() {
        try {
            const savedSettings = localStorage.getItem('solo_leveling_settings');
            if (savedSettings) {
                return { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        
        return { ...this.defaultSettings };
    }
    
    /**
     * Save settings to localStorage
     * @private
     */
    _saveSettings() {
        try {
            localStorage.setItem('solo_leveling_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    /**
     * Setup event listeners for settings UI
     * @private
     */
    _setupEventListeners() {
        // Text speed slider
        const textSpeedSlider = document.getElementById('text-speed');
        if (textSpeedSlider) {
            textSpeedSlider.value = this.settings.textSpeed;
            textSpeedSlider.addEventListener('input', (e) => {
                this.set('textSpeed', parseInt(e.target.value));
            });
        }
        
        // Image frequency select
        const imageFrequencySelect = document.getElementById('image-frequency');
        if (imageFrequencySelect) {
            imageFrequencySelect.value = this.settings.imageFrequency;
            imageFrequencySelect.addEventListener('change', (e) => {
                this.set('imageFrequency', e.target.value);
            });
        }
    }
    
    /**
     * Update the UI to reflect a setting change
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @private
     */
    _updateUI(key, value) {
        switch (key) {
            case 'textSpeed':
                const textSpeedSlider = document.getElementById('text-speed');
                const textSpeedValue = document.getElementById('text-speed-value');
                
                if (textSpeedSlider) {
                    textSpeedSlider.value = value;
                }
                
                if (textSpeedValue) {
                    if (value < 25) {
                        textSpeedValue.textContent = "Slow";
                    } else if (value < 75) {
                        textSpeedValue.textContent = "Normal";
                    } else {
                        textSpeedValue.textContent = "Fast";
                    }
                }
                break;
                
            case 'imageFrequency':
                const imageFrequencySelect = document.getElementById('image-frequency');
                if (imageFrequencySelect) {
                    imageFrequencySelect.value = value;
                }
                break;
        }
    }
    
    /**
     * Update all UI elements to reflect current settings
     * @private
     */
    _updateAllUI() {
        Object.keys(this.settings).forEach(key => {
            this._updateUI(key, this.settings[key]);
        });
    }
    
    /**
     * Apply initial settings to the game
     */
    applyInitialSettings() {
        // Update all UI elements
        this._updateAllUI();
        
        // Apply any settings that need immediate effect
        // This would be expanded based on what settings exist
        document.documentElement.style.setProperty(
            '--text-animation-speed', 
            `${Math.max(5, 100 - this.settings.textSpeed)}ms`
        );
    }
}
