const fs = require("fs");
const path = require("path");

async function inspectPDF() {

    const mupdf = await import("mupdf");

    const uploadsDir = path.join(__dirname, "uploads");

    const files = fs.readdirSync(uploadsDir);

    if (files.length === 0) {
        console.log("No files found in uploads folder.");
        return;
    }

    const fileName = files[files.length - 1];

    const filePath = path.join(uploadsDir, fileName);

    console.log("Opening:", fileName);

    const pdfBytes = fs.readFileSync(filePath);

    const pdf = mupdf.PDFDocument.openDocument(
        pdfBytes,
        "application/pdf"
    );

    console.log("PDF opened successfully!");
    console.log("Number of pages:", pdf.countPages());
}

inspectPDF();