const fs = require("fs");
const path = require("path");

async function analyzePDF(filePath) {
    const mupdf = await import("mupdf");

    const pdfBytes = fs.readFileSync(filePath);

    const pdf = mupdf.PDFDocument.openDocument(
        pdfBytes,
        "application/pdf"
    );

    console.log("PDF opened successfully!");
    console.log("Pages:", pdf.countPages());

    for (let i = 0; i < pdf.countPages(); i++) {
        const page = pdf.loadPage(i);

        console.log(`Page ${i + 1} loaded`);

        // Get page contents/resources
        const pageObject = page.getObject();

        console.log("Page object:", pageObject);
    }
}