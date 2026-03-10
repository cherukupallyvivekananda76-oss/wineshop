"use strict";
const ExcelJS = require("exceljs");

const EXPECTED_HEADERS = [
    "Brand Name", "Size", "O.B. Stock", "Received",
    "Total", "C/B Stock", "Sales", "Rate", "Amount",
];

/**
 * Parse an uploaded .xlsx buffer and return structured data.
 * @param {Buffer} buffer
 * @returns {Promise<{sheetName: string, headers: string[], rows: any[][]}>}
 */
async function previewExcel(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        throw new Error("No sheets found in the uploaded file.");
    }

    const sheetName = worksheet.name;
    const allRows = [];

    worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = row.values.slice(1); // ExcelJS uses 1-based, index 0 is empty
        allRows.push(values);
    });

    if (allRows.length === 0) {
        return { sheetName, headers: EXPECTED_HEADERS, rows: [] };
    }

    // First row is headers
    const headers = allRows[0].map((h) => (h !== null && h !== undefined ? String(h) : ""));
    // Data rows (up to first 50)
    const dataRows = allRows.slice(1, 51).map((row) =>
        row.map((cell) => {
            if (cell === null || cell === undefined) return "";
            // ExcelJS returns formula cells as objects { formula, result }
            if (typeof cell === "object" && cell.result !== undefined) return cell.result;
            if (typeof cell === "object" && cell.text !== undefined) return cell.text;
            return cell;
        })
    );

    return { sheetName, headers, rows: dataRows };
}

module.exports = { previewExcel };
