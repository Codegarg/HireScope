// server/src/utils/textCleaner.util.js

export const cleanText = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
