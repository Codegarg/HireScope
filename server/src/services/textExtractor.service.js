import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const extractTextFromFile = async (file) => {
  try {
    if (!file || !file.path) return "";

    const buffer = fs.readFileSync(file.path);
    const data = await pdfParse(buffer);

    return data.text || "";
  } catch (error) {
    console.error("Text extraction failed:", error);
    return "";
  }
};
