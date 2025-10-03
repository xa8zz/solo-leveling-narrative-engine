/**
 * Game Manager
 * 
 * The central orchestrator for the Solo Leveling RPG Simulator.
 * Coordinates interactions between the models, UI, state, and user actions.
 */
class GameManager {
    constructor() {
        this.apiKeyManager = null;
        this.gameState = null;
        this.uiManager = null;
        this.modelManager = null;
        this.toolFunctions = null;
        this.settingsManager = null;
        
        this.isInitialized = false;
        this.isGameRunning = false;
        this.isWaitingForAction = false;
        this.pendingOperations = 0;
        // Removed: this._setupEventListeners();
    }
    
    /**
     * Initialize the game manager and all dependencies
     * @returns {Promise<boolean>} - Success status
     */
/**
 * Initialize the game manager and all dependencies
 * @returns {Promise<boolean>} - Success status
 */
    async initialize() {
        try {
            this.apiKeyManager = new ApiKeyManager();
            this.gameState = new GameState();
            this.uiManager = new UIManager(this.gameState);
            this.settingsManager = new SettingsManager();
            
            this.settingsManager.applyInitialSettings();
            
            // Ensure loading indicator is hidden initially
            this.uiManager.setLoading(false);

            // Force API key modal to show, even with a saved key
            const apiModal = document.getElementById('api-key-modal');
            if (apiModal) apiModal.classList.remove('hidden');
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) gameContainer.classList.add('hidden');
            
            const savedApiKey = await this.apiKeyManager.getApiKey();
            const apiKeyInput = document.getElementById('api-key-input');
            if (savedApiKey && apiKeyInput) {
                apiKeyInput.value = savedApiKey;
            }
            
            // Set up event listeners here instead of constructor
            this._setupEventListeners();
            
            return false; // Not fully initialized until API key is validated
        } catch (error) {
            console.error('Failed to initialize GameManager:', error);
            this.uiManager.showError('Failed to initialize the game. Please check your API key and try again.');
            return false;
        }
    }
    
    /**
     * Start a new game
     * @returns {Promise<boolean>} - Success status
     */
    async startNewGame() {
        try {
            if (!this.isInitialized) {
                throw new Error('GameManager is not initialized');
            }
            
            this.gameState.resetState();
            this.uiManager.clearNarrative();
            this.uiManager.updateStatePanel(this.gameState.state);
            
            this.uiManager.setLoading(true);
            this.pendingOperations = 1; // Reset explicitly
            
            try {
                const openingSequence = await this.modelManager.generateOpeningSequence();
                console.log('Opening sequence generated:', openingSequence); // Debug log
                if (openingSequence.stateChanges) {
                    this.gameState.updateState(openingSequence.stateChanges);
                }
                this.uiManager.addNarrativeEntry(openingSequence.narration);
                
                if (openingSequence.shouldGenerateImage && openingSequence.imagePrompt &&
                    this.settingsManager.get('imageFrequency') !== 'never') {
                    try {
                        const imageUrl = await this.modelManager.generateImage(openingSequence.imagePrompt);
                        console.log('Generated image URL in startNewGame:', imageUrl); // Debug log
                        if (imageUrl) {
                            this.uiManager.addImageToNarrative(imageUrl, 'Opening scene');
                        } else {
                            console.warn('No image URL returned');
                        }
                    } catch (imageError) {
                        console.error('Image generation failed:', imageError);
                    }
                }
                
                this.uiManager.updateStatePanel(this.gameState.state);
                this.uiManager.setInputEnabled(true);
                this.isGameRunning = true;
                this.isWaitingForAction = true;
                document.getElementById('api-key-modal').classList.add('hidden');
                
                return true;
            } catch (innerError) {
                console.error('Error during opening sequence:', innerError);
                this.uiManager.showError('Failed to generate opening sequence. Please try again.');
                return false;
            } finally {
                this.pendingOperations = 0;
                this.uiManager.setLoading(false);
                console.log('Loading state cleared in startNewGame'); // Debug log
            }
        } catch (error) {
            console.error('Failed to start new game:', error);
            this.uiManager.showError('Failed to start a new game. Please try again.');
            this.pendingOperations = 0;
            this.uiManager.setLoading(false);
            console.log('Loading state cleared in outer catch'); // Debug log
            return false;
        }
    }
    
    /**
     * Load a saved game
     * @param {string} saveData - Save data string
     * @returns {Promise<boolean>} - Success status
     */
    async loadGame() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.addEventListener('change', async (event) => {
            try {
                const file = event.target.files[0];
                if (!file) return;
    
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const saveData = JSON.parse(e.target.result);
                        if (!this.isInitialized) {
                            throw new Error('GameManager is not initialized');
                        }
                        
                        this.gameState.loadState(saveData);
                        this.uiManager.clearNarrative();
                        this.uiManager.updateStatePanel(this.gameState.state);
                        this.uiManager.setLoading(true);
                        this.pendingOperations++;
    
                        try {
                            const continuationNarration = await this.modelManager.generateContinuationNarration(this.gameState.state);
                            this.uiManager.addNarrativeEntry(continuationNarration);
                            this.uiManager.setInputEnabled(true);
                            this.isGameRunning = true;
                            this.isWaitingForAction = true;
                            this.uiManager.addSystemMessage('Game loaded successfully!');
                        } finally {
                            this.pendingOperations--;
                            if (this.pendingOperations <= 0) {
                                this.uiManager.setLoading(false);
                                this.pendingOperations = 0;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to parse save file:', error);
                        this.uiManager.showError('Failed to load save file. It may be corrupted.');
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error('Failed to load game:', error);
                this.uiManager.showError('Failed to load game.');
            }
        });
        fileInput.click();
    }
    
    /**
     * Save the current game
     * @returns {string} - Save data string
     */
    saveGame() {
        try {
            if (!this.isInitialized || !this.isGameRunning) {
                throw new Error('No active game to save');
            }
            
            const saveData = this.gameState.saveState();
            const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `solo-leveling-save-${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.uiManager.addSystemMessage('Game saved successfully!');
            return JSON.stringify(saveData);
        } catch (error) {
            console.error('Failed to save game:', error);
            this.uiManager.showError('Failed to save the game. Please try again.');
            return null;
        }
    }
    
    /**
     * Handle player action
     * @param {string} action - Player action text
     * @returns {Promise<boolean>} - Success status
     */
    async handlePlayerAction(action) {
        if (!this.isInitialized || !this.isGameRunning || !this.isWaitingForAction) {
            return false;
        }
        
        // Disable input while processing
        this.isWaitingForAction = false;
        this.uiManager.setInputEnabled(false);
        
        // Show loading indicator
        this.uiManager.setLoading(true);
        this.pendingOperations++;
        
        try {
            // Display player action in the narrative
            this.uiManager.addPlayerAction(action);
            
            // Validate the action
            const validationResult = await this.modelManager.validatePlayerAction(action, this.gameState.state);
            
            if (!validationResult.valid) {
                // Action is invalid, show reason and re-enable input
                this.uiManager.addNarrativeEntry(`You can't do that. ${validationResult.reason || 'Try something else.'}`);
                
                this.isWaitingForAction = true;
                this.uiManager.setInputEnabled(true);
                return false;
            }
            
            // Process NPC interaction if needed
            let npcResponse = null;
            if (validationResult.involveNPC && validationResult.npcName) {
                const npcName = validationResult.npcName;
                const npcState = this.gameState.getNpcState(npcName);
                const sceneContext = {
                    location: this.gameState.state.world.location,
                    playerRank: this.gameState.state.player.rank,
                    currentQuest: this.gameState.state.quests.current
                };
                
                npcResponse = await this.modelManager.generateNPCResponse(
                    npcName, 
                    action, 
                    npcState, 
                    sceneContext
                );
                
                // Display NPC dialogue
                if (npcResponse.dialogue) {
                    this.uiManager.addNpcDialogue(npcName, npcResponse.dialogue);
                }
                
                // Update NPC state if needed
                if (npcResponse.npcChanges) {
                    this.gameState.updateNpcState(npcName, npcResponse.npcChanges);
                }
            }
            
            // Generate narration for the action outcome
            const sceneContext = {
                location: this.gameState.state.world.location,
                time: this.gameState.state.world.time
            };
            
            const narrationResult = await this.modelManager.generateNarration(
                action,
                npcResponse,
                this.gameState,
                sceneContext
            );
            
            // Display narration
            if (narrationResult.narration) {
                this.uiManager.addNarrativeEntry(narrationResult.narration);
            }
            
            // Update game state if needed
            if (narrationResult.stateChanges) {
                this.gameState.updateState(narrationResult.stateChanges);
                                // Add to conversation history
                this.gameState.state.conversationHistory.push({
                    role: "Sung Jinwoo",
                    text: action,
                    tokens: tokenEstimator.estimateTokens(action)
                });
                this.gameState.state.conversationHistory.push({
                    role: "Narrator",
                    text: narrationResult.narration,
                    tokens: tokenEstimator.estimateTokens(narrationResult.narration)
                });
                await this.gameState.manageConversationHistory();
                this.uiManager.updateStatePanel(this.gameState.state);
            }
            
            // Generate image if needed
            if (validationResult.newScene && this.settingsManager.get('imageFrequency') !== 'never') {
                const imagePrompt = `A ${this.gameState.state.world.location} scene after: ${narrationResult.narration.slice(0, 100)}...`;
                const imageUrl = await this.modelManager.generateImage(imagePrompt);
                if (imageUrl) {
                    this.uiManager.addImageToNarrative(imageUrl, 'New scene after action');
                }
            }
            
            // Update UI
            this.uiManager.updateStatePanel(this.gameState.state);
            
            // Re-enable input
            this.isWaitingForAction = true;
            this.uiManager.setInputEnabled(true);
            
            return true;
        } catch (error) {
            console.error('Error handling player action:', error);
            this.uiManager.showError('Something went wrong. Please try a different action.');
            
            // Re-enable input
            this.isWaitingForAction = true;
            this.uiManager.setInputEnabled(true);
            
            return false;
        } finally {
            // Hide loading indicator
            this.pendingOperations--;
            if (this.pendingOperations <= 0) {
                this.uiManager.setLoading(false);
                this.pendingOperations = 0;
            }
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // API key submission
        document.getElementById('save-api-key').addEventListener('click', async () => {
            const apiKeyInput = document.getElementById('api-key-input');
            const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
            if (!apiKey) {
                this.uiManager.showError('Please enter a valid API key');
                return;
            }
            try {
                await this.apiKeyManager.saveApiKey(apiKey);
                this.modelManager = new ModelManager(apiKey);
                this.modelManager.gameState = this.gameState; // Link gameState here
                await this.modelManager.initialize();
                const testResponse = await this.modelManager.generateOpeningSequence();
                if (!testResponse || !testResponse.narration) {
                    throw new Error('API key validation failed');
                }
                this.toolFunctions = new ToolFunctions(this.gameState);
                this.isInitialized = true;
                document.getElementById('api-key-modal').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');
                await this.startNewGame();
            } catch (error) {
                console.error('Failed to initialize with API key:', error);
                if (error.message.includes('API key') || error.message.includes('Unauthorized')) {
                    this.uiManager.showError('Invalid API key. Please enter a valid key and try again.');
                    await this.apiKeyManager.clearApiKey();
                } else {
                    this.uiManager.showError('Failed to connect to the game server. Please try again.');
                }
            }
        });
        
        // Player action submission
        const actionForm = document.getElementById('player-action-form');
        if (actionForm) {
            actionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const actionInput = document.getElementById('player-action-input');
                const action = actionInput.value.trim();
                
                if (!action) {
                    return;
                }
                
                // Handle action
                await this.handlePlayerAction(action);
                
                // Clear input
                actionInput.value = '';
            });
        }
        
        // Game control buttons
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', async () => {
                // Ask for confirmation if there's a game in progress
                if (this.isGameRunning) {
                    const confirmed = confirm('Starting a new game will erase your current progress. Are you sure?');
                    if (!confirmed) {
                        return;
                    }
                }
                
                await this.startNewGame();
            });
        }
        
        // Save game button
        const saveGameBtn = document.getElementById('save-game');
        if (saveGameBtn) {
            saveGameBtn.addEventListener('click', () => {
                if (!this.isGameRunning) {
                    alert('No active game to save');
                    return;
                }
                
                const saveData = this.saveGame();
                if (saveData) {
                    // Save to localStorage
                    localStorage.setItem('solo_leveling_save', saveData);
                    alert('Game saved successfully');
                }
            });
        }
        
        // Load game button
        const loadGameBtn = document.getElementById('load-game');
        if (loadGameBtn) {
            loadGameBtn.addEventListener('click', async () => {
                if (this.isGameRunning) {
                    const confirmed = confirm('Loading a saved game will erase your current progress. Are you sure?');
                    if (!confirmed) {
                        return;
                    }
                }
                this.loadGame();
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                document.getElementById('settings-modal').classList.remove('hidden');
            });
        }
        
        // Close settings button
        const closeSettingsBtn = document.getElementById('settings-close-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                document.getElementById('settings-modal').classList.add('hidden');
            });
        }
        
        // Update API key button
        const updateApiKeyBtn = document.getElementById('update-api-key');
        if (updateApiKeyBtn) {
            updateApiKeyBtn.addEventListener('click', async () => {
                const newApiKey = prompt('Enter your new Gemini API key:');
                if (!newApiKey) {
                    return;
                }
                
                await this.apiKeyManager.saveApiKey(newApiKey);
                
                // Reinitialize with new key
                this.initialize();
            });
        }
    }
}
