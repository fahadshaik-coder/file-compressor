const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

async function compressPDF() {
    try {
        const mupdf = await import("mupdf");

        // --------------------------------------------------
        // 1. Find input PDF dynamically
        // --------------------------------------------------

        const uploadsDir = path.join(__dirname, "uploads");

        if (!fs.existsSync(uploadsDir)) {
            console.log("Uploads folder not found.");
            return;
        }

        const pdfFiles = fs.readdirSync(uploadsDir)
            .filter(file => /\.pdf$/i.test(file));

        if (pdfFiles.length === 0) {
            console.log("No PDF files found in uploads folder.");
            return;
        }

        // Use the most recently modified PDF
        const inputFile = pdfFiles
            .map(file => ({
                name: file,
                path: path.join(uploadsDir, file),
                modified: fs.statSync(
                    path.join(uploadsDir, file)
                ).mtimeMs
            }))
            .sort((a, b) => b.modified - a.modified)[0];

        const inputPath = inputFile.path;

        console.log("Input PDF:", inputFile.name);

        // --------------------------------------------------
        // 2. Read original PDF
        // --------------------------------------------------

        const originalBytes = fs.readFileSync(inputPath);

        const originalSize = originalBytes.length;

        console.log(
            "Original size:",
            (originalSize / 1024).toFixed(2),
            "KB"
        );

        // --------------------------------------------------
        // 3. Open PDF using MuPDF
        // --------------------------------------------------

        const pdf = mupdf.PDFDocument.openDocument(
            originalBytes,
            "application/pdf"
        );

        const pageCount = pdf.countPages();

        console.log("Pages:", pageCount);

        // --------------------------------------------------
        // 4. Create new PDF
        // --------------------------------------------------

        const outputPDF = await PDFDocument.create();

        // --------------------------------------------------
        // 5. Process every page
        // --------------------------------------------------

        for (let i = 0; i < pageCount; i++) {

            console.log(
                `Processing page ${i + 1}/${pageCount}...`
            );

            const page = pdf.loadPage(i);

            // Render page
            const matrix = mupdf.Matrix.scale(2, 2);

            const pixmap = page.toPixmap(
                matrix,
                mupdf.ColorSpace.DeviceRGB,
                false,
                true
            );

            const pngData = pixmap.asPNG();

            // Compress PNG → JPEG
            const jpegData = await sharp(pngData)
                .jpeg({
                    quality: 60
                })
                .toBuffer();

            // Get JPEG dimensions
            const metadata = await sharp(jpegData)
                .metadata();

            // Embed JPEG into PDF
            const image = await outputPDF.embedJpg(
                jpegData
            );

            const width = metadata.width;
            const height = metadata.height;

            const newPage = outputPDF.addPage([
                width,
                height
            ]);

            newPage.drawImage(image, {
                x: 0,
                y: 0,
                width,
                height
            });

            console.log(
                `Page ${i + 1} completed`
            );
        }

        // --------------------------------------------------
        // 6. Generate compressed PDF in memory
        // --------------------------------------------------

        const compressedBytes = await outputPDF.save();

        const compressedSize = compressedBytes.length;

        const savedBytes =
            originalSize - compressedSize;

        const reduction =
            (savedBytes / originalSize) * 100;

        // --------------------------------------------------
        // 7. Compare original and compressed sizes
        // --------------------------------------------------

        console.log("\n================================");
        console.log("COMPRESSION RESULT");
        console.log("================================");

        console.log(
            "Original:",
            (originalSize / 1024).toFixed(2),
            "KB"
        );

        console.log(
            "Compressed:",
            (compressedSize / 1024).toFixed(2),
            "KB"
        );

        // --------------------------------------------------
        // 8. Only keep compressed PDF if it is smaller
        // --------------------------------------------------

        if (compressedSize < originalSize) {

            const outputName =
                `${path.parse(inputFile.name).name}-compressed.pdf`;

            const outputPath =
                path.join(__dirname, outputName);

            fs.writeFileSync(
                outputPath,
                compressedBytes
            );

            console.log(
                "Space saved:",
                (savedBytes / 1024).toFixed(2),
                "KB"
            );

            console.log(
                "Size reduction:",
                reduction.toFixed(2),
                "%"
            );

            console.log(
                "Compressed PDF:",
                outputName
            );

        } else {

            console.log(
                "Compressed version is larger."
            );

            console.log(
                "Keeping the original PDF."
            );

            console.log(
                "Size increase:",
                Math.abs(savedBytes / 1024).toFixed(2),
                "KB"
            );
        }

        console.log("================================");

    } catch (error) {

        console.error(
            "Compression failed:",
            error
        );
    }
}

compressPDF();