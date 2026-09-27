const fs = require("fs");
const path = require("path");

async function compressPDF() {
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

        console.log("Input PDF:", inputFile.name);

        const originalBytes = fs.readFileSync(inputFile.path);
        const originalSize = originalBytes.length;

        console.log(
            "Original:",
            (originalSize / 1024).toFixed(2),
            "KB"
        );

        const pdf = mupdf.PDFDocument.openDocument(
            originalBytes,
            "application/pdf"
        );

        console.log(
            "Pages:",
            pdf.countPages()
        );

        // Remove unused font glyphs.
        pdf.subsetFonts();

        // Native MuPDF optimization.
        const compressedBuffer = pdf.saveToBuffer(
            "compress,compress-images,compress-fonts,garbage=compact,objstms"
        );

        const compressedBytes =
            compressedBuffer.asUint8Array();

        const compressedSize =
            compressedBytes.length;

        console.log(
            "Compressed:",
            (compressedSize / 1024).toFixed(2),
            "KB"
        );

        const savedBytes =
            originalSize - compressedSize;

        const reduction =
            (savedBytes / originalSize) * 100;

        if (compressedSize < originalSize) {

            const outputName =
                `${path.parse(inputFile.name).name}-compressed.pdf`;

            const outputPath =
                path.join(__dirname, outputName);

            fs.writeFileSync(
                outputPath,
                Buffer.from(compressedBytes)
            );

            console.log("\nCompression successful!");

            console.log(
                "Saved:",
                (savedBytes / 1024).toFixed(2),
                "KB"
            );

            console.log(
                "Reduction:",
                reduction.toFixed(2),
                "%"
            );

            console.log(
                "Output:",
                outputName
            );

        } else {

            console.log(
                "\nCompressed file is not smaller."
            );

            console.log(
                "Original file will be kept."
            );

            console.log(
                "Size difference:",
                Math.abs(savedBytes / 1024).toFixed(2),
                "KB"
            );
        }

    } catch (error) {
        console.error(
            "Compression failed:",
            error
        );
    }
}

compressPDF();