const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

async function readPDF() {
    const pdfBytes = fs.readFileSync("uploads/52224e30d6d39a524748f77e2513d895");

    const pdfDoc = await PDFDocument.load(pdfBytes);

    console.log("PDF loaded successfully!");
    console.log("Number of pages:", pdfDoc.getPageCount());
}

readPDF();
