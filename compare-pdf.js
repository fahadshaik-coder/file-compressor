const fs = require("fs");
const path = require("path");

function getSizeInKB(filePath) {
    const sizeInBytes = fs.statSync(filePath).size;
    return sizeInBytes / 1024;
}

function findLargestPDF(directory, excludedFiles = []) {
    const files = fs.readdirSync(directory)
        .filter(file => /\.pdf$/i.test(file))
        .filter(file => !excludedFiles.includes(file));

    if (files.length === 0) {
        return null;
    }

    return files
        .map(file => ({
            name: file,
            path: path.join(directory, file),
            size: fs.statSync(path.join(directory, file)).size
        }))
        .sort((a, b) => b.size - a.size)[0];
}

function findCompressedPDF(directory) {
    const files = fs.readdirSync(directory)
        .filter(file => /\.pdf$/i.test(file));

    if (files.length === 0) {
        return null;
    }

    return files
        .map(file => ({
            name: file,
            path: path.join(directory, file),
            size: fs.statSync(path.join(directory, file)).size
        }))
        .sort((a, b) => a.size - b.size)[0];
}

function comparePDFs() {
    try {
        const uploadsDir = path.join(__dirname, "uploads");

        if (!fs.existsSync(uploadsDir)) {
            console.log("Uploads folder not found.");
            return;
        }

        // Find the uploaded/original PDF
        const originalPDF = findLargestPDF(uploadsDir);

        if (!originalPDF) {
            console.log("No PDF found in uploads folder.");
            return;
        }

        // Find generated PDF in project folder
        const compressedPDF = findCompressedPDF(__dirname);

        if (!compressedPDF) {
            console.log("No generated PDF found.");
            return;
        }

        const originalSize = getSizeInKB(originalPDF.path);
        const compressedSize = getSizeInKB(compressedPDF.path);

        const savedKB = originalSize - compressedSize;

        const reduction =
            (savedKB / originalSize) * 100;

        console.log("\n===== PDF COMPRESSION RESULT =====");

        console.log(
            "Original PDF:",
            originalPDF.name
        );

        console.log(
            "Compressed PDF:",
            compressedPDF.name
        );

        console.log(
            "Original size:",
            originalSize.toFixed(2),
            "KB"
        );

        console.log(
            "Compressed size:",
            compressedSize.toFixed(2),
            "KB"
        );

        console.log(
            "Space saved:",
            savedKB.toFixed(2),
            "KB"
        );

        console.log(
            "Size reduction:",
            reduction.toFixed(2),
            "%"
        );

        console.log("==================================\n");

    } catch (error) {
        console.error("Comparison failed:", error);
    }
}

comparePDFs();
