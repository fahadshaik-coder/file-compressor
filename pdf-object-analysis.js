const fs = require("fs");
const path = require("path");

async function analyzePDF() {
    try {
        const mupdf = await import("mupdf");

        const uploadsDir = path.join(__dirname, "uploads");

        const pdfFiles = fs.readdirSync(uploadsDir)
            .filter(file => /\.pdf$/i.test(file));

        if (pdfFiles.length === 0) {
            console.log("No PDF files found.");
            return;
        }

        const inputFile = pdfFiles
            .map(file => ({
                name: file,
                path: path.join(uploadsDir, file),
                modified: fs.statSync(
                    path.join(uploadsDir, file)
                ).mtimeMs
            }))
            .sort((a, b) => b.modified - a.modified)[0];

        console.log("Analyzing:", inputFile.name);

        const pdfBytes = fs.readFileSync(inputFile.path);

        const pdf = mupdf.PDFDocument.openDocument(
            pdfBytes,
            "application/pdf"
        );

        console.log("Pages:", pdf.countPages());
        console.log("Objects:", pdf.countObjects());

    } catch (error) {
        console.error(
            "Analysis failed:",
            error
        );
    }
}

analyzePDF();