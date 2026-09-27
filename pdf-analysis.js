const fs = require("fs");
const path = require("path");

async function analyzePDF() {
    try {
        const mupdf = await import("mupdf");

        const uploadsDir = path.join(__dirname, "uploads");

        if (!fs.existsSync(uploadsDir)) {
            console.log("Uploads folder not found.");
            return;
        }

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

        const pageCount = pdf.countPages();

        console.log("Pages:", pageCount);
        console.log("\n===== PAGE ANALYSIS =====");

        for (let i = 0; i < pageCount; i++) {

            console.log(`\nPage ${i + 1}`);

            const page = pdf.loadPage(i);

            console.log("Page loaded successfully");

            const bounds = page.getBounds();

            console.log(
                "Width:",
                bounds[2] - bounds[0]
            );

            console.log(
                "Height:",
                bounds[3] - bounds[1]
            );

            console.log("Rendering page...");

            const matrix = mupdf.Matrix.scale(1, 1);

            const pixmap = page.toPixmap(
                matrix,
                mupdf.ColorSpace.DeviceRGB,
                false,
                true
            );

            console.log("Page rendered successfully");

            console.log(
                "Rendered width:",
                pixmap.getWidth()
            );

            console.log(
                "Rendered height:",
                pixmap.getHeight()
            );
        }

        console.log("\n=========================");
        console.log("Analysis complete!");

    } catch (error) {
        console.error("\nAnalysis failed:");
        console.error(error);
    }
}

analyzePDF();