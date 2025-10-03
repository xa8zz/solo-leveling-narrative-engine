/**
 * Game State Manager
 * 
 * Manages the game state as a JSON object throughout the session.
 * This includes the player's stats, inventory, current location,
 * active quests, NPC statuses, and memory snippets.
 */
class GameState {
    constructor() {
        // Initialize with default state
        this.state = null;
        this.initialContext = '';
        // Initialize the state with default values
        this.initializeState();
    }
    
    /**
     * Initialize the game state with default values
     */
    initializeState() {
        this.state = {
            player: {
                name: "Sung Jinwoo",
                rank: "E",
                level: 1,
                experience: 0,
                HP: 100,
                MP: 0,
                stats: { STR: 10, AGI: 10, INT: 10, SENSE: 10, VIT: 10 },
                inventory: [
                    { name: "Hospital Gown", type: "clothing", description: "A plain patient gown", quantity: 1 }
                ],
                gold: 0
            },
            world: {
                location: "Seoul Ilshin Hospital - Room 302",
                time: "Day 1 - Morning",
                dungeon: null
            },
            NPCs: {
                "Nurse Joohee": { relationship: "friendly", lastSeen: "hospital", knowsAboutSystem: false }
            },
            quests: {
                current: "Welcome to the System",
                completed: []
            },
            conversationHistory: [],
            summaries: [],
        };
        this.initialContext = "Jinwoo has just awakened in the hospital room. He survived the Double Dungeon incident where most hunters died. He is weak and confused, but alive. The morning light spills through the window. Nurse Joohee is nearby, checking on patients.";
    }
    
    /**
     * Update the game state with changes (deep merge updates into the state).
     * @param {Object} changes - The changes to apply to the state
     */
    updateState(changes) {
        // Helper function to deep merge objects
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (
                        source[key] instanceof Object && 
                        key in target && 
                        target[key] instanceof Object && 
                        !(source[key] instanceof Array)
                    ) {
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            return target;
        };
        
        // Handle special cases for certain keys (like appending to arrays)
        this._handleSpecialCases(changes);
        
        // Deep merge changes into state
        deepMerge(this.state, changes);
        
        console.log('State updated:', this.state);
    }
    
    /**
     * Handle special cases for state updates, e.g., adding inventory items or completing quests.
     * @param {Object} changes - The changes object
     * @private
     */
    _handleSpecialCases(changes) {
        // Handle inventory additions
        if (changes.player?.inventoryAdd) {
            const itemsToAdd = changes.player.inventoryAdd;
            delete changes.player.inventoryAdd;
            for (const item of itemsToAdd) {
                // Check if item already exists in inventory
                const existingItem = this.state.player.inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                if (existingItem) {
                    // Increase quantity if already present
                    existingItem.quantity += item.quantity || 1;
                } else {
                    // Add new item to inventory
                    this.state.player.inventory.push({
                        ...item,
                        quantity: item.quantity || 1
                    });
                }
            }
        }
        
        // Handle inventory removals
        if (changes.player?.inventoryRemove) {
            const itemsToRemove = changes.player.inventoryRemove;
            delete changes.player.inventoryRemove;
            for (const item of itemsToRemove) {
                const existingItemIndex = this.state.player.inventory.findIndex(
                    i => i.name.toLowerCase() === item.name.toLowerCase()
                );
                if (existingItemIndex >= 0) {
                    const existingItem = this.state.player.inventory[existingItemIndex];
                    const quantityToRemove = item.quantity || 1;
                    if (existingItem.quantity > quantityToRemove) {
                        // Reduce quantity
                        existingItem.quantity -= quantityToRemove;
                    } else {
                        // Remove item completely if quantity goes to 0
                        this.state.player.inventory.splice(existingItemIndex, 1);
                    }
                }
            }
        }
        
        // Handle completing a quest
        if (changes.quests?.completeQuest) {
            const questToComplete = changes.quests.completeQuest;
            delete changes.quests.completeQuest;
            // Move current quest to completed if it matches the specified one
            if (this.state.quests.current === questToComplete) {
                this.state.quests.completed.push(questToComplete);
                this.state.quests.current = changes.quests.current || null;
            } else {
                // If the quest was not the current one, still add it to completed list if not already
                if (!this.state.quests.completed.includes(questToComplete)) {
                    this.state.quests.completed.push(questToComplete);
                }
            }
        }
        
        // Handle adding history entries (append to history array)
        if (changes.history instanceof Array) {
            this.state.history = [...this.state.history, ...changes.history];
            delete changes.history;
        }
    }
    
    
    
    /**
     * Get the current scene context for narration or prompting.
     * @returns {Object} - The current scene context including condensed memory, location, and time.
     */
    getSceneContext() {
        return {
            location: this.state.world.location,
            time: this.state.world.time
        };
    }
    
    /**
     * Get the state of a specific NPC by name.
     * @param {string} npcName - The NPC's name.
     * @returns {Object} - The NPC's state object (or an empty object if not found).
     */
    getNpcState(npcName) {
        return this.state.NPCs[npcName] || {};
    }
    
    /**
     * Update the state of a specific NPC with given changes.
     * @param {string} npcName - The NPC's name.
     * @param {Object} changes - An object of properties to merge into that NPC's state.
     */
    updateNpcState(npcName, changes) {
        if (!this.state.NPCs[npcName]) {
            // Initialize NPC entry if it doesn't exist
            this.state.NPCs[npcName] = {};
        }
        // Merge each provided property into the NPC's state
        for (const key in changes) {
            if (changes.hasOwnProperty(key)) {
                this.state.NPCs[npcName][key] = changes[key];
            }
        }
        console.log(`NPC state updated for ${npcName}:`, this.state.NPCs[npcName]);
    }

        /**
     * Get the initial context for the opening scenario.
     * @returns {string} - Initial context description.
     */
    getInitialContext() {
        return this.initialContext;
    }
    

        /**
     * Manages conversation history to keep the latest 20k tokens + summaries of older chunks.
     */
    async manageConversationHistory() {
        const totalTokens = this.state.conversationHistory.reduce((sum, entry) => sum + entry.tokens, 0);
        if (totalTokens <= 20000) return;

        const modelManager = new ModelManager(this.apiKey); // Adjust if apiKey isn’t available
        await modelManager.initialize();

        let tokenCount = 0;
        let chunk = [];
        let excessHistory = [];

        // Calculate tokens from the end to keep the latest 20k
        for (let i = this.state.conversationHistory.length - 1; i >= 0; i--) {
            const entry = this.state.conversationHistory[i];
            tokenCount += entry.tokens;
            if (tokenCount > 20000) {
                excessHistory.unshift(entry); // Add older entries to excess
            }
        }

        // Trim conversationHistory to latest 20k tokens
        const keepIndex = this.state.conversationHistory.length - excessHistory.length;
        this.state.conversationHistory = this.state.conversationHistory.slice(keepIndex);

        // Summarize excess history in 2.5k chunks
        tokenCount = 0;
        chunk = [];
        for (const entry of excessHistory) {
            tokenCount += entry.tokens;
            chunk.push(entry.text);
            if (tokenCount >= 2500) {
                const summary = await modelManager.summarizeHistory(chunk);
                this.state.summaries.push({ role: "Summary", text: summary, tokens: estimateTokens(summary) });
                tokenCount = 0;
                chunk = [];
            }
        }
        if (chunk.length > 0) {
            const summary = await modelManager.summarizeHistory(chunk);
            this.state.summaries.push({ role: "Summary", text: summary, tokens: estimateTokens(summary) });
        }
    }

    /**
     * Get data needed to save the game (snapshot of state and context).
     * @returns {Object} - Save data object.
     */
    getSaveData() {
        return {
            state: this.state,
            initialContext: this.initialContext, // Add this
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }
    
    /**
     * Load a saved game state from a save data object.
     * @param {Object} saveData - The save data to load.
     */
    loadSaveData(saveData) {
        if (!saveData || !saveData.state) {
            throw new Error('Invalid save data');
        }
        this.state = saveData.state;
        this.initialContext = saveData.initialContext || "Jinwoo has just awakened in the hospital room..."; // Fallback
        console.log('Game loaded:', this.state);
    }

    /**
     * Reset the game state to its initial values
     */
    resetState() {
        this.initializeState();
    }

    saveState() {
        return this.state;
    }
}
