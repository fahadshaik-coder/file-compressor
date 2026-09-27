const fs = require("fs");
const path = require("path");

async function testNativeSave() {
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

        // MuPDF creates its own Buffer object
        const mupdfBuffer =
            pdf.saveToBuffer();

        // Convert MuPDF Buffer → Uint8Array
        const savedBytes =
            mupdfBuffer.asUint8Array();

        console.log(
            "MuPDF save completed."
        );

        console.log(
            "Saved:",
            (savedBytes.length / 1024).toFixed(2),
            "KB"
        );

        // Create output filename dynamically
        const outputName =
            `${path.parse(inputFile.name).name}-mupdf.pdf`;

        const outputPath =
            path.join(__dirname, outputName);

        // Uint8Array can be written by Node.js
        fs.writeFileSync(
            outputPath,
            savedBytes
        );

        console.log(
            "Output:",
            outputName
        );

        // Compare sizes
        const difference =
            inputBytes.length - savedBytes.length;

        const reduction =
            (difference / inputBytes.length) * 100;

        console.log("\n===== RESULT =====");

        console.log(
            "Original:",
            (inputBytes.length / 1024).toFixed(2),
            "KB"
        );

        console.log(
            "MuPDF:",
            (savedBytes.length / 1024).toFixed(2),
            "KB"
        );

        if (savedBytes.length < inputBytes.length) {

            console.log(
                "Size reduction:",
                reduction.toFixed(2),
                "%"
            );

        } else {

            console.log(
                "MuPDF output is larger."
            );

            console.log(
                "Size increase:",
                Math.abs(reduction).toFixed(2),
                "%"
            );
        }

        console.log("==================");

    } catch (error) {
        console.error(
            "Native save failed:"
        );

        console.error(error);
    }
}

testNativeSave();