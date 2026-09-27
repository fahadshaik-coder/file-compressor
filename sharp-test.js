const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function compressImage() {
    try {
        const inputPath = path.join(__dirname, "rendered-page.png");
        const outputPath = path.join(__dirname, "compressed-page.jpg");

        if (!fs.existsSync(inputPath)) {
            console.log("Rendered image not found.");
            return;
        }

        const originalSize = fs.statSync(inputPath).size;

        await sharp(inputPath)
            .jpeg({
                quality: 60
            })
            .toFile(outputPath);

        const compressedSize = fs.statSync(outputPath).size;

        const saved =
            ((originalSize - compressedSize) / originalSize) * 100;

        console.log("Image compression complete!");
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

        console.log(
            "Size change:",
            saved.toFixed(2),
            "%"
        );

    } catch (error) {
        console.error("Compression failed:", error);
    }
}

compressImage();