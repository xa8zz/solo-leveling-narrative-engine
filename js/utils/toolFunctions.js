/**
 * Tool Functions
 * 
 * Defines functions that can be called by Gemini models using function calling.
 * These tools help models manipulate game state and perform specific operations.
 */

class ToolFunctions {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Define available tools for function calling
        this.tools = [
            {
                name: 'update_state',
                description: 'Update the game state with specific changes',
                parameters: {
                    type: 'object',
                    properties: {
                        changes: {
                            type: 'object',
                            description: 'Changes to apply to the game state'
                        }
                    },
                    required: ['changes']
                }
            },
            {
                name: 'update_inventory',
                description: 'Add or remove items from the player inventory',
                parameters: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['add', 'remove'],
                            description: 'Whether to add or remove items'
                        },
                        items: {
                            type: 'array',
                            description: 'Items to add or remove',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Item name'
                                    },
                                    quantity: {
                                        type: 'integer',
                                        description: 'Quantity to add or remove'
                                    },
                                    type: {
                                        type: 'string',
                                        description: 'Item type (weapon, consumable, etc.)'
                                    },
                                    description: {
                                        type: 'string',
                                        description: 'Item description'
                                    }
                                },
                                required: ['name', 'quantity']
                            }
                        }
                    },
                    required: ['action', 'items']
                }
            },
            {
                name: 'complete_quest',
                description: 'Mark a quest as completed and optionally start a new one',
                parameters: {
                    type: 'object',
                    properties: {
                        completedQuest: {
                            type: 'string',
                            description: 'Name of the quest to mark as completed'
                        },
                        newQuest: {
                            type: 'string',
                            description: 'Name of the new quest to start (optional)'
                        }
                    },
                    required: ['completedQuest']
                }
            },
            {
                name: 'log_event',
                description: 'Log an important event to the game history',
                parameters: {
                    type: 'object',
                    properties: {
                        event: {
                            type: 'string',
                            description: 'Description of the event to log'
                        }
                    },
                    required: ['event']
                }
            },
            {
                name: 'extract_state_changes',
                description: 'Extract structured state changes from narrative text',
                parameters: {
                    type: 'object',
                    properties: {
                        narrative: {
                            type: 'string',
                            description: 'Narrative text to analyze'
                        }
                    },
                    required: ['narrative']
                }
            }
        ];
    }
    
    /**
     * Get the tools definition for function calling
     * @returns {Array} - Array of tool definitions
     */
    getToolsDefinition() {
        return this.tools;
    }
    
    /**
     * Execute a tool function
     * @param {string} functionName - Name of the function to execute
     * @param {Object} parameters - Function parameters
     * @returns {Object} - Function result
     */
    executeFunction(functionName, parameters) {
        switch (functionName) {
            case 'update_state':
                return this.updateState(parameters.changes);
                
            case 'update_inventory':
                return this.updateInventory(parameters.action, parameters.items);
                
            case 'complete_quest':
                return this.completeQuest(parameters.completedQuest, parameters.newQuest);
                
            case 'log_event':
                return this.logEvent(parameters.event);
                
            case 'extract_state_changes':
                return this.extractStateChanges(parameters.narrative);
                
            default:
                throw new Error(`Unknown function: ${functionName}`);
        }
    }
    
    /**
     * Update the game state
     * @param {Object} changes - Changes to apply to the state
     * @returns {Object} - Result of the operation
     */
    updateState(changes) {
        try {
            this.gameState.updateState(changes);
            return {
                success: true,
                message: 'State updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update state: ${error.message}`
            };
        }
    }
    
    /**
     * Update the player's inventory
     * @param {string} action - 'add' or 'remove'
     * @param {Array} items - Items to add or remove
     * @returns {Object} - Result of the operation
     */
    updateInventory(action, items) {
        try {
            if (action === 'add') {
                this.gameState.updateState({
                    player: {
                        inventoryAdd: items
                    }
                });
            } else if (action === 'remove') {
                this.gameState.updateState({
                    player: {
                        inventoryRemove: items
                    }
                });
            } else {
                throw new Error(`Invalid action: ${action}`);
            }
            
            return {
                success: true,
                message: `Items ${action === 'add' ? 'added to' : 'removed from'} inventory`
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update inventory: ${error.message}`
            };
        }
    }
    
    /**
     * Complete a quest and optionally start a new one
     * @param {string} completedQuest - Quest to complete
     * @param {string} newQuest - New quest to start (optional)
     * @returns {Object} - Result of the operation
     */
    completeQuest(completedQuest, newQuest) {
        try {
            const changes = {
                quests: {
                    completeQuest: completedQuest
                }
            };
            
            if (newQuest) {
                changes.quests.current = newQuest;
            }
            
            this.gameState.updateState(changes);
            
            return {
                success: true,
                message: `Quest "${completedQuest}" completed`
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to complete quest: ${error.message}`
            };
        }
    }
    
    /**
     * Log an event to the game history
     * @param {string} event - Event description
     * @returns {Object} - Result of the operation
     */
    logEvent(event) {
        try {
            this.gameState.updateState({
                history: [event]
            });
            
            return {
                success: true,
                message: 'Event logged to history'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to log event: ${error.message}`
            };
        }
    }
    
    /**
     * Extract state changes from narrative text
     * This would normally use the light model, but we'll simulate basic extraction here
     * @param {string} narrative - Narrative text
     * @returns {Object} - Extracted state changes
     */
    extractStateChanges(narrative) {
        // Simple pattern matching to extract common game elements
        // In a real implementation, this would call the light model
        
        const changes = {
            experience_gain: 0,
            gold_gain: 0,
            items_gain: [],
            hp_change: 0
        };
        
        // Very basic pattern matching for demo purposes
        if (narrative.match(/gained? (\d+) experience/i)) {
            changes.experience_gain = parseInt(narrative.match(/gained? (\d+) experience/i)[1]);
        }
        
        if (narrative.match(/gained? (\d+) gold/i)) {
            changes.gold_gain = parseInt(narrative.match(/gained? (\d+) gold/i)[1]);
        }
        
        if (narrative.match(/gained? .*?(potion|dagger|sword|shield|armor)/i)) {
            const itemMatch = narrative.match(/gained? .*?(potion|dagger|sword|shield|armor)/i);
            changes.items_gain.push({
                name: itemMatch[1].charAt(0).toUpperCase() + itemMatch[1].slice(1),
                quantity: 1
            });
        }
        
        if (narrative.match(/(lost|took) (\d+) .*?damage/i)) {
            changes.hp_change = -parseInt(narrative.match(/(lost|took) (\d+) .*?damage/i)[2]);
        }
        
        return changes;
    }
}
