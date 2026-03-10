"use strict";
const express = require("express");
const multer  = require("multer");
const router  = express.Router();

const { generateExcel }                    = require("../excel/generate");
const { previewExcel }                     = require("../excel/preview");
const { verifyDays, getVerifiedFile }      = require("../excel/verify");
const { getBrandRows }                     = require("../brands");
const drive                                = require("../drive");

// ─── GET /api/brands ─────────────────────────────────────────────────────────
router.get("/brands", (_req, res) => {
    res.json(getBrandRows());
});

// ─── Multer ───────────────────────────────────────────────────────────────────
const xlsxFilter = (_req, file, cb) => {
    if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.originalname.endsWith(".xlsx")
    ) { cb(null, true); } else { cb(new Error("Only .xlsx files are accepted")); }
};
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: xlsxFilter });
const uploadTwo = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: xlsxFilter })
    .fields([{ name: "yesterday_file", maxCount: 1 }, { name: "today_file", maxCount: 1 }]);

// ─── POST /api/generate-excel ─────────────────────────────────────────────────
router.post("/generate-excel", async (req, res) => {
    try {
        const { date, rows, preloadBrands } = req.body;
        if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
            return res.status(400).json({ error: "date is required and must be in YYYY-MM-DD format." });
        }
        const numRows = parseInt(rows, 10) || 200;
        if (numRows < 1 || numRows > 2000) {
            return res.status(400).json({ error: "rows must be between 1 and 2000." });
        }
        const doPreload = preloadBrands === true || preloadBrands === "true";
        const cleanDate = date.trim();
        let rowData = null;
        if (req.body.rowData) {
            try { rowData = typeof req.body.rowData === "string" ? JSON.parse(req.body.rowData) : req.body.rowData; } catch (_) {}
        }
        const buffer   = await generateExcel(cleanDate, numRows, doPreload, rowData);
        const filename = `JaiDurga_Stock_${cleanDate}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", buffer.length);
        res.send(buffer);
    } catch (err) {
        console.error("[generate-excel]", err);
        res.status(500).json({ error: err.message || "Failed to generate Excel." });
    }
});

// ─── POST /api/preview-excel ──────────────────────────────────────────────────
router.post("/preview-excel", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded." });
        res.json(await previewExcel(req.file.buffer));
    } catch (err) {
        res.status(400).json({ error: err.message || "Failed to parse Excel file." });
    }
});

// ─── POST /api/verify-days ───────────────────────────────────────────────────
router.post("/verify-days", (req, res) => {
    uploadTwo(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message || "File upload error." });
        try {
            const yFile = req.files?.yesterday_file?.[0];
            const tFile = req.files?.today_file?.[0];
            if (!yFile) return res.status(400).json({ error: "yesterday_file is required." });
            if (!tFile) return res.status(400).json({ error: "today_file is required." });
            const todayDate = req.body.today_date || "today";
            res.json(await verifyDays(yFile.buffer, tFile.buffer, todayDate));
        } catch (err) {
            res.status(400).json({ error: err.message || "Verification failed." });
        }
    });
});

// ─── GET /api/download-verified/:id ──────────────────────────────────────────
router.get("/download-verified/:id", (req, res) => {
    const entry = getVerifiedFile(req.params.id);
    if (!entry) return res.status(404).json({ error: "Download link expired. Please re-run verification." });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${entry.filename}"`);
    res.setHeader("Content-Length", entry.buffer.length);
    res.send(entry.buffer);
});

// ════════════════════════════════════════════════════════════════════════════════
//  GOOGLE DRIVE ROUTES
// ════════════════════════════════════════════════════════════════════════════════

// GET /api/drive/status — connection state for UI
router.get("/drive/status", (_req, res) => {
    res.json(drive.getStatus());
});

// GET /api/drive/auth-url — returns OAuth consent URL
router.get("/drive/auth-url", (_req, res) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            return res.status(503).json({ error: "Google Drive is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file." });
        }
        res.json({ url: drive.getAuthUrl() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/drive/callback — OAuth redirect handler
router.get("/drive/callback", async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.redirect("/?drive=error&reason=" + encodeURIComponent(error));
    if (!code)  return res.redirect("/?drive=error&reason=no_code");
    try {
        await drive.handleCallback(code);
        res.redirect("/?drive=connected");
    } catch (err) {
        console.error("[drive/callback]", err);
        res.redirect("/?drive=error&reason=" + encodeURIComponent(err.message));
    }
});

// POST /api/drive/upload — re-generate Excel and upload to Drive
// Body: { date, rows?, preloadBrands?, rowData? }
router.post("/drive/upload", async (req, res) => {
    try {
        if (!drive.isConnected()) {
            return res.status(400).json({ error: "Google Drive not connected." });
        }
        const { date, rows, preloadBrands } = req.body;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
            return res.status(400).json({ error: "date is required in YYYY-MM-DD format." });
        }
        const numRows   = parseInt(rows, 10) || 200;
        const doPreload = preloadBrands === true || preloadBrands === "true";
        let rowData = null;
        if (req.body.rowData) {
            try { rowData = typeof req.body.rowData === "string" ? JSON.parse(req.body.rowData) : req.body.rowData; } catch (_) {}
        }
        const buffer   = await generateExcel(date.trim(), numRows, doPreload, rowData);
        const filename = `JaiDurga_Stock_${date.trim()}.xlsx`;
        const result   = await drive.uploadFile(filename, buffer);
        res.json({ success: true, filename: result.name, folderName: result.folderName, fileId: result.id });
    } catch (err) {
        console.error("[drive/upload]", err);
        res.status(500).json({ error: err.message || "Drive upload failed." });
    }
});

// POST /api/drive/disconnect — remove stored tokens
router.post("/drive/disconnect", (_req, res) => {
    drive.disconnect();
    res.json({ success: true });
});

module.exports = router;

