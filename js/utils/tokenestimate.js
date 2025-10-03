/**
 * Estimates the number of tokens in a text string.
 * @param {string} text - The text to estimate tokens for.
 * @returns {number} - Estimated token count.
 */
function estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.33);
};

window.estimateTokens = estimateTokens; // Attach to global window object