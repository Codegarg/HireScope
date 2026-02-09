import fs from "fs";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

export const extractTextFromFile = async (file) => {
  try {
    if (!file || !file.path) return "";

    const buffer = fs.readFileSync(file.path);
    const extension = file.originalname.split(".").pop().toLowerCase();

    if (extension === "pdf") {
      const data = await pdfParse(buffer);
      return data.text || "";
    } else if (extension === "docx" || extension === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } else if (extension === "txt") {
      return buffer.toString("utf8");
    }

    return "";
  } catch (error) {
    console.error(`Text extraction failed for ${file.originalname}:`, error);
    return "";
  }
};
