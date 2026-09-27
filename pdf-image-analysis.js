const fs = require("fs");
const path = require("path");

async function analyzeImages() {
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

        const pdfBytes = fs.readFileSync(
            inputFile.path
        );

        const pdf = mupdf.PDFDocument.openDocument(
            pdfBytes,
            "application/pdf"
        );

        const pageCount = pdf.countPages();

        console.log("Pages:", pageCount);
        console.log("");

        for (let i = 0; i < pageCount; i++) {

            console.log(
                `--- Page ${i + 1} ---`
            );

            const page = pdf.loadPage(i);

            const pageObject =
                page.getObject().resolve();

            const resourcesReference =
                pageObject.get("Resources");

            if (!resourcesReference) {
                console.log(
                    "No resources found."
                );
                continue;
            }

            const resources =
                resourcesReference.resolve();

            const resourcesJS =
                resources.asJS();

            console.log(
                "Resources:",
                resourcesJS
            );

            if (resourcesJS.XObject) {

                console.log(
                    "XObjects found!"
                );

                console.log(
                    resourcesJS.XObject
                );

            } else {

                console.log(
                    "No XObjects/images found."
                );
            }
        }

    } catch (error) {

        console.error(
            "Image analysis failed:",
            error
        );
    }
}

analyzeImages();