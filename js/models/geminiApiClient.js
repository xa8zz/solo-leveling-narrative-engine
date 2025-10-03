/**
 * Gemini API Client
 * 
 * Handles direct communication with the Google Gemini API.
 * This module abstracts the actual API calls and error handling.
 */
class GeminiApiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        
        // Check if API key is provided
        if (!apiKey) {
            throw new Error('API key is required');
        }
    }
    
    /**
     * Generate content using a text model
     * @param {string} model - Model ID
     * @param {string} systemPrompt - System prompt
     * @param {string} userPrompt - User prompt
     * @param {Object} config - Generation config
     * @param {Array} tools - Functions available to the model (optional)
     * @returns {Promise<Object>} - API response
     */
    async generateContent(model, systemPrompt, userPrompt, config = {}, tools = null) {
        try {
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
            
            // Combine system and user prompts into a single "user" role entry
            const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;
            
            const requestBody = {
                system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userPrompt }]
                    }
                ],
                generationConfig: {
                    temperature: config.temperature || 0.7,
                    topP: config.topP || 0.95,
                    topK: config.topK || 40,
                    maxOutputTokens: config.maxOutputTokens || 1024,
                    stopSequences: config.stopSequences || []
                }
            };
            
            if (tools && tools.length > 0) {
                requestBody.tools = tools;
                requestBody.toolConfig = {
                    functionCallingConfig: {
                        mode: config.functionCallingMode || 'AUTO'
                    }
                };
            }
            
            if (config.responseMimeType) {
                requestBody.generationConfig.responseMimeType = config.responseMimeType;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`API error: ${data.error?.message || 'Unknown error'}`);
            }
            
            return this._processResponse(data);
            
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
    
    async generateImage(model, prompt, config = {}) {
        try {
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
            
            // Enhanced system prompt to force image generation
            const systemPrompt = config.systemPrompt || `You are an image generator for a Solo Leveling RPG simulator. Your sole task is to generate a manhwa-style background illustration based on the provided scene description and return it as an image. Do NOT return text descriptions, breakdowns, or suggestions—only generate and return the image data. Focus on:
- Environmental scenes (dungeons, cityscapes, interiors)
- A dark fantasy atmosphere matching Solo Leveling's visual style
- Strong contrast with dramatic lighting
- NO PEOPLE or characters, just the background
- Clean, detailed linework with rich colors
Return the image as inlineData with mimeType and base64 data.`;

            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\nGenerate an image of: ${prompt}` }]
                    }
                ],
                generationConfig: {
                    temperature: config.temperature || 0.4,
                    topP: config.topP || 1.0,
                    topK: config.topK || 32,
                    responseModalities: ['TEXT', 'IMAGE']
                }
            };

            // Debug: Log the request
            console.log('Image generation request:', JSON.stringify(requestBody, null, 2));

            // Make the API call
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }

            // Parse JSON response
            const data = await response.json();

            // Debug: Log the full response
            console.log('Full API response for image generation:', JSON.stringify(data, null, 2));

            // Extract image data from inlineData
            const imageData = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imageData && imageData.inlineData) {
                return `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`;
            } else {
                throw new Error('No image data in response');
            }

        } catch (error) {
            console.error('Gemini image generation error:', error);
            throw error;
        }
    }
    
    /**
     * Process and format the API response
     * @param {Object} response - Raw API response
     * @returns {Object} - Processed response
     * @private
     */
    _processResponse(response) {
        try {
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error('No candidates in response');
            }
            
            const candidate = response.candidates[0];
            
            // Check for function call
            if (candidate.content.parts && candidate.functionCalls) {
                // Handle function calling
                return {
                    text: candidate.content.parts[0]?.text || '',
                    functionCalls: candidate.functionCalls.map(call => ({
                        name: call.name,
                        parameters: call.args || {}
                    }))
                };
            }
            
            // Handle text response
            if (candidate.content.parts && candidate.content.parts.length > 0) {
                return {
                    text: candidate.content.parts[0]?.text || ''
                };
            }
            
            throw new Error('Invalid response format');
            
        } catch (error) {
            console.error('Error processing API response:', error);
            throw error;
        }
    }
}