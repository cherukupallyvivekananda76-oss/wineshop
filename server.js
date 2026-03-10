"use strict";
require("dotenv").config();   // load .env before anything else
const express = require("express");
const cors = require("cors");
const path = require("path");

const apiRouter = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ── Catch-all → index.html ────────────────────────────────────────────────────
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🍷  Jai Durga Wine Shop Excel Manager`);
    console.log(`  🚀  Running at: http://localhost:${PORT}\n`);
});
