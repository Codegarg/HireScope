import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export const extractText = async (file) => {
  if (!file) throw new Error("File is required");

  const { mimetype, buffer } = file;

  // ===== PDF (Node-safe legacy build) =====
  if (mimetype === "application/pdf") {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
    });

    const pdf = await loadingTask.promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      text += strings.join(" ") + "\n";
    }

    return text;
  }

  // ===== DOCX =====
  if (
    mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // ===== TXT =====
  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type");
};
