# 🍷 Jai Durga Wine Shop – Daily Stock Excel Manager

A simple web app for generating pre-formatted Excel stock sheets for the wine shop. Staff fill data offline in Excel — the app auto-calculates **Total**, **Sales**, and **Amount** using formulas.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher

### Install & Run

```bash
# Navigate to project folder
cd allwineshopexcel

# Install dependencies (one-time setup)
npm install

# Start the server
node server.js
```

Then open your browser at: **http://localhost:3000**

---

## How to Use

### Generating a Sheet
1. Select the **date** for the sheet (defaults to today).
2. Enter the **number of rows** you need (default: 200).
3. Check **"Preload Standard Brand List"** to pre-fill brand names and sizes.
4. Click **"Generate & Download Excel"** – the file downloads automatically.

> File name format: `JaiDurga_Stock_YYYY-MM-DD.xlsx`

### Filling the Sheet (in Excel)
- Open the downloaded file.
- Enter values only in the **white input cells**:
  - **O.B. Stock** (Column C)
  - **Received** (Column D)
  - **C/B Stock** (Column F)
  - **Rate** (Column H)
- The following columns **calculate automatically**:
  - `Total (E)` = O.B. Stock + Received
  - `Sales (G)` = Total − C/B Stock
  - `Amount (I)` = Sales × Rate

### Previewing a Filled Sheet
1. Scroll to **"Preview Filled Excel"**.
2. Upload any `.xlsx` file (drag-and-drop or click to browse).
3. The first 50 rows will be displayed as a table — no data is modified.

---

## Customizing the App

### Change Default Number of Rows
Open `public/index.html` and find:
```html
<input type="number" id="rows" ... value="200" />
```
Change `200` to your preferred default.

### Update the Preloaded Brand List
Open `src/brands.js`. Add or remove entries in the `BRANDS` array:

```js
const BRANDS = [
  { brand: "Your Brand Name", sizes: ["Q", "P", "N"] },
  // ...
];
```

Size codes: `Q` = Quarter, `P` = Pint, `N` = Nip, `D` = Double.

### Change the Port
Set the `PORT` environment variable:
```bash
PORT=8080 node server.js
```

---

## Project Structure

```
allwineshopexcel/
├── server.js               # Express server entry point
├── package.json
├── src/
│   ├── brands.js           # ← Edit this to change brand list
│   ├── routes/
│   │   └── api.js          # POST /api/generate-excel & /api/preview-excel
│   └── excel/
│       ├── generate.js     # Excel generation, formulas, styling
│       └── preview.js      # Excel parsing for preview
└── public/
    ├── index.html          # Frontend UI
    ├── style.css           # Styles
    └── app.js              # Frontend logic
```

---

## Column Reference

| Column | Header     | Type    | Formula                    |
|--------|-----------|---------|----------------------------|
| A      | Brand Name | Input   | —                          |
| B      | Size       | Input   | —                          |
| C      | O.B. Stock | Input   | —                          |
| D      | Received   | Input   | —                          |
| **E**  | **Total**  | Formula | `= C + D`                 |
| F      | C/B Stock  | Input   | —                          |
| **G**  | **Sales**  | Formula | `= E − F`                 |
| H      | Rate       | Input   | —                          |
| **I**  | **Amount** | Formula | `= G × H`                 |

---

*This app is a daily Excel helper only — no AI, no cross-day analysis, no OCR.*
