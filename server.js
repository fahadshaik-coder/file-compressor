"use strict";

const express = require("express");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const { compressPdfWithQuality } = require("./pdf-image-compress");

const app  = express();
const PORT = 3000;

// ─── Static frontend ─────────────────────────────────────────────────────────
app.use(express.static("public"));

// ─── Multer upload config ─────────────────────────────────────────────────────
const upload = multer({
    dest: "uploads/",
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are accepted."));
        }
        cb(null, true);
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─── Helper: clean up a file path if it exists ───────────────────────────────
function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
}

// ─── Helper: keep only the newest `limit` files in uploads/ ──────────────────
// Multer temp files have no extension; result files end in .pdf.
// We only count/delete the compressed result PDFs (*.pdf), not temp files.
function enforceUploadLimit(uploadsDir, limit = 5) {
    try {
        const files = fs.readdirSync(uploadsDir)
            .filter(f => f.toLowerCase().endsWith(".pdf"))
            .map(f => {
                const full = path.join(uploadsDir, f);
                return { name: f, full, mtime: fs.statSync(full).mtimeMs };
            })
            .sort((a, b) => a.mtime - b.mtime); // oldest first

        // Delete everything beyond the limit (oldest removed first).
        const excess = files.length - limit;
        for (let i = 0; i < excess; i++) {
            safeUnlink(files[i].full);
            console.log("Cleanup: deleted old result file →", files[i].name);
        }
    } catch (e) {
        console.warn("enforceUploadLimit error:", e.message);
    }
}

// ─── POST /upload ─────────────────────────────────────────────────────────────
app.post("/upload", upload.single("pdf"), async (req, res) => {
    const tempPath = req.file ? req.file.path : null;

    try {
        // Validate upload ────────────────────────────────────────────────────
        if (!req.file) {
            return res.status(400).send(resultPage("Error", "<p>No file was uploaded.</p>", null));
        }

        const originalName = req.file.originalname;
        const originalSize = req.file.size;

        console.log("\n─── New upload ───────────────────────────────────");
        console.log("File     :", originalName);
        console.log("Size     :", (originalSize / 1024).toFixed(2), "KB");

        // Read quality from form (default 60) ────────────────────────────────
        const rawQuality  = parseInt(req.body.quality, 10);
        const jpegQuality = Number.isFinite(rawQuality)
            ? Math.max(30, Math.min(90, rawQuality))
            : 60;

        console.log("Quality  :", jpegQuality);

        // Run compression ─────────────────────────────────────────────────────
        const uploadsDir = path.join(__dirname, "uploads");
        const result     = await compressPdfWithQuality(tempPath, uploadsDir, jpegQuality, originalName);

        // Clean up original temp upload (the compressed copy is result.finalPath)
        safeUnlink(tempPath);

        // Keep only the 5 most recent result PDFs in uploads/.
        enforceUploadLimit(uploadsDir, 5);

        // Validate the output ─────────────────────────────────────────────────
        const outputExists = fs.existsSync(result.finalPath);
        if (!outputExists) {
            throw new Error("Output PDF was not created.");
        }

        // Quick integrity check – re-open with MuPDF ──────────────────────────
        try {
            const mupdf      = await import("mupdf");
            const outBytes   = fs.readFileSync(result.finalPath);
            const checkPdf   = mupdf.PDFDocument.openDocument(outBytes, "application/pdf");
            const checkPages = checkPdf.countPages();
            console.log("Integrity check: pages =", checkPages);
        } catch (ve) {
            console.error("Output PDF failed integrity check:", ve.message);
            throw new Error("Generated PDF is invalid – original kept.");
        }

        // Build result stats ──────────────────────────────────────────────────
        const finalSizeKB    = (result.finalSize / 1024).toFixed(2);
        const originalSizeKB = (originalSize / 1024).toFixed(2);
        const savedKB        = (result.savedBytes / 1024).toFixed(2);
        const reductionPct   = result.reduction.toFixed(1);

        const statsHtml = result.compressionUsed
            ? `<div class="stat-row">
                   <span class="stat-label">Original</span>
                   <span class="stat-value">${originalSizeKB} KB</span>
               </div>
               <div class="stat-row">
                   <span class="stat-label">Compressed</span>
                   <span class="stat-value success">${finalSizeKB} KB</span>
               </div>
               <div class="stat-row">
                   <span class="stat-label">Saved</span>
                   <span class="stat-value success">${savedKB} KB (${reductionPct}%)</span>
               </div>
               <div class="stat-row">
                   <span class="stat-label">Images processed</span>
                   <span class="stat-value">${result.imagesProcessed}</span>
               </div>
               <div class="stat-row">
                   <span class="stat-label">JPEG quality used</span>
                   <span class="stat-value">${jpegQuality}</span>
               </div>`
            : `<div class="stat-row">
                   <span class="stat-label">Original</span>
                   <span class="stat-value">${originalSizeKB} KB</span>
               </div>
               <div class="stat-row warn">
                   <span class="stat-label">Note</span>
                   <span class="stat-value">Compressed was not smaller — original returned.</span>
               </div>`;

        const downloadName = encodeURIComponent(result.outputName);
        const downloadUrl  = `/download/${downloadName}`;

        const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"));
        if (wantsJson) {
            return res.json({
                success: true,
                originalName,
                originalSize,
                originalSizeKB,
                finalSize: result.finalSize,
                finalSizeKB,
                savedBytes: result.savedBytes,
                savedKB,
                reduction: reductionPct,
                imagesProcessed: result.imagesProcessed,
                jpegQuality,
                compressionUsed: result.compressionUsed,
                downloadUrl
            });
        }

        res.send(resultPage(
            `${originalName}`,
            statsHtml,
            downloadUrl
        ));

    } catch (error) {
        console.error("Compression error:", error);
        safeUnlink(tempPath);
        const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.includes("application/json"));
        if (wantsJson) {
            return res.status(500).json({
                success: false,
                error: error.message || "An unexpected error occurred."
            });
        }
        res.status(500).send(resultPage(
            "Compression Failed",
            `<p class="error-msg">${error.message || "An unexpected error occurred."}</p>`,
            null
        ));
    }
});

// ─── GET /download/:filename ──────────────────────────────────────────────────
app.get("/download/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, "uploads", filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found.");
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error("Download error:", err);
            return;
        }
        // Delete file after download
        safeUnlink(filePath);
        console.log("Result file deleted after download:", filename);
    });
});

// ─── Result page template ─────────────────────────────────────────────────────
function resultPage(title, statsHtml, downloadHref) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Studio — Result</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header class="top-nav-wrapper">
        <div class="container">
            <nav class="top-nav">
                <a class="brand" href="/">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    PDF Studio
                </a>
                <div class="nav-links">
                    <a href="/#features">Features</a>
                    <a href="/#how-it-works">How It Works</a>
                    <a href="/">Compress Another</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="hero">
        <div class="container" style="max-width: 680px; margin: 2rem auto;">
            <div class="hero-card result-container">
                <div class="section-heading" style="text-align: center; margin-bottom: 1.5rem;">
                    <p class="sub-title">Compression Complete</p>
                    <h1 style="font-size: 2rem;">Ready for Download</h1>
                    <p class="hero-text" style="margin: 0.5rem auto 0; font-size: 0.95rem; word-break: break-all;">${title}</p>
                </div>

                <div class="stats-card">
                    ${statsHtml}
                </div>

                <div class="preview-actions" style="margin-top: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    ${downloadHref
                        ? `<a href="${downloadHref}" class="btn-download download-button" id="downloadBtn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Compressed PDF
                           </a>`
                        : ""}
                    <a href="/" class="btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1.4rem; border-radius: 999px;">
                        ← Compress another PDF
                    </a>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container footer-inner">
            <p>© 2026 PDF Studio. Built for modern fast file sharing By Fahad Shaik.</p>
        </div>
    </footer>
</body>
</html>`;
}

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});