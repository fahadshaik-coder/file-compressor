const fs = require("fs");
const path = require("path");

async function testMuPDFSave() {
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

        console.log("Input:", inputFile.name);

        const inputBytes =
            fs.readFileSync(inputFile.path);

        console.log(
            "Original:",
            (inputBytes.length / 1024).toFixed(2),
            "KB"
        );

        const pdf =
            mupdf.PDFDocument.openDocument(
                inputBytes,
                "application/pdf"
            );

        console.log(
            "Pages:",
            pdf.countPages()
        );

        console.log(
            "MuPDF PDF object opened successfully."
        );

        console.log(
            "Available save-related methods:"
        );

        console.log(
            Object.getOwnPropertyNames(
                Object.getPrototypeOf(pdf)
            ).filter(name =>
                name.toLowerCase().includes("save") ||
                name.toLowerCase().includes("write")
            )
        );

    } catch (error) {
        console.error(
            "MuPDF save test failed:",
            error
        );
    }
}

testMuPDFSave();