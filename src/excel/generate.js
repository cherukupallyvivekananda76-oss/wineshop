"use strict";
const ExcelJS = require("exceljs");
const { getBrandRows } = require("../brands");

// ─── Column definitions ──────────────────────────────────────────────────────
// col index is 1-based (ExcelJS convention)
const COLUMNS = [
    { header: "Brand Name", key: "brandName", width: 22 },
    { header: "Size", key: "size", width: 7 },
    { header: "O.B. Stock", key: "obStock", width: 12 },
    { header: "Received", key: "received", width: 12 },
    { header: "Total", key: "total", width: 12 },
    { header: "C/B Stock", key: "cbStock", width: 12 },
    { header: "Sales", key: "sales", width: 12 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Amount", key: "amount", width: 14 },
];

// Theme colours
const HEADER_FILL      = "FF1A3C6E";  // deep navy – stock header
const HEADER_FONT      = "FFFFFFFF";  // white
const ALT_ROW_FILL     = "FFF0F4FA";  // light blue – alternate stock rows
const BORDER_COLOR     = "FFAABBD4";

// Summary section colours
const TOTAL_SALES_FILL = "FF1E4620";  // dark green  – Total Sales row
const TOTAL_SALES_FONT = "FFFFFFFF";
const EXPENSE_HDR_FILL = "FF5C3317";  // dark brown  – Expense header
const EXPENSE_HDR_FONT = "FFFFFFFF";
const TOTAL_EXP_FILL   = "FF7B3F00";  // amber-brown – Total Expenses row
const TOTAL_EXP_FONT   = "FFFFFFFF";
const CASH_HDR_FILL    = "FF1A3C6E";  // navy        – Cash Summary header
const CASH_LABEL_FILL  = "FFE8F4FD";  // very light blue – cash data rows
const BOLD_FONT        = "FF000000";  // black
const NUM_FMT          = "#,##0.00";

// ─── helpers ─────────────────────────────────────────────────────────────────

function thinBorder() {
    const side = { style: "thin", color: { argb: BORDER_COLOR } };
    return { top: side, left: side, bottom: side, right: side };
}

function mediumBorder() {
    const side = { style: "medium", color: { argb: "FF1A3C6E" } };
    return { top: side, left: side, bottom: side, right: side };
}

/**
 * Apply header styling to row 1.
 */
function styleHeader(row) {
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11, name: "Calibri" };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: HEADER_FILL },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
        cell.border = thinBorder();
    });
    row.height = 22;
}

/**
 * Apply styling to a data row.
 * @param {ExcelJS.Row} row
 * @param {number} rowIndex  1-based row index in the sheet
 */
function styleDataRow(row, rowIndex) {
    const isAlt = rowIndex % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = thinBorder();
        if (isAlt) {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: ALT_ROW_FILL },
            };
        }
        // Right-align numeric columns (C through I = cols 3-9)
        if (colNumber >= 3) {
            cell.alignment = { horizontal: "right", vertical: "middle" };
        } else {
            cell.alignment = { horizontal: "left", vertical: "middle" };
        }
        cell.font = { size: 10, name: "Calibri" };
    });
    row.height = 18;
}

/**
 * Build the header row.
 */
function buildHeaderRow(worksheet) {
    worksheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    styleHeader(worksheet.getRow(1));
}

/**
 * Add preloaded brand rows without formulas yet (formulas added in addFormulas).
 */
function addBrandRows(worksheet, brandRows) {
    for (const { brand, size } of brandRows) {
        worksheet.addRow({ brandName: brand, size });
    }
}

/**
 * Add empty filler rows to reach the desired total data row count.
 */
function addEmptyRows(worksheet, currentDataRows, totalRows) {
    const needed = totalRows - currentDataRows;
    for (let i = 0; i < needed; i++) {
        worksheet.addRow({});
    }
}

/**
 * Fill formula cells for all data rows (rows 2 .. lastRow).
 * Formula columns: E (Total), G (Sales), I (Amount)
 */
function addFormulas(worksheet) {
    const lastRow = worksheet.lastRow.number;
    for (let i = 2; i <= lastRow; i++) {
        const row = worksheet.getRow(i);
        // E = C + D   (Total = O.B.Stock + Received)
        row.getCell("E").value = { formula: `C${i}+D${i}`, result: undefined };
        // G = E - F   (Sales = Total - C/B Stock)
        row.getCell("G").value = { formula: `E${i}-F${i}`, result: undefined };
        // I = G * H   (Amount = Sales * Rate)
        row.getCell("I").value = { formula: `G${i}*H${i}`, result: undefined };
        row.commit();
    }
}

/**
 * Apply styles to every data row and freeze the header.
 */
function applyStyles(worksheet) {
    const lastRow = worksheet.lastRow.number;
    for (let i = 2; i <= lastRow; i++) {
        styleDataRow(worksheet.getRow(i), i);
    }
    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
    // Bold + style for formula result cells (number format)
    const numFmt = '#,##0.00';
    ["E", "G", "I"].forEach((col) => {
        worksheet.getColumn(col).numFmt = numFmt;
    });
}

// ─── Summary section helpers ─────────────────────────────────────────────────

/**
 * Write a single styled summary row with a label cell and an optional value cell.
 */
function writeSummaryRow(ws, rowNum, labelCol, labelText, valueCol, value, opts = {}) {
    const {
        fillArgb = null,
        fontArgb = BOLD_FONT,
        fontSize = 10,
        numFmt: fmt = NUM_FMT,
        height = 20,
    } = opts;

    const row = ws.getRow(rowNum);
    row.height = height;

    const labelCell = row.getCell(labelCol);
    labelCell.value     = labelText;
    labelCell.font      = { bold: true, size: fontSize, name: "Calibri", color: { argb: fontArgb } };
    labelCell.alignment = { horizontal: "left", vertical: "middle" };
    labelCell.border    = mediumBorder();
    if (fillArgb) {
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
    }

    if (valueCol) {
        const valueCell = row.getCell(valueCol);
        if (value !== undefined) {
            valueCell.value  = value;
            valueCell.numFmt = fmt;
        }
        valueCell.font      = { bold: true, size: fontSize, name: "Calibri", color: { argb: fontArgb } };
        valueCell.alignment = { horizontal: "right", vertical: "middle" };
        valueCell.border    = mediumBorder();
        if (fillArgb) {
            valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
        }
    }

    row.commit();
}

/**
 * Add the Total Sales row immediately below the stock data.
 * Returns the row number used.
 */
function addTotalSalesRow(ws, dataEndRow) {
    const r = dataEndRow + 1;
    writeSummaryRow(
        ws, r,
        "H", "Total Sales",
        "I", { formula: `SUM(I2:I${dataEndRow})`, result: undefined },
        { fillArgb: TOTAL_SALES_FILL, fontArgb: TOTAL_SALES_FONT, fontSize: 11, height: 22 }
    );
    return r;
}

/**
 * Add the Expense block: header row + 7 manual-entry rows + Total Expenses row.
 * Returns { totalExpenseRow }.
 */
function addExpenseBlock(ws, totalSalesRow) {
    const EXPENSE_ROWS = 7;

    // blank gap
    ws.getRow(totalSalesRow + 1).height = 10;

    // Expense header
    const expHdrRow = totalSalesRow + 2;
    {
        const row = ws.getRow(expHdrRow);
        row.height = 20;
        [["A", "Expense Head"], ["B", "Amount"]].forEach(([col, val]) => {
            const cell = row.getCell(col);
            cell.value     = val;
            cell.font      = { bold: true, size: 11, color: { argb: EXPENSE_HDR_FONT }, name: "Calibri" };
            cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: EXPENSE_HDR_FILL } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border    = mediumBorder();
        });
        row.commit();
    }

    // 7 blank input rows
    const entryStart = expHdrRow + 1;
    const entryEnd   = entryStart + EXPENSE_ROWS - 1;
    for (let r = entryStart; r <= entryEnd; r++) {
        const row = ws.getRow(r);
        row.height = 18;
        const a = row.getCell("A");
        a.font = { size: 10, name: "Calibri" };
        a.alignment = { horizontal: "left", vertical: "middle" };
        a.border = thinBorder();
        const b = row.getCell("B");
        b.numFmt = NUM_FMT;
        b.alignment = { horizontal: "right", vertical: "middle" };
        b.border = thinBorder();
        row.commit();
    }

    // Total Expenses
    const totalExpRow = entryEnd + 1;
    writeSummaryRow(
        ws, totalExpRow,
        "A", "Total Expenses",
        "B", { formula: `SUM(B${entryStart}:B${entryEnd})`, result: undefined },
        { fillArgb: TOTAL_EXP_FILL, fontArgb: TOTAL_EXP_FONT, fontSize: 11, height: 22 }
    );

    return { totalExpenseRow: totalExpRow };
}

/**
 * Add the Daily Cash Summary block (header + 5 data rows).
 */
function addCashSummaryBlock(ws, totalSalesRow, totalExpenseRow) {
    // blank gap
    ws.getRow(totalExpenseRow + 1).height = 10;

    // Section header
    const hdrRow = totalExpenseRow + 2;
    {
        const row = ws.getRow(hdrRow);
        row.height = 22;
        [["A", "Daily Cash Summary"], ["B", "\u20B9 Amount"]].forEach(([col, val]) => {
            const cell = row.getCell(col);
            cell.value     = val;
            cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: CASH_HDR_FILL } };
            cell.font      = { bold: true, size: 11, color: { argb: HEADER_FONT }, name: "Calibri" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border    = mediumBorder();
        });
        row.commit();
    }

    const r0 = hdrRow + 1;  // first cash data row

    // 1. Total Sales (pulls from stock table total)
    writeSummaryRow(ws, r0,
        "A", "Total Sales (from stock)",
        "B", { formula: `I${totalSalesRow}`, result: undefined },
        { fillArgb: CASH_LABEL_FILL, fontArgb: BOLD_FONT }
    );
    // 2. Total Expenses
    writeSummaryRow(ws, r0 + 1,
        "A", "Total Expenses",
        "B", { formula: `B${totalExpenseRow}`, result: undefined },
        { fillArgb: CASH_LABEL_FILL, fontArgb: BOLD_FONT }
    );
    // 3. Net Cash = Sales - Expenses
    writeSummaryRow(ws, r0 + 2,
        "A", "Net Cash (Sales \u2212 Expenses)",
        "B", { formula: `B${r0}-B${r0 + 1}`, result: undefined },
        { fillArgb: "FFD1FAE5", fontArgb: "FF064E3B" }   // mint green
    );
    // 4. Cash Deposited in Bank – manual input (empty cell)
    writeSummaryRow(ws, r0 + 3,
        "A", "Cash Deposited in Bank",
        "B", undefined,
        { fillArgb: "FFFFFBEB", fontArgb: BOLD_FONT }    // pale yellow
    );
    ws.getRow(r0 + 3).getCell("B").numFmt = NUM_FMT;    // format the empty input cell
    // 5. Cash Remaining = Net Cash - Deposited
    writeSummaryRow(ws, r0 + 4,
        "A", "Cash Remaining in Counter",
        "B", { formula: `B${r0 + 2}-B${r0 + 3}`, result: undefined },
        { fillArgb: "FFFFE4E6", fontArgb: "FF881337" }  // pale red
    );
}

// ─── Main exported function ───────────────────────────────────────────────────

/**
 * Generate an Excel workbook buffer.
 * @param {string} date            "YYYY-MM-DD"
 * @param {number} rows            Total data rows to generate
 * @param {boolean} preloadBrands  Whether to prefill brand/size rows
 * @param {Array}  [rowData]       Optional array of { brand, size, opening, received, closing, rate }
 *                                 pre-filled from mobile entry. Values injected into matching rows.
 * @returns {Promise<Buffer>}
 */
async function generateExcel(date, rows, preloadBrands, rowData) {
    if (!date) throw new Error("date is required");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "JaiDurga Wine Shop";
    workbook.created = new Date();

    const sheetName = `Stock_${date}`;
    const worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: { fitToPage: true, fitToHeight: 1, fitToWidth: 1 },
        properties: { defaultRowHeight: 18 },
    });

    // 1. Header
    buildHeaderRow(worksheet);

    // 2. Brand rows (if enabled)
    let brandRowCount = 0;
    if (preloadBrands) {
        const brandRows = getBrandRows();
        addBrandRows(worksheet, brandRows);
        brandRowCount = brandRows.length;
    }

    // 3. Empty filler rows up to requested total
    const totalRows = Math.max(rows, brandRowCount);
    addEmptyRows(worksheet, brandRowCount, totalRows);

    // 4. Formulas (stock table: E, G, I)
    addFormulas(worksheet);

    // 5. Styles + freeze header
    applyStyles(worksheet);

    // 5b. Inject pre-filled values from mobile entry (rowData)
    if (Array.isArray(rowData) && rowData.length > 0) {
        // Build lookup: "BRAND|SIZE" → row values
        const lookup = new Map();
        for (const r of rowData) {
            const key = `${(r.brand || "").trim().toUpperCase()}|${(r.size || "").trim().toUpperCase()}`;
            lookup.set(key, r);
        }
        // Walk each data row and fill values where brand+size matches
        const lastDataRow = worksheet.lastRow.number;
        for (let i = 2; i <= lastDataRow; i++) {
            const row = worksheet.getRow(i);
            const brand = String(row.getCell("A").value || "").trim().toUpperCase();
            const size  = String(row.getCell("B").value || "").trim().toUpperCase();
            const key   = `${brand}|${size}`;
            const d     = lookup.get(key);
            if (d) {
                if (d.opening  != null) row.getCell("C").value = Number(d.opening);
                if (d.received != null) row.getCell("D").value = Number(d.received);
                if (d.closing  != null) row.getCell("F").value = Number(d.closing);
                if (d.rate     != null) row.getCell("H").value = Number(d.rate);
                row.commit();
            }
        }
    }

    // DATA_END_ROW = last row of the stock table (row 1 is header, data = 2..N)
    const DATA_END_ROW = worksheet.lastRow.number;

    // 6. Total Sales row  (DATA_END_ROW + 1)
    const totalSalesRow = addTotalSalesRow(worksheet, DATA_END_ROW);

    // 7. Expense block   (gap + header + 7 entry rows + Total Expenses)
    const { totalExpenseRow } = addExpenseBlock(worksheet, totalSalesRow);

    // 8. Cash Summary block  (gap + header + 5 rows)
    addCashSummaryBlock(worksheet, totalSalesRow, totalExpenseRow);

    // Return as buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = { generateExcel };
