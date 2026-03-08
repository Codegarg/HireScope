/**
 * Shared layout constants for HireScope resume rendering.
 * Used by both the frontend (ResumeLayout.jsx) and backend (pdfGenerator.service.js)
 * to ensure pixel-perfect parity and consistent auto-scaling.
 */

export const LAYOUT_CONFIG = {
    // Page dimensions (A4 at 72 DPI for PDFKit, roughly translates to px)
    PAGE_WIDTH: 595.28,
    PAGE_HEIGHT: 841.89,

    // Recommended A4 pixel height at 96 DPI (for HTML/CSS measurement)
    HTML_A4_HEIGHT_PX: 1120,

    // Margins
    MARGINS: {
        TOP: 40,
        BOTTOM: 40,
        LEFT: 50,
        RIGHT: 50
    },

    // Typography (in points)
    FONT_SIZE: {
        BASE: 11,
        MIN: 8.5,
        MAX: 13,
        HEADER: 22,
        SECTION_TITLE: 13
    },

    // Spacing
    SPACING: {
        LINE_GAP: 3,
        PARAGRAPH_GAP: 8,
        SECTION_GAP: 15
    }
};

/**
 * Calculates a scale factor to fit content into one page.
 * @param {number} currentHeight - The measured height of the content
 * @param {number} targetHeight - The available height on one page
 * @returns {number} Scale factor (e.g., 0.9 for 90% size)
 */
export const calculateFitScale = (currentHeight, targetHeight) => {
    if (currentHeight <= targetHeight) {
        // If it fits and is very short, we can grow it slightly (up to 1.15)
        if (currentHeight < targetHeight * 0.7) return 1.15;
        return 1.0;
    }

    // Calculate required shrink ratio
    const ratio = targetHeight / currentHeight;
    // Clamp to minimum readable scale
    return Math.max(0.75, ratio * 0.98); // 0.98 buffer for safety
};
