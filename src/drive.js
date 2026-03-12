"use strict";

/**
 * Google Drive service for Jai Durga Wine Shop.
 *
 * Token storage strategy:
 *  - PRODUCTION (Vercel): tokens are read from environment variables
 *      GOOGLE_REFRESH_TOKEN, GOOGLE_ACCESS_TOKEN, GOOGLE_FOLDER_ID
 *    (these are set once in the Vercel dashboard after a first local auth)
 *  - LOCAL DEV: tokens are stored in data/drive-tokens.json (as before)
 */

const { google } = require("googleapis");
const fs         = require("fs");
const path       = require("path");

const TOKENS_FILE = path.join(__dirname, "..", "data", "drive-tokens.json");
const FOLDER_NAME = "Wine Stock Sheets";
const MIME_XLSX   = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIME_FOLDER = "application/vnd.google-apps.folder";
const SCOPES      = ["https://www.googleapis.com/auth/drive.file"];

// ─── Detect environment ───────────────────────────────────────────────────────
// On Vercel, VERCEL env var is always "1"
const IS_VERCEL = process.env.VERCEL === "1";

// ─── OAuth2 client factory ────────────────────────────────────────────────────
function makeClient(redirectUri) {
    const uri = redirectUri
        || process.env.GOOGLE_REDIRECT_URI
        || "http://localhost:3000/api/drive/callback";
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        uri
    );
}

// ─── Token storage helpers ────────────────────────────────────────────────────

/**
 * Load tokens from env vars (Vercel) or from local file (dev).
 */
function loadTokens() {
    if (IS_VERCEL) {
        // Read from Vercel environment variables
        const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
        const access_token  = process.env.GOOGLE_ACCESS_TOKEN;
        const folderId      = process.env.GOOGLE_FOLDER_ID;
        if (!refresh_token) return null;
        return { refresh_token, access_token, folderId };
    }
    // Local dev: read from file
    try {
        if (!fs.existsSync(TOKENS_FILE)) return null;
        const raw = fs.readFileSync(TOKENS_FILE, "utf8");
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

/**
 * Save tokens — only meaningful in local dev.
 * On Vercel, we can't write to disk, so this is a no-op.
 */
function saveTokens(data) {
    if (IS_VERCEL) return; // No-op: tokens live in env vars on Vercel
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function deleteTokens() {
    if (IS_VERCEL) return; // Can't delete env vars at runtime
    try { if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE); } catch (_) {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate the Google OAuth consent URL.
 */
function getAuthUrl(redirectUri) {
    const client = makeClient(redirectUri);
    return client.generateAuthUrl({
        access_type: "offline",
        prompt:      "consent",
        scope:       SCOPES,
    });
}

/**
 * Exchange auth code for tokens, then save.
 * Also creates the Drive folder immediately.
 * On Vercel, prints the tokens to console so you can copy them to env vars.
 * @param {string} code
 */
async function handleCallback(code, redirectUri) {
    const client = makeClient(redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Create or find folder right away
    const folderId = await findOrCreateFolder(client);

    const tokenData = { ...tokens, folderId };
    saveTokens(tokenData); // saves locally; no-op on Vercel

    if (IS_VERCEL) {
        // Log so the developer can copy these to Vercel env vars
        console.log("=== VERCEL: Copy these to your Vercel Environment Variables ===");
        console.log("GOOGLE_REFRESH_TOKEN =", tokens.refresh_token);
        console.log("GOOGLE_ACCESS_TOKEN  =", tokens.access_token);
        console.log("GOOGLE_FOLDER_ID     =", folderId);
        console.log("================================================================");
    }

    return { folderId };
}

/**
 * Returns true if tokens are available (env vars or local file).
 */
function isConnected() {
    const t = loadTokens();
    return !!(t && (t.access_token || t.refresh_token));
}

/**
 * Returns a connected OAuth2 client with stored credentials.
 * Auto-refreshes access token if needed.
 */
function getAuthenticatedClient() {
    const tokens = loadTokens();
    if (!tokens) throw new Error("Google Drive not connected.");
    // No redirectUri needed for API calls — just omit it
    const client = makeClient();
    client.setCredentials(tokens);
    // Persist refreshed tokens locally (no-op on Vercel)
    client.on("tokens", (refreshed) => {
        const current = loadTokens() || {};
        saveTokens({ ...current, ...refreshed });
    });
    return client;
}

/**
 * Find the "Wine Stock Sheets" folder or create it.
 * Returns folder ID.
 * @param {google.auth.OAuth2} client
 */
async function findOrCreateFolder(client) {
    const drive = google.drive({ version: "v3", auth: client });

    const res = await drive.files.list({
        q: `mimeType='${MIME_FOLDER}' and name='${FOLDER_NAME}' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });

    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const folder = await drive.files.create({
        requestBody: {
            name:        FOLDER_NAME,
            mimeType:    MIME_FOLDER,
            description: "Auto-generated by Jai Durga Wine Shop Daily Stock Manager",
        },
        fields: "id",
    });
    return folder.data.id;
}

/**
 * Upload an xlsx buffer to the Drive folder.
 */
async function uploadFile(filename, buffer) {
    const tokens = loadTokens();
    if (!tokens) throw new Error("Google Drive not connected.");

    const client = getAuthenticatedClient();
    const drive  = google.drive({ version: "v3", auth: client });

    let folderId = tokens.folderId;
    if (!folderId) {
        folderId = await findOrCreateFolder(client);
        saveTokens({ ...tokens, folderId });
    }

    const { Readable } = require("stream");
    const stream = Readable.from(buffer);

    const res = await drive.files.create({
        requestBody: {
            name:    filename,
            parents: [folderId],
        },
        media: {
            mimeType: MIME_XLSX,
            body:     stream,
        },
        fields: "id, name",
    });

    return { id: res.data.id, name: res.data.name, folderName: FOLDER_NAME };
}

/**
 * Disconnect: delete saved tokens.
 */
function disconnect() {
    deleteTokens();
}

/**
 * Status info for the frontend.
 */
function getStatus() {
    const connected = isConnected();
    const tokens    = connected ? loadTokens() : null;
    return {
        connected,
        folderName: connected ? FOLDER_NAME : null,
        folderId:   tokens?.folderId || null,
    };
}

module.exports = { getAuthUrl, handleCallback, isConnected, uploadFile, disconnect, getStatus };
