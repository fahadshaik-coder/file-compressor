"use strict";

// ─── DOM Elements ────────────────────────────────────────────────────────────
const form               = document.querySelector("#uploadForm");
const fileInput          = document.querySelector("#pdfFile");
const dropZone           = document.querySelector("#dropZone");
const fileSelectedCard   = document.querySelector("#fileSelectedCard");
const fileNameText       = document.querySelector("#fileNameText");
const fileSizeText       = document.querySelector("#fileSizeText");
const removeFileBtn      = document.querySelector("#removeFileBtn");

const qualitySlider      = document.querySelector("#qualitySlider");
const qualityInput       = document.querySelector("#qualityInput");
const qualityBadge       = document.querySelector("#qualityBadge");
const presetActiveName   = document.querySelector("#presetActiveName");
const presetChips        = document.querySelectorAll(".preset-chip");

const uploadButton       = document.querySelector("#uploadButton");
const statusMsg          = document.querySelector("#status");
const progressWrap       = document.querySelector("#progressWrap");
const progressBar        = document.querySelector("#progressBar");

// Inspector Elements
const inspectorEmpty     = document.querySelector("#inspectorEmpty");
const inspectorProcessing = document.querySelector("#inspectorProcessing");
const inspectorResults   = document.querySelector("#inspectorResults");
const savingsPill        = document.querySelector("#savingsPill");
const resFileName        = document.querySelector("#resFileName");
const resOriginalSize    = document.querySelector("#resOriginalSize");
const resCompressedSize  = document.querySelector("#resCompressedSize");
const resSavedSize       = document.querySelector("#resSavedSize");
const resImages          = document.querySelector("#resImages");
const resQualityUsed     = document.querySelector("#resQualityUsed");
const comparePercentLabel = document.querySelector("#comparePercentLabel");
const compareBarFill     = document.querySelector("#compareBarFill");
const resDownloadBtn     = document.querySelector("#resDownloadBtn");
const resetBtn           = document.querySelector("#resetBtn");

// ─── Utility: Format bytes ───────────────────────────────────────────────────
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Drag & Drop Handling ────────────────────────────────────────────────────
["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
    });
});

["dragleave", "dragend"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
    });
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("dragover");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileSelection(file);
    }
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
});

function handleFileSelection(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showStatus("Only PDF files are supported.", true);
        clearFile();
        return;
    }

    // Set file to input in case it came from drag & drop
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    fileNameText.textContent = file.name;
    fileSizeText.textContent = formatBytes(file.size);
    fileSelectedCard.style.display = "flex";
    dropZone.style.display = "none";
    showStatus("");

    // If results were previously showing, reset back to empty/ready state
    showInspectorState("empty");
}

function clearFile() {
    fileInput.value = "";
    fileSelectedCard.style.display = "none";
    dropZone.style.display = "flex";
    showInspectorState("empty");
}

removeFileBtn.addEventListener("click", () => {
    clearFile();
});

// ─── Quality Controls & Presets ──────────────────────────────────────────────
function syncQuality(val, source) {
    let numeric = parseInt(val, 10);
    if (isNaN(numeric)) numeric = 60;
    numeric = Math.max(30, Math.min(90, numeric));

    if (source !== "slider") qualitySlider.value = numeric;
    if (source !== "input")  qualityInput.value  = numeric;
    qualityBadge.textContent = numeric + "%";

    // Match preset
    let matched = false;
    presetChips.forEach((chip) => {
        if (parseInt(chip.dataset.quality, 10) === numeric) {
            chip.classList.add("active");
            presetActiveName.textContent = chip.dataset.name;
            matched = true;
        } else {
            chip.classList.remove("active");
        }
    });

    if (!matched) {
        presetActiveName.textContent = `Custom (${numeric}%)`;
    }
}

qualitySlider.addEventListener("input", (e) => {
    syncQuality(e.target.value, "slider");
});

qualityInput.addEventListener("input", (e) => {
    syncQuality(e.target.value, "input");
});

presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        const q = chip.dataset.quality;
        syncQuality(q, "preset");
    });
});

// ─── Status Message Helper ───────────────────────────────────────────────────
function showStatus(msg, isError = false) {
    statusMsg.textContent = msg;
    if (isError) {
        statusMsg.classList.add("error");
    } else {
        statusMsg.classList.remove("error");
    }
}

// ─── Inspector State Controller ──────────────────────────────────────────────
function showInspectorState(state) {
    inspectorEmpty.style.display      = "none";
    inspectorProcessing.style.display = "none";
    inspectorResults.style.display    = "none";

    if (state === "processing") {
        inspectorProcessing.style.display = "flex";
    } else if (state === "results") {
        inspectorResults.style.display = "flex";
    } else {
        inspectorEmpty.style.display = "flex";
    }
}

// ─── Progress Animation ──────────────────────────────────────────────────────
let progressInterval = null;

function startProgress() {
    progressWrap.style.display = "block";
    let pct = 0;
    progressBar.style.width = "0%";
    progressInterval = setInterval(() => {
        // Smoothly ease toward 90%
        pct += (90 - pct) * 0.08;
        progressBar.style.width = pct.toFixed(1) + "%";
    }, 250);
}

function finishProgress() {
    clearInterval(progressInterval);
    progressBar.style.width = "100%";
    setTimeout(() => {
        progressWrap.style.display = "none";
        progressBar.style.width = "0%";
    }, 450);
}

// ─── Form Submit ─────────────────────────────────────────────────────────────
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
        showStatus("Please choose or drop a PDF file first.", true);
        return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showStatus("Only PDF files are supported.", true);
        return;
    }

    // Lock UI and show processing state
    uploadButton.disabled = true;
    uploadButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <span>Optimizing PDF...</span>
    `;
    showStatus("Uploading and re-encoding embedded images…");
    showInspectorState("processing");
    startProgress();

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("quality", qualityInput.value);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: formData,
        });

        finishProgress();

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Compression failed.");
            }

            // Display results in Inspector
            resFileName.textContent       = data.originalName;
            resOriginalSize.textContent   = data.originalSizeKB + " KB";
            resCompressedSize.textContent = data.finalSizeKB + " KB";
            resSavedSize.textContent      = `${data.savedKB} KB (${data.reduction}%)`;
            resImages.textContent         = data.imagesProcessed;
            resQualityUsed.textContent    = data.jpegQuality;

            if (data.compressionUsed && parseFloat(data.reduction) > 0) {
                savingsPill.textContent = `-${data.reduction}% Saved`;
                savingsPill.style.background = "var(--success-bg)";
                savingsPill.style.color = "var(--success)";
                comparePercentLabel.textContent = `${data.reduction}% smaller`;
                compareBarFill.style.width = `${Math.min(100, Math.max(5, parseFloat(data.reduction)))}%`;
            } else {
                savingsPill.textContent = "Original Retained";
                savingsPill.style.background = "var(--warn-bg)";
                savingsPill.style.color = "var(--warn)";
                comparePercentLabel.textContent = "0% (Original was already optimal)";
                compareBarFill.style.width = "0%";
            }

            resDownloadBtn.href = data.downloadUrl;
            resDownloadBtn.setAttribute("download", data.originalName.replace(/\.pdf$/i, "") + "-compressed.pdf");

            showInspectorState("results");
            showStatus("Compression complete! Click below to download your file.");

            // Reset upload button
            uploadButton.disabled = false;
            uploadButton.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Compress Again</span>
            `;

        } else {
            // HTML fallback
            const html = await response.text();
            document.open();
            document.write(html);
            document.close();
        }

    } catch (error) {
        finishProgress();
        console.error(error);
        showStatus("Error: " + error.message, true);
        showInspectorState("empty");

        uploadButton.disabled = false;
        uploadButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span>Compress PDF</span>
        `;
    }
});

// ─── Reset / Compress Another ────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
    clearFile();
    showStatus("");
    uploadButton.disabled = false;
    uploadButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"></polyline>
            <polyline points="20 10 14 10 14 4"></polyline>
            <line x1="14" y1="10" x2="21" y2="3"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
        <span>Compress PDF</span>
    `;
});