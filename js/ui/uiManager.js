/**
 * UI Manager
 * 
 * Handles all user interface interactions, updates, and animations.
 * Manages both the Story Panel and Game State Panel.
 */
class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.narrativeContainer = document.getElementById('narrative-container');
        this.playerActionInput = document.getElementById('player-action');  // adjusted to match actual input ID
        this.submitActionButton = document.getElementById('submit-action');
        
        // Typing animation settings (text speed)
        this.typingSpeed = parseInt(localStorage.getItem('textSpeed') || '90');
        if (document.getElementById('text-speed')) {
            document.getElementById('text-speed').value = this.typingSpeed;
            this._updateTextSpeedLabel();
        }
        
        // Set up UI event listeners (e.g., for settings changes, inventory clicks)
        this._setupEventListeners();
    }
    
    /**
     * Set up event listeners for UI components
     * @private
     */
    _setupEventListeners() {
        // Text speed slider
        const textSpeedSlider = document.getElementById('text-speed');
        if (textSpeedSlider) {
            textSpeedSlider.addEventListener('input', (e) => {
                this.typingSpeed = parseInt(e.target.value);
                localStorage.setItem('textSpeed', this.typingSpeed);
                this._updateTextSpeedLabel();
            });
        }
        
        // Image frequency setting
        const imageFrequencySelect = document.getElementById('image-frequency');
        if (imageFrequencySelect) {
            imageFrequencySelect.value = localStorage.getItem('imageFrequency') || 'major-scenes';
            imageFrequencySelect.addEventListener('change', (e) => {
                localStorage.setItem('imageFrequency', e.target.value);
            });
        }
        
        // Inventory items
        const inventoryItems = document.getElementById('inventory-items');
        if (inventoryItems) {
            inventoryItems.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.inventory-item');
                if (itemElement) {
                    const itemName = itemElement.dataset.name;
                    if (itemName) {
                        const item = this.gameState.state.player.inventory.find(i => i.name === itemName);
                        if (item) {
                            this._showItemDetails(item);
                        } else {
                            this._showItemDetails({
                                name: itemName,
                                type: itemElement.dataset.type || 'item',
                                description: itemElement.dataset.description || 'No description available',
                                quantity: parseInt(itemElement.dataset.quantity || '1')
                            });
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Update the text speed label
     * @private
     */
    _updateTextSpeedLabel() {
        const speedValue = document.getElementById('text-speed-value');
        if (speedValue) {
            if (this.typingSpeed < 25) {
                speedValue.textContent = "Slow";
            } else if (this.typingSpeed < 75) {
                speedValue.textContent = "Normal";
            } else {
                speedValue.textContent = "Fast";
            }
        }
    }
    
    /**
     * Add a new entry to the narrative container with typing animation
     * @param {string} text - The text to add
     * @param {string} className - CSS class for styling the entry
     */
    addNarrativeEntry(text, className = 'narrator-text') {
        const entry = document.createElement('div');
        entry.className = `narrative-entry ${className}`;
        this.narrativeContainer.appendChild(entry);
        
        // If typing is very fast, just show the text immediately
        if (this.typingSpeed > 90) {
            entry.textContent = text;
            this._scrollToBottom();
            return;
        }
        
        // Create typing animation
        let i = 0;
        const speed = Math.max(5, 100 - this.typingSpeed); // Convert 1-100 scale to typing speed
        
        const typeText = () => {
            if (i < text.length) {
                entry.textContent += text.charAt(i);
                i++;
                this._scrollToBottom();
                setTimeout(typeText, speed);
            }
        };
        
        typeText();
    }
    
    /**
     * Add the player's action to the narrative
     * @param {string} action - The player's action text
     */
    addPlayerAction(action) {
        const entry = document.createElement('div');
        entry.className = 'player-action';
        entry.textContent = `> ${action}`;
        this.narrativeContainer.appendChild(entry);
        this._scrollToBottom();
    }
    
    /**
     * Add a system message to the narrative
     * @param {string} message - The system message
     */
    addSystemMessage(message) {
        const entry = document.createElement('div');
        entry.className = 'system-message';
        entry.textContent = `[System] ${message}`;
        this.narrativeContainer.appendChild(entry);
        this._scrollToBottom();
    }

        /**
     * Add an NPC's dialogue to the narrative
     * @param {string} npcName - The name of the NPC
     * @param {string} dialogue - The NPC's dialogue text
     */
    addNpcDialogue(npcName, dialogue) {
        const entry = document.createElement('div');
        entry.className = 'npc-dialogue';
        entry.textContent = `${npcName}: "${dialogue}"`;
        this.narrativeContainer.appendChild(entry);
        this._scrollToBottom();
    }
    
    /**
     * Clear all narrative content
     */
    clearNarrative() {
        this.narrativeContainer.innerHTML = '';
    }
    
    /**
     * Update the state panel with the current game state
     * @param {Object} state - The current game state
     */
    updateStatePanel(state) {
        // Update player stats
        const playerName = document.getElementById('player-name');
        if (playerName) {
            playerName.textContent = state.player.name;
        }
        const playerRank = document.getElementById('player-rank');
        if (playerRank) {
            playerRank.textContent = state.player.rank;
        }
        const playerLevel = document.getElementById('player-level');
        if (playerLevel) {
            playerLevel.textContent = state.player.level;
        }
        
        // Update HP/MP/EXP bars
        this._updateProgressBar('hp', state.player.HP, 100);
        this._updateProgressBar('mp', state.player.MP, state.player.MP > 0 ? 100 : 0);
        
        // Calculate XP percentage based on level
        const xpNeeded = state.player.level * 100;
        this._updateProgressBar('exp', state.player.experience, xpNeeded);
        
        // Update attributes
        const strValue = document.getElementById('str-value');
        if (strValue) {
            strValue.textContent = state.player.stats.STR;
        }
        const agiValue = document.getElementById('agi-value');
        if (agiValue) {
            agiValue.textContent = state.player.stats.AGI;
        }
        const intValue = document.getElementById('int-value');
        if (intValue) {
            intValue.textContent = state.player.stats.INT;
        }
        const senseValue = document.getElementById('sense-value');
        if (senseValue) {
            senseValue.textContent = state.player.stats.SENSE;
        }
        const vitValue = document.getElementById('vit-value');
        if (vitValue) {
            vitValue.textContent = state.player.stats.VIT;
        }
        
        // Update gold
        const goldAmount = document.getElementById('gold-amount');
        if (goldAmount) {
            goldAmount.textContent = state.player.gold;
        }
        
        // Update inventory
        this._updateInventory(state.player.inventory);
        
        // Update quests
        const questDescription = document.getElementById('quest-description');
        if (questDescription) {
            questDescription.textContent = state.quests.current || 'No active quest';
        }
        
        this._updateCompletedQuests(state.quests.completed);
    }
    
    /**
     * Update a progress bar
     * @param {string} id - The ID prefix for the progress bar
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     * @private
     */
    _updateProgressBar(id, current, max) {
        const bar = document.getElementById(`${id}-bar`);
        const text = document.getElementById(`${id}-text`);
        
        if (bar && text) {
            const percentage = max > 0 ? (current / max) * 100 : 0;
            bar.style.width = `${percentage}%`;
            text.textContent = `${current}/${max}`;
        }
    }
    
    /**
     * Update the inventory display
     * @param {Array} inventory - The player's inventory items
     * @private
     */
    _updateInventory(inventory) {
        const container = document.getElementById('inventory-items');
        if (container) {
            container.innerHTML = '';
            
            if (inventory.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'inventory-item empty';
                emptyItem.textContent = 'No items';
                container.appendChild(emptyItem);
                return;
            }
            
            for (const item of inventory) {
                const itemElement = document.createElement('div');
                itemElement.className = 'inventory-item';
                itemElement.dataset.name = item.name;
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'inventory-item-name';
                nameSpan.textContent = item.name;
                
                const quantitySpan = document.createElement('span');
                quantitySpan.className = 'inventory-item-quantity';
                quantitySpan.textContent = `(${item.quantity})`;
                
                itemElement.appendChild(nameSpan);
                if (item.quantity > 1) {
                    itemElement.appendChild(quantitySpan);
                }
                
                container.appendChild(itemElement);
            }
        }
    }
    
    /**
     * Update the completed quests list
     * @param {Array} completedQuests - Array of completed quest names
     * @private
     */
    _updateCompletedQuests(completedQuests) {
        const questList = document.getElementById('completed-quest-list');
        if (questList) {
            questList.innerHTML = '';
            
            if (completedQuests.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.textContent = 'No completed quests';
                questList.appendChild(emptyItem);
                return;
            }
            
            for (const quest of completedQuests) {
                const questItem = document.createElement('li');
                questItem.textContent = quest;
                questList.appendChild(questItem);
            }
        }
    }
    
    /**
     * Show item details in a popup
     * @param {Object} item - The item to show details for
     * @private
     */
    _showItemDetails(item) {
        // Create a simple popup for item details
        const popup = document.createElement('div');
        popup.className = 'item-details-popup';
        popup.innerHTML = `
            <h3>${item.name}</h3>
            <p>Type: ${item.type}</p>
            ${item.description ? `<p>${item.description}</p>` : ''}
            ${item.attack ? `<p>Attack: +${item.attack}</p>` : ''}
            ${item.defense ? `<p>Defense: +${item.defense}</p>` : ''}
            <button id="close-popup">Close</button>
            <button id="use-item">Use Item</button>
        `;
        
        document.body.appendChild(popup);
        
        // Position the popup
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = '#34495e';
        popup.style.padding = '20px';
        popup.style.borderRadius = '8px';
        popup.style.zIndex = '1000';
        popup.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        
        // Close button functionality
        document.getElementById('close-popup').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        // Use item functionality
        document.getElementById('use-item').addEventListener('click', () => {
            // Set the player action input to use this item
            this.playerActionInput.value = `use ${item.name}`;
            document.body.removeChild(popup);
            // Optional: auto-submit the action
            // this.submitActionButton.click();
        });
    }
    
    /**
     * Set the loading state for the narrative panel
     * @param {boolean} isLoading - Whether the panel is loading
     */
/**
 * Set the loading state for the narrative panel
 * @param {boolean} isLoading - Whether the panel is loading
 */
    setLoading(isLoading) {
        const actionInput = document.getElementById('player-action-input');
        const submitButton = document.getElementById('submit-action');
        const loadingIndicator = document.getElementById('loading-indicator');

        if (!loadingIndicator) {
            console.error('Loading indicator element not found! Check HTML ID.');
            return;
        }

        if (actionInput) actionInput.disabled = isLoading;
        if (submitButton) submitButton.disabled = isLoading;

        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }

        console.log('Loading state set to:', isLoading, 'Indicator classList:', loadingIndicator.classList.toString());
    }
    
    /**
     * Set the loading state for the scene image
     * @param {boolean} isLoading - Whether the image is loading
     */
    setImageLoading(isLoading) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            if (isLoading) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }
    }
    
    /**
     * Set a scene image from data URL or URL
     * @param {string} imageData - The image data or URL
     */
    setSceneImage(imageData) {
        const container = document.getElementById('scene-image-container');
        
        // Remove any existing image
        const existingImage = container && container.querySelector('img');
        if (existingImage) {
            container.removeChild(existingImage);
        }
        
        // Create and add the new image
        if (container) {
            const img = document.createElement('img');
            img.id = 'scene-image';
            img.src = imageData;
            img.alt = 'Scene Image';
            container.appendChild(img);
        }
    }

    addImageToNarrative(imageUrl, altText) {
        const container = document.getElementById('scene-image-container');
        if (container) {
            const img = document.createElement('img');
            img.id = 'scene-image';
            img.src = imageUrl || 'placeholder.png'; // Fallback image if URL is invalid
            img.alt = altText;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.onerror = () => {
                console.warn('Failed to load image, using placeholder');
                img.src = 'placeholder.png'; // Replace with a placeholder if loading fails
            };
            container.innerHTML = ''; // Clear existing image
            container.appendChild(img);
        } else {
            console.error('Scene image container not found in DOM');
        }
    }
    
    /**
     * Enable or disable the input field and submit button
     * @param {boolean} enabled - Whether input should be enabled
     */
    setInputEnabled(enabled) {
        const actionInput = document.getElementById('player-action-input');
        const submitButton = document.getElementById('submit-action');
        if (actionInput) actionInput.disabled = !enabled;
        if (submitButton) submitButton.disabled = !enabled;
    }
    
    /**
     * Show an error message to the user
     * @param {string} message - The error message
     */
    showError(message) {
        this.addSystemMessage(`Error: ${message}`);
        
        // For more serious errors, we could use a proper modal, but this will do for now
        console.error(message);
    }
    
    /**
     * Scroll the narrative container to the bottom
     * @private
     */
    _scrollToBottom() {
        if (this.narrativeContainer) {
            this.narrativeContainer.scrollTop = this.narrativeContainer.scrollHeight;
        }
    }
}
