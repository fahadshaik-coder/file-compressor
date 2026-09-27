const fs = require("fs");
const path = require("path");

async function testPixmapJPEG() {

    console.log("TEST STARTED");

    const mupdf = await import("mupdf");

    const uploadsDir = path.join(
        __dirname,
        "uploads"
    );

    const pdfFiles = fs
        .readdirSync(uploadsDir)
        .filter(file =>
            file.toLowerCase().endsWith(".pdf")
        );

    if (pdfFiles.length === 0) {

        console.log(
            "No PDF files found."
        );

        return;
    }

    const latestPdf = pdfFiles
        .map(file => ({
            name: file,
            time: fs.statSync(
                path.join(
                    uploadsDir,
                    file
                )
            ).mtimeMs
        }))
        .sort(
            (a, b) => b.time - a.time
        )[0];

    const pdfPath = path.join(
        uploadsDir,
        latestPdf.name
    );

    console.log(
        "Reading:",
        latestPdf.name
    );

    const pdf = mupdf.PDFDocument.openDocument(
        fs.readFileSync(pdfPath),
        "application/pdf"
    );

    const page = pdf.loadPage(0);

    const resources = page
        .getObject()
        .get("Resources");

    const xobjects = resources.get(
        "XObject"
    );

    let tested = false;

    xobjects.forEach((ref, name) => {

        if (tested) {
            return;
        }

        tested = true;

        console.log(
            "\n======================"
        );

        console.log(
            "Image:",
            name
        );

        const object = xobjects.get(name);

        const resolved = object.resolve();

        const lengthObject =
            resolved.get("Length");

        const originalSize =
            lengthObject.asNumber();

        console.log(
            "Original JPEG stream:",
            originalSize,
            "bytes"
        );

        // Load embedded image
        const image = pdf.loadImage(
            object
        );

        console.log(
            "Image:",
            image.getWidth(),
            "x",
            image.getHeight()
        );

        // Convert to Pixmap
        const pixmap = image.toPixmap();

        console.log(
            "Pixmap created."
        );

        console.log(
            "Pixmap size:",
            pixmap.getWidth(),
            "x",
            pixmap.getHeight()
        );

        // Encode Pixmap as JPEG
        console.log(
            "Encoding JPEG..."
        );

        const jpegBuffer =
            pixmap.asJPEG();

        console.log(
            "JPEG encoded!"
        );

        console.log(
            "Encoded type:",
            jpegBuffer.constructor.name
        );

        const jpegBytes =
            jpegBuffer.asUint8Array();

        console.log(
            "New JPEG size:",
            jpegBytes.length,
            "bytes"
        );

        const difference =
            originalSize - jpegBytes.length;

        const percentage =
            (difference / originalSize) * 100;

        console.log(
            "Size difference:",
            difference,
            "bytes"
        );

        console.log(
            "Size change:",
            percentage.toFixed(2),
            "%"
        );

    });

    console.log(
        "\nTEST FINISHED"
    );
}

testPixmapJPEG();