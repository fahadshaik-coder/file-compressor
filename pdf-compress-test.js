const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

async function compressTest() {
    const uploadsDir = path.join(__dirname, "uploads");

    const files = fs.readdirSync(uploadsDir);

    if (files.length === 0) {
        console.log("No PDF found.");
        return;
    }

    const inputFile = files[files.length - 1];
    const inputPath = path.join(uploadsDir, inputFile);

    const outputPath = path.join(
        uploadsDir,
        "test-compressed.pdf"
    );

    // Read original PDF
    const pdfBytes = fs.readFileSync(inputPath);

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Save a new PDF
    const compressedBytes = await pdfDoc.save({
        useObjectStreams: true
    });

    // Write new PDF
    fs.writeFileSync(outputPath, compressedBytes);

    // Calculate sizes
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;

    console.log("Original:", (originalSize / 1024 / 1024).toFixed(2), "MB");
    console.log("New:", (compressedSize / 1024 / 1024).toFixed(2), "MB");

    const saved =
        ((originalSize - compressedSize) / originalSize) * 100;

    console.log("Size change:", saved.toFixed(2), "%");
}

compressTest();