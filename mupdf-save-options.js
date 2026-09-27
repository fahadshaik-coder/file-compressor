const fs = require("fs");
const path = require("path");

async function inspectSaveAPI() {
    try {
        const mupdf = await import("mupdf");

        const uploadsDir = path.join(
            __dirname,
            "uploads"
        );

        const pdfFiles = fs.readdirSync(uploadsDir)
            .filter(file => /\.pdf$/i.test(file));

        if (pdfFiles.length === 0) {
            console.log("No PDF files found.");
            return;
        }

        const inputFile = pdfFiles
            .map(file => ({
                name: file,
                path: path.join(
                    uploadsDir,
                    file
                ),
                modified: fs.statSync(
                    path.join(
                        uploadsDir,
                        file
                    )
                ).mtimeMs
            }))
            .sort(
                (a, b) => b.modified - a.modified
            )[0];

        const pdfBytes =
            fs.readFileSync(inputFile.path);

        const pdf =
            mupdf.PDFDocument.openDocument(
                pdfBytes,
                "application/pdf"
            );

        console.log(
            "Input:",
            inputFile.name
        );

        console.log(
            "\n===== SAVE FUNCTION ====="
        );

        console.log(
            "save:",
            pdf.save.toString()
        );

        console.log(
            "\n===== SAVE TO BUFFER FUNCTION ====="
        );

        console.log(
            "saveToBuffer:",
            pdf.saveToBuffer.toString()
        );

        console.log(
            "\n===== PDF PROTOTYPE ====="
        );

        console.log(
            Object.getOwnPropertyNames(
                Object.getPrototypeOf(pdf)
            )
        );

    } catch (error) {
        console.error(
            "Inspection failed:"
        );

        console.error(error);
    }
}

inspectSaveAPI();