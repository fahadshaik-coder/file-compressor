const fs = require("fs");
const path = require("path");

async function analyzeXObjects() {
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

        console.log(
            "Analyzing:",
            inputFile.name
        );

        const pdfBytes = fs.readFileSync(
            inputFile.path
        );

        const pdf = mupdf.PDFDocument.openDocument(
            pdfBytes,
            "application/pdf"
        );

        const pageCount = pdf.countPages();

        console.log(
            "Pages:",
            pageCount
        );

        const analyzedObjects = new Set();

        for (let i = 0; i < pageCount; i++) {

            console.log(
                `\n--- Page ${i + 1} ---`
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

            const xObjectReference =
                resources.get("XObject");

            if (!xObjectReference) {
                console.log(
                    "No XObjects found."
                );
                continue;
            }

            const xObjects =
                xObjectReference.resolve();

            const xObjectJS =
                xObjects.asJS();

            for (const [name, reference] of
                Object.entries(xObjectJS)) {

                console.log(
                    `\n${name} → ${reference}`
                );

                if (analyzedObjects.has(reference)) {
                    console.log(
                        "Already analyzed."
                    );
                    continue;
                }

                analyzedObjects.add(reference);

                const object =
                    xObjects.get(name).resolve();

                console.log(
                    "Object:",
                    object.toString()
                );

                console.log(
                    "JavaScript:",
                    object.asJS()
                );

                console.log(
                    "Is stream:",
                    object.isStream()
                );
            }
        }

    } catch (error) {

        console.error(
            "XObject analysis failed:",
            error
        );
    }
}

analyzeXObjects();