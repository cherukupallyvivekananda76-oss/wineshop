// Quick verification: print the summary section rows from the generated xlsx
const ExcelJS = require("exceljs");
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile("test_output.xlsx").then(() => {
  const ws = wb.worksheets[0];
  const last = ws.lastRow.number;
  console.log("=== Sheet:", ws.name, "| Last row:", last, "===\n");

  for (let r = 200; r <= last; r++) {
    const a = ws.getRow(r).getCell("A").value;
    const b = ws.getRow(r).getCell("B").value;
    const h = ws.getRow(r).getCell("H").value;
    const iv = ws.getRow(r).getCell("I").value;
    if (!a && !b && !h && !iv) continue;
    const bstr = b && typeof b === "object" ? "(formula: " + b.formula + ")" : b;
    const istr = iv && typeof iv === "object" ? "(formula: " + iv.formula + ")" : iv;
    const hstr = h;
    console.log("Row " + String(r).padStart(3) + " | A: " + String(a || "").padEnd(40) + " | B: " + String(bstr || "").padEnd(35) + " | H: " + String(hstr || "") + " | I: " + String(istr || ""));
  }
});
