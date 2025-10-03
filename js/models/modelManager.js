/**
 * Model Manager
 * 
 * Handles all interactions with the Google Gemini AI models.
 * Orchestrates calls to different models based on needs:
 * - Heavy Model: Narration and storytelling
 * - Medium Model: NPC dialogues and mid-level logic
 * - Light Model: Input validation, state evaluation, structured output
 * - Image Model: Scene illustrations
 */
class ModelManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.isInitialized = false;
        
        // Gemini model IDs for different purposes
        this.models = {
            heavy: 'gemini-2.0-flash-thinking-exp-01-21',    // Rich narrative model
            medium: 'gemini-2.0-flash',                 // NPC dialogue & mid-level logic
            light: 'gemini-2.0-flash-lite',             // Fast validation/evaluation model
            image: 'gemini-2.0-flash-exp'  // Scene image generation model
        };
        
        // System prompts that set the role and style for each model type
        this.systemPrompts = {
            heavy: `You are the Narrator in a Solo Leveling RPG simulator based on the popular manhwa/novel. 
Your role is to create rich, immersive narration in a third-person perspective, focusing on the protagonist Sung Jinwoo.
Your narration should:
- Maintain a consistent tone that matches the Solo Leveling world (serious, sometimes dark, with moments of humor)
- Describe scenes, character reactions, and outcomes vividly
- Follow the established lore of Solo Leveling (hunters, dungeons, the System, monsters)
- Gradually increase challenges and stakes as the player progresses in rank/level
- Ensure narrative continuity based on the provided scene context
- Never narrate the player's decisions for them, only the consequences
- End narration segments in ways that prompt player choice without being too explicit
- Use tools in your narration and to update the character's JSON profile of rank, gold, level, rank, etc based on their progression (your function tools update these).
- Ensure continuity and that your messages are "forward-facing", in that they give the user ideas on things to do and not just recounting of a scenario.

Important elements of the Solo Leveling universe to maintain:
- The "System" that only the protagonist can see
- The Rank hierarchy (E through S)
- Hunter Guilds and the Hunters Association
- Gates/Dungeons containing monsters
- The protagonist's journey from weakest to strongest`,

            medium: `You are an NPC dialogue and logic processor in a Solo Leveling RPG simulator.
Your primary role is to generate authentic dialogue for NPCs and handle mid-level game logic.
When speaking as an NPC:
- Maintain their personality, background, and relationship with the player
- Only reference information the NPC would realistically know (most NPCs don't know about the player's System)
- Respond directly to the player's queries or actions
- Keep dialogue concise and character-appropriate

For logic operations:
- Evaluate player actions objectively based on the game state
- Determine logical outcomes of interactions
- Apply the rules of the Solo Leveling universe consistently`,

            light: `You are a utility processor for a Solo Leveling RPG simulator.
Your role is to provide fast, structured responses for:
- Validating player actions against the game state
- Extracting structured data from narrative text
- Evaluating state changes needed after events
- Summarizing events for memory/history

Always return data in valid JSON format exactly as specified in the prompt.
Be concise, accurate, and focus only on the task at hand.
Ensure your outputs can be parsed directly as JSON.`,

        image: `You are an image generator for a Solo Leveling RPG simulator. Your sole task is to generate a manhwa-style background illustration based on the provided scene description and return it as an image. Do NOT return text descriptions, breakdowns, or suggestions—only generate and return the image data. Focus on:
- Environmental scenes, generate scenes without characters in a manhwa art style.
- A dark fantasy atmosphere matching Solo Leveling's visual style
- Strong contrast with dramatic lighting
- NO PEOPLE or characters, just the background
- Clean, detailed linework with rich colors.`
        };

        // We will instantiate the GeminiApiClient when needed (on first API call)
        this.apiClient = null;
    }
    
    /**
     * Initialize the model manager (verify API key availability)
     * @returns {Promise<boolean>} - Success status
     */
    async initialize() {
        try {
            if (!this.apiKey) {
                throw new Error('No API key provided');
            }
            // We could test a simple API call here to verify the key, but it's not required.
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize ModelManager:', error);
            throw error;
        }
    }
    
    /**
     * Internal helper to call a specific Gemini model with appropriate prompts.
     * @param {string} modelType - 'heavy', 'medium', 'light', or 'image'
     * @param {Object} params - Parameters for the call (prompt content, context, etc.)
     * @returns {Promise<Object|string>} - The model response. For text models, returns an object or string (depending on structure); for images, returns a data URL string.
     */
    async _callModel(modelType, params) {
        try {
            if (!this.isInitialized) {
                throw new Error('ModelManager is not initialized');
            }
            const model = this.models[modelType];
            if (!model) {
                throw new Error(`Unknown model type: ${modelType}`);
            }
            // Ensure a system prompt is set for context (if not provided explicitly)
            if (!params.systemPrompt && this.systemPrompts[modelType]) {
                params.systemPrompt = this.systemPrompts[modelType];
            }
            
            // Prepare the user prompt for the model call
            const systemPrompt = params.systemPrompt || '';
            let userPrompt = '';
            const config = params.config || {};
            let tools = null;  // Tools for function calling (if needed)
            
            if (modelType === 'heavy') {
                if (params.isOpeningSequence) {
                    userPrompt = params.initialContext 
                        ? `${params.initialContext} Narrate the opening scene, narrate in a way that they get ideas of potential actions.`
                        : `The story begins as Sung Jinwoo awakens in a hospital after surviving a deadly double dungeon incident. Narrate the opening scene in detail.`;
                } else if (params.context) {
                    // Include current context: scene memory, location, recent NPC dialogue, and player action
                    const ctx = params.context;
                    let contextDesc = '';
                    if (ctx.sceneMemory) {
                        contextDesc += ctx.sceneMemory.trim() + ' ';  // short summary of last scene
                    }
                    if (ctx.location || ctx.time) {
                        contextDesc += `Location: ${ctx.location || ''}${ctx.time ? ', ' + ctx.time : ''}. `;
                    }
                    if (ctx.npcResponse) {
                        // Include any NPC dialogue that just occurred
                        const speaker = ctx.npcName || 'The NPC';
                        contextDesc += `${speaker} said: "${ctx.npcResponse}" `;
                    }
                    if (params.playerAction) {
                        // Mention what Jinwoo (the player) just did
                        contextDesc += `Jinwoo's action: ${params.playerAction}. `;
                    }
                    // Final instruction for narration continuation
                    userPrompt = `${contextDesc}\nContinue the story narration, focusing on the consequences of the above and the next developments.`;
                } else {
                    // Fallback (no specific context provided, just use the action if available)
                    if (params.playerAction) {
                        userPrompt = `Jinwoo's action: ${params.playerAction}. Narrate what happens next.`;
                    } else {
                        userPrompt = 'Continue the story from the current situation.';
                    }
                }
            } else if (modelType === 'medium') {
                const npcName = params.npcName || 'The NPC';
                const playerAct = params.playerAction || '';
                let npcInfo = '';
                if (params.npcState && params.npcState.relationship) {
                    npcInfo += `${npcName}'s attitude toward Jinwoo is "${params.npcState.relationship}". `;
                }
                if (params.npcState && params.npcState.knowsAboutSystem !== undefined) {
                    if (!params.npcState.knowsAboutSystem) {
                        npcInfo += `${npcName} is not aware of Jinwoo's mysterious System interface. `;
                    }
                }
                userPrompt = `${npcInfo}Jinwoo's action: ${playerAct}. Provide only ${npcName}'s spoken dialogue as a direct response, enclosed in quotes (e.g., "What do you want?").`;
            } else if (modelType === 'light') {
                // Build the prompt for the utility model (light) tasks
                if (params.purpose === 'validate') {
                    // Validate a player action against the current context and output JSON
                    const ctx = params.context || {};
                    const actionText = params.playerAction;
                    userPrompt = `Validate the player's action given the context.\nAction: "${actionText}"\nContext: ${JSON.stringify(ctx)}\nRespond with a JSON object with keys: valid (boolean), reason (string), involveNPC (boolean), npcName (string), newScene (boolean, true if the action has lead to a new physical scene for Sung Jinwoo i.e., hospital -> home, "true".).`;
                    // Ask for JSON output explicitly
                    config.responseMimeType = 'application/json';
                    config.maxOutputTokens = 200;
                } else if (params.purpose === 'extractChanges') {
                    // Extract structured changes from a narrative text
                    const narrative = params.narrative || '';
                    userPrompt = `Analyze the following narrative and extract any game state changes (experience gain, gold gain, items gained, HP change) as a JSON object with keys: experience_gain, gold_gain, items_gain, hp_change.\nNarrative: "${narrative}"\nJSON:`;
                    config.responseMimeType = 'application/json';
                    config.maxOutputTokens = 200;
                } else {
                    // Default light model usage (if any other utility function)
                    userPrompt = params.prompt || '';
                    config.maxOutputTokens = params.maxOutputTokens || 256;
                }
            } else if (modelType === 'image') {
                // For image generation, the user prompt is just the description of the scene
                userPrompt = params.prompt;
            }
            
            // Initialize the API client if not already done
            if (!this.apiClient) {
                this.apiClient = new GeminiApiClient(this.apiKey);
            }
            
            if (modelType === 'image') {
                // Call the Gemini image generation model with system prompt
                const imageDataUrl = await this.apiClient.generateImage(model, userPrompt, {
                    systemPrompt: params.systemPrompt,
                    ...config
                });
                return imageDataUrl;  // return the base64 data URL for the image
            } else {
                // Call a text-generating model (heavy, medium, or light)
                const result = await this.apiClient.generateContent(model, systemPrompt, userPrompt, config, tools);
                
                // Handle function call outputs if any (tools can return structured data or state changes)
                if (result.functionCalls && result.functionCalls.length > 0) {
                    let combinedChanges = {};
                    for (const call of result.functionCalls) {
                        if (call.name === 'update_state' && call.parameters.changes) {
                            combinedChanges = { ...combinedChanges, ...call.parameters.changes };
                        }
                        if (call.name === 'update_character_profile' && call.parameters) {
                            // Map update_character_profile parameters to player state
                            combinedChanges.player = combinedChanges.player || {};
                            combinedChanges.player.rank = call.parameters.rank || combinedChanges.player.rank;
                            combinedChanges.player.level = call.parameters.level || combinedChanges.player.level;
                            combinedChanges.player.HP = call.parameters.hp || combinedChanges.player.HP;
                            combinedChanges.player.MP = call.parameters.mp || combinedChanges.player.MP;
                            combinedChanges.player.gold = call.parameters.gold || combinedChanges.player.gold;
                            if (call.parameters.inventory) {
                                combinedChanges.player.inventory = call.parameters.inventory;
                            }
                            if (call.parameters.skills) {
                                combinedChanges.player.skills = call.parameters.skills;
                            }
                        }
                        if (call.name === 'update_inventory' && call.parameters.items) {
                            combinedChanges.player = combinedChanges.player || {};
                            if (call.parameters.action === 'add') {
                                combinedChanges.player.inventoryAdd = (combinedChanges.player.inventoryAdd || []).concat(call.parameters.items);
                            } else if (call.parameters.action === 'remove') {
                                combinedChanges.player.inventoryRemove = (combinedChanges.player.inventoryRemove || []).concat(call.parameters.items);
                            }
                        }
                        if (call.name === 'complete_quest' && call.parameters.completedQuest) {
                            combinedChanges.quests = combinedChanges.quests || {};
                            combinedChanges.quests.completeQuest = call.parameters.completedQuest;
                            if (call.parameters.newQuest) {
                                combinedChanges.quests.current = call.parameters.newQuest;
                            }
                        }
                        if (call.name === 'log_event' && call.parameters.event) {
                            combinedChanges.history = (combinedChanges.history || []).concat(call.parameters.event);
                        }
                    }
                    // Prepare response object including any text and state changes from function calls
                    const responseObj = {
                        text: result.text || '',
                        stateChanges: Object.keys(combinedChanges).length > 0 ? combinedChanges : undefined
                    };
                    // Filter out tool_code from narration
                    if (responseObj.text.includes('```tool_code')) {
                        responseObj.text = responseObj.text.split('```tool_code')[0].trim();
                    }
                    if (modelType === 'heavy') {
                        responseObj.narration = responseObj.text;
                        delete responseObj.text;
                    } else if (modelType === 'medium') {
                        responseObj.dialogue = responseObj.text;
                        delete responseObj.text;
                    }
                    return responseObj;
                }
                // No function calls; return the model's direct output in the expected format
                if (modelType === 'heavy') {
                    // Heavy model returns a narration string
                    return { narration: result.text || '' };
                } else if (modelType === 'medium') {
                    // Medium model returns NPC dialogue text
                    return { dialogue: result.text || '' };
                } else if (modelType === 'light') {
                    // Light model may return a JSON string or plain text. Try to parse if JSON.
                    let textOut = result.text || '';
                    if (textOut.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(textOut);
                            return parsed;
                        } catch {
                            // If JSON parsing fails, we'll convert the text to a reason below
                        }
                    }
                    // If it's not JSON, return an object marking the action invalid with the text as the reason
                    return {
                        valid: false,
                        reason: textOut.trim() || 'Invalid action or response format.',
                        involveNPC: false
                    };
                } else {
                    // For any other model type (not expected), return raw text
                    return result.text || '';
                }
            }
        } catch (error) {
            console.error(`Error calling ${modelType} model:`, error);
            throw error;
        }
    }
    
    /**
     * Validate a player's action against the current game state using the light model.
     * @param {string} action - The player's action input.
     * @param {Object} gameState - Current game state.
     * @returns {Promise<Object>} - Validation result (e.g., {valid: true, involveNPC: false, ...}).
     */
    async validatePlayerAction(action, gameState) {
        // Prepare context for validation (e.g., location, player stats/inventory)
        const validationContext = {
            location: gameState.world.location,
            playerRank: gameState.player.rank,
            playerLevel: gameState.player.level,
            inventory: gameState.player.inventory.map(item => item.name)
        };
        // Use the light model to validate the action and get a structured JSON result
        return await this._callModel('light', {
            purpose: 'validate',
            playerAction: action,
            context: validationContext
        });
    }
    
    /**
     * Generate an NPC's response to the player's action using the medium model.
     * @param {string} npcName - Name of the NPC.
     * @param {string} playerAction - The player's action text.
     * @param {Object} npcState - Current state of the NPC (e.g., relationship, knowledge).
     * @param {Object} sceneContext - Context of the current scene.
     * @returns {Promise<Object>} - NPC response containing dialogue (and optional npcChanges).
     */
    async generateNPCResponse(npcName, playerAction, npcState, sceneContext) {
        // Call the medium model for NPC dialogue; result will have {dialogue, ...}
        return await this._callModel('medium', {
            npcName,
            playerAction,
            npcState,
            sceneContext
        });
    }
    
    /**
     * Generate narration for the outcome of a player action using the heavy model.
     * @param {string} playerAction - The player's action.
     * @param {Object|null} npcResponse - The NPC response object if an NPC was involved, otherwise null.
     * @param {Object} gameState - Current game state.
     * @param {Object} sceneContext - Additional scene context (e.g., sceneMemory, location, time).
     * @param {string|null} npcName - The name of the NPC involved (if any).
     * @returns {Promise<Object>} - Narration result containing the narration text and any state changes.
     */
    async generateNarration(playerAction, npcResponse, gameState, sceneContext, npcName = null) {
        // Prepare context object to send to the heavy model
        let tokenCount = 0;
        const recentEntries = [];
        for (let i = gameState.state.conversationHistory.length - 1; i >= 0 && tokenCount < 20000; i--) {
            const entry = gameState.state.conversationHistory[i];
            tokenCount += entry.tokens;
            if (tokenCount <= 20000) recentEntries.unshift(entry);
        }
        const recentHistory = recentEntries.map(entry => `${entry.role}: ${entry.text}`).join('\n');
        const allSummaries = gameState.state.summaries.map(summary => `${summary.role}: ${summary.text}`).join('\n');
        const narrativeContext = {
            playerAction,
            npcResponse: npcResponse?.dialogue,
            npcName: npcName,
            playerName: gameState.state.player.name,
            playerRank: gameState.state.player.rank,
            playerLevel: gameState.state.player.level,
            location: gameState.state.world.location,
            time: gameState.state.world.time,
            recentHistory,
            allSummaries
        };
        // Call the heavy model for narrative continuation
        return await this._callModel('heavy', {
            context: narrativeContext,
            playerAction
        });
    }
    
    /**
     * Generate the opening sequence narration for a new game using the heavy model.
     * @returns {Promise<Object>} - Opening sequence result containing narration text and initial state changes.
     */
    async generateOpeningSequence() {
        const result = await this._callModel('heavy', {
            isOpeningSequence: true,
            initialContext: this.gameState ? this.gameState.getInitialContext() : "Jinwoo has just awakened..."
        });
        return {
            narration: result.narration,
            stateChanges: result.stateChanges,
            shouldGenerateImage: true, // Always generate for opening
            imagePrompt: "A hospital room in Seoul Ilshin Hospital, morning light filtering through blinds, sterile and quiet, Solo Leveling manhwa-style dark fantasy atmosphere"
        };
    }
    
    /**
     * Generate narration to continue the story after loading a saved game.
     * @param {Object} gameState - The loaded game state.
     * @returns {Promise<string>} - Continuation narration text.
     */
    async generateContinuationNarration(gameState) {
        // Provide the current state context to the heavy model to resume the story
        const recentHistory = gameState.state.conversationHistory.map(entry => `${entry.role}: ${entry.text}`).join('\n');
        const allSummaries = gameState.state.summaries.map(summary => `${summary.role}: ${summary.text}`).join('\n');
        const narrativeContext = {
            isContinuation: true,
            playerName: gameState.player.name,
            playerRank: gameState.player.rank,
            playerLevel: gameState.player.level,
            location: gameState.world.location,
            time: gameState.world.time,
            recentHistory,
            allSummaries
        };
        const result = await this._callModel('heavy', { context: narrativeContext });
        // Return the narration text (or a default line if somehow none returned)
        return result.narration || result.text || "You continue your journey...";
    }
    
    /**
     * Generate an image for the given scene description using the Gemini image model.
     * @param {string} imagePrompt - A descriptive prompt for the scene.
     * @returns {Promise<string>} - A Data URL string for the generated image.
     */
    async generateImage(imagePrompt) {
        try {
            const imageUrl = await this._callModel('image', { prompt: imagePrompt });
            return imageUrl; // Returns a URL directly usable by the UI
        } catch (error) {
            console.error('Gemini image generation error:', error);
            throw error;
        }
    }
        /**
     * Summarize a chunk of conversation history using the light model.
     * @param {Array<string>} entries - Array of text entries to summarize.
     * @returns {Promise<string>} - Summary text.
     */
        async summarizeHistory(entries) {
            const userPrompt = `Summarize the following under 50 words:\n${entries.join('\n')}`;
            const result = await this._callModel('light', { 
                prompt: userPrompt,
                systemPrompt: this.systemPrompts.light // Use existing light system prompt
            });
            return result.text || "Summary unavailable.";
        }
}
