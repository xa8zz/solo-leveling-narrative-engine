/**
 * API Key Manager
 * 
 * Handles storing and retrieving the Gemini API key securely in local storage.
 * The key is stored using browser localStorage with simple encryption.
 */
class ApiKeyManager {
    constructor() {
        this.storageKey = 'solo_leveling_api_key';
        this.encryptionKey = 'solo_leveling_simulator'; // Simple encryption key
    }
    
    /**
     * Save API key to localStorage with simple encryption
     * @param {string} apiKey - The Gemini API key to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveApiKey(apiKey) {
        try {
            if (!apiKey) return false;
            
            // Simple encryption (not truly secure, but better than plaintext)
            const encryptedKey = this._encryptString(apiKey);
            localStorage.setItem(this.storageKey, encryptedKey);
            
            console.log('API key saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save API key:', error);
            return false;
        }
    }
    
    /**
     * Retrieve API key from localStorage and decrypt it
     * @returns {Promise<string|null>} - The decrypted API key or null if not found
     */
    async getApiKey() {
        try {
            const encryptedKey = localStorage.getItem(this.storageKey);
            if (!encryptedKey) return null;
            
            return this._decryptString(encryptedKey);
        } catch (error) {
            console.error('Failed to retrieve API key:', error);
            return null;
        }
    }

    async clearApiKey() {
        localStorage.removeItem('geminiApiKey');
        console.log('API key cleared');
    }
    
    /**
     * Clear the saved API key
     * @returns {Promise<boolean>} - Success status
     */
    async clearApiKey() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to clear API key:', error);
            return false;
        }
    }
    
    /**
     * Simple XOR encryption for the API key
     * Note: This is not secure cryptography, just obfuscation to avoid plaintext
     * @param {string} text - Text to encrypt
     * @returns {string} - Encrypted text in base64
     * @private
     */
    _encryptString(text) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result); // Convert to base64
    }
    
    /**
     * Simple XOR decryption for the API key
     * @param {string} encryptedText - Base64 encrypted text
     * @returns {string} - Decrypted text
     * @private
     */
    _decryptString(encryptedText) {
        const text = atob(encryptedText); // Convert from base64
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
}
