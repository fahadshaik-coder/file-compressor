const fs = require("fs");
const path = require("path");

async function renderFirstPage() {
    try {
        const mupdf = await import("mupdf");

        const uploadsDir = path.join(__dirname, "uploads");

        const files = fs.readdirSync(uploadsDir);

        if (files.length === 0) {
            console.log("No uploaded files found.");
            return;
        }

        const inputFile = files[files.length - 1];
        const inputPath = path.join(uploadsDir, inputFile);

        const outputPath = path.join(
            __dirname,
            "rendered-page.png"
        );

        console.log("Using uploaded file:", inputFile);

        const pdfBytes = fs.readFileSync(inputPath);

        const pdf = mupdf.PDFDocument.openDocument(
            pdfBytes,
            "application/pdf"
        );

        console.log("PDF opened!");
        console.log("Pages:", pdf.countPages());

        const page = pdf.loadPage(0);

        const matrix = mupdf.Matrix.scale(2, 2);

        const pixmap = page.toPixmap(
            matrix,
            mupdf.ColorSpace.DeviceRGB,
            false,
            true
        );

        const pngData = pixmap.asPNG();

        fs.writeFileSync(outputPath, pngData);

        console.log("First page rendered successfully!");
        console.log("Output:", outputPath);

    } catch (error) {
        console.error("Rendering failed:", error);
    }
}

renderFirstPage();