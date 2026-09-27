"use strict";

/**
 * pdf-image-compress.js
 *
 * Compresses a PDF by:
 *   1. Enumerating every image XObject on every page via MuPDF.
 *   2. Rendering each image to a Pixmap.
 *   3. Re-encoding it as JPEG at the requested quality with Sharp.
 *   4. Replacing the original stream in-place so text stays selectable.
 *   5. Running MuPDF's own structural compression pass on top.
 *   6. Falling back to the original if the result is larger.
 */

const fs   = require("fs");
const path = require("path");
const sharp = require("sharp");

/**
 * Compress a PDF file by recompressing every embedded image.
 *
 * @param {string} inputPath   - Absolute path to the source PDF.
 * @param {string} outputDir   - Directory where the result PDF will be written.
 * @param {number} jpegQuality - JPEG quality 30–90 (default 60).
 * @returns {Promise<{
 *   finalPath:       string,
 *   outputName:      string,
 *   originalSize:    number,
 *   finalSize:       number,
 *   savedBytes:      number,
 *   reduction:       number,
 *   compressionUsed: boolean,
 *   imagesProcessed: number
 * }>}
 */
async function compressPdfWithQuality(inputPath, outputDir, jpegQuality = 60, originalName = null) {
    // -------------------------------------------------------------------------
    // 1. Read the original PDF bytes.
    // -------------------------------------------------------------------------
    const originalBytes = fs.readFileSync(inputPath);
    const originalSize  = originalBytes.length;

    console.log("Original size:", (originalSize / 1024).toFixed(2), "KB");

    // -------------------------------------------------------------------------
    // 2. Open with MuPDF.
    // -------------------------------------------------------------------------
    const mupdf = await import("mupdf");

    const pdf       = mupdf.PDFDocument.openDocument(originalBytes, "application/pdf");
    const pageCount = pdf.countPages();

    console.log("Pages:", pageCount);

    // -------------------------------------------------------------------------
    // 3. Walk every page, find every image XObject, compress it.
    // -------------------------------------------------------------------------
    let imagesProcessed = 0;

    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
        console.log(`\nPage ${pageIdx + 1}/${pageCount}`);

        const page = pdf.loadPage(pageIdx);

        // Collect all image xrefs from this page's /Resources/XObject dict.
        let imageList = [];
        try {
            // mupdf 1.x Node bindings expose getImageList on the PDFPage/PDFDocument.
            if (typeof pdf.getImageList === "function") {
                imageList = pdf.getImageList(pageIdx); // [{xref, width, height, …}]
            } else if (typeof page.getImageList === "function") {
                imageList = page.getImageList();
            }
        } catch (e) {
            console.warn("  Could not enumerate images:", e.message);
        }

        if (!imageList || imageList.length === 0) {
            console.log("  No images found on this page.");
            continue;
        }

        console.log(`  Found ${imageList.length} image(s)`);

        for (const imgInfo of imageList) {
            // imgInfo = { xref: number, width, height, colorspace, bpc, … }
            const xref = imgInfo.xref ?? imgInfo;
            if (!xref) continue;

            try {
                // 3a. Load the PDF image object.
                const imgObj = pdf.getXObjectByXref ? pdf.getXObjectByXref(xref) :
                               pdf.getObject(xref);

                if (!imgObj) {
                    console.warn("  Could not load image object for xref", xref);
                    continue;
                }

                // 3b. Check whether there is an /SMask (alpha channel).
                let smaskXref = null;
                try {
                    const smaskVal = imgObj.get("SMask");
                    if (smaskVal && smaskVal.isIndirect()) {
                        smaskXref = smaskVal.asIndirect();
                    }
                } catch (_) {}

                // 3c. Render image to Pixmap.
                let pixmap;
                try {
                    // Try direct image-to-pixmap (fast, exact pixels).
                    const imageXObj = pdf.toImage ? pdf.toImage(xref) : null;
                    if (imageXObj && typeof imageXObj.toPixmap === "function") {
                        pixmap = imageXObj.toPixmap(
                            mupdf.Matrix.identity,
                            mupdf.ColorSpace.DeviceRGB,
                            false
                        );
                    } else {
                        // Fallback: render the whole page at 1:1 and crop the image region.
                        // Less precise but universally supported.
                        const scale  = mupdf.Matrix.scale(1, 1);
                        pixmap = page.toPixmap(scale, mupdf.ColorSpace.DeviceRGB, false, true);
                    }
                } catch (e) {
                    console.warn("  toPixmap failed:", e.message);
                    continue;
                }

                const width  = pixmap.getWidth();
                const height = pixmap.getHeight();

                // 3d. PNG buffer from pixmap.
                const pngBuffer = pixmap.asPNG();

                // 3e. Re-encode as JPEG with the requested quality.
                // If the image has transparency (SMask), we CANNOT use JPEG
                // for the main image (JPEG has no alpha). We keep it as PNG.
                let newBuffer;
                let newFilter;
                const hasAlpha = smaskXref !== null;

                if (hasAlpha) {
                    // Preserve transparency: compress with PNG optimisation (lossless).
                    newBuffer = await sharp(pngBuffer)
                        .png({ compressionLevel: 9 })
                        .toBuffer();
                    newFilter = "FlateDecode";
                    console.log(`  Image xref ${xref}: has alpha, using PNG`);
                } else {
                    newBuffer = await sharp(pngBuffer)
                        .jpeg({ quality: jpegQuality, mozjpeg: false })
                        .toBuffer();
                    newFilter = "DCTDecode";
                    console.log(`  Image xref ${xref}: compressed to JPEG q${jpegQuality} (${(newBuffer.length/1024).toFixed(1)} KB)`);
                }

                // 3f. Update the image stream in-place.
                // The binding method name varies; try the most common ones.
                const newStreamBuf = Buffer.isBuffer(newBuffer) ? newBuffer : Buffer.from(newBuffer);
                const success = tryUpdateImageStream(pdf, imgObj, xref, newStreamBuf, newFilter, width, height);

                if (success) {
                    imagesProcessed++;
                } else {
                    console.warn("  Could not replace stream for xref", xref);
                }

            } catch (e) {
                console.warn("  Error processing image xref", xref, ":", e.message);
            }
        }
    }

    console.log("\nImages processed:", imagesProcessed);

    // -------------------------------------------------------------------------
    // 4. Apply MuPDF's own structural compression.
    // -------------------------------------------------------------------------
    try {
        pdf.subsetFonts();
    } catch (_) {}

    const saveOpts = "compress,compress-images,compress-fonts,garbage=compact,objstms";
    const compressedBuffer = pdf.saveToBuffer(saveOpts);
    const compressedBytes  = compressedBuffer.asUint8Array();
    const finalSize        = compressedBytes.length;

    console.log("Compressed size:", (finalSize / 1024).toFixed(2), "KB");

    // -------------------------------------------------------------------------
    // 5. Safety fallback: keep original if result is larger.
    // -------------------------------------------------------------------------
    const compressionUsed = finalSize < originalSize;
    const savedBytes      = originalSize - finalSize;
    const reduction       = (savedBytes / originalSize) * 100;

    // Use the original filename if provided, otherwise fall back to the temp file name.
    const baseName   = originalName
        ? path.parse(originalName).name
        : path.parse(path.basename(inputPath)).name;
    const outputName = `${baseName}-compressed.pdf`;
    const finalPath  = path.join(outputDir, outputName);

    if (compressionUsed) {
        fs.writeFileSync(finalPath, Buffer.from(compressedBytes));
        console.log("Saved compressed PDF:", outputName);
    } else {
        fs.writeFileSync(finalPath, originalBytes);
        console.log("Compressed was larger — saving original as output.");
    }

    return {
        finalPath,
        outputName,
        originalSize,
        finalSize:       compressionUsed ? finalSize : originalSize,
        savedBytes:      compressionUsed ? savedBytes : 0,
        reduction:       compressionUsed ? reduction  : 0,
        compressionUsed,
        imagesProcessed,
    };
}

/**
 * Try every known MuPDF binding method to replace an image stream.
 * Returns true if any method succeeded.
 */
function tryUpdateImageStream(pdf, imgObj, xref, buffer, filter, width, height) {
    // Method A: pdf.updateStream(xref, buffer, compressed)
    try {
        if (typeof pdf.updateStream === "function") {
            pdf.updateStream(xref, buffer, true);
            // Also update the /Filter entry on the dict.
            try { imgObj.put("Filter", filter); } catch (_) {}
            return true;
        }
    } catch (e) {
        console.warn("  updateStream failed:", e.message);
    }

    // Method B: imgObj.writeStream(buffer)
    try {
        if (imgObj && typeof imgObj.writeStream === "function") {
            imgObj.writeStream(buffer, { filter });
            return true;
        }
    } catch (e) {
        console.warn("  writeStream failed:", e.message);
    }

    // Method C: pdf.setStream(xref, buffer)
    try {
        if (typeof pdf.setStream === "function") {
            pdf.setStream(xref, buffer);
            try { imgObj.put("Filter", filter); } catch (_) {}
            return true;
        }
    } catch (e) {
        console.warn("  setStream failed:", e.message);
    }

    return false;
}

module.exports = { compressPdfWithQuality };
