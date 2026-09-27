const fs = require("fs");
const path = require("path");

async function inspectPage() {
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

        console.log("Inspecting:", inputFile.name);

        const pdfBytes = fs.readFileSync(inputFile.path);

        const pdf = mupdf.PDFDocument.openDocument(
            pdfBytes,
            "application/pdf"
        );

        const page = pdf.loadPage(0);

        const pageReference = page.getObject();

        console.log("Page reference:");
        console.log(pageReference.toString());

        const pageObject = pageReference.resolve();

        console.log("\nResolved page object:");
        console.log(pageObject.toString());

        console.log("\nJavaScript representation:");
        console.log(pageObject.asJS());

        const resourcesReference =
            pageObject.get("Resources");

        console.log("\nResources reference:");
        console.log(resourcesReference.toString());

        const resources =
            resourcesReference.resolve();

        console.log("\nResolved Resources:");
        console.log(resources.toString());

        console.log("\nResources JavaScript:");
        console.log(resources.asJS());

        // Font inspection
        const fontReference =
            resources.get("Font");

        const fontDictionary =
            fontReference.resolve();

        console.log("\nFont dictionary:");
        console.log(fontDictionary.toString());

        console.log("\nFont dictionary JavaScript:");
        console.log(fontDictionary.asJS());

    } catch (error) {
        console.error(
            "Inspection failed:",
            error
        );
    }
}

inspectPage();