/**
 * Standard brand list for Jai Durga Wine Shop.
 *
 * HOW TO UPDATE:
 * Add or remove entries in the array below.
 * Each entry has a `brand` name and `sizes` array.
 * Size codes: Q = Quarter, P = Pint, N = Nip, D = Double, Di = special size
 * Use an empty string "" in sizes to produce a single row with no size code.
 */

const BRANDS = [
  { brand: "Johny Walker", sizes: [""] },  // single row, no size
  { brand: "Black & White", sizes: ["Q", "P", "N"] },
  { brand: "Rock Ford", sizes: ["Q", "P", "N"] },
  { brand: "Black Dog Rockfo", sizes: ["Q", "P", "N"] },
  { brand: "100 Pipers", sizes: ["Q", "P", "N"] },
  { brand: "Antiquity", sizes: ["Q", "P", "N"] },
  { brand: "Blenders Pride", sizes: ["Q", "P", "N"] },
  { brand: "Signature", sizes: ["Q", "P", "N"] },
  { brand: "R.C. Whisky", sizes: ["Q", "P", "N"] },
  { brand: "B7", sizes: ["Q", "P", "N"] },
  { brand: "Royal Stag", sizes: ["Q", "P", "N"] },
  { brand: "Royal Green", sizes: ["Q", "P", "N"] },
  { brand: "R.C. Blue", sizes: ["Q", "P", "N", "D"] },
  { brand: "8 P.M.", sizes: ["Q", "P", "N"] },
  { brand: "M.C. Whisky", sizes: ["Q", "P", "N"] },
  { brand: "I.B.", sizes: ["Di"] },  // single row, size = "Di"
  { brand: "I.B. Whisky", sizes: ["Q", "P", "N"] },
  { brand: "ICONIC", sizes: ["Q", "P", "N"] },
  { brand: "One More", sizes: ["Q", "P", "N"] },
  { brand: "Golfershot", sizes: ["Q", "P", "N"] },
  { brand: "M.H. Brandy", sizes: ["Q", "P", "N"] },
  { brand: "M.H. Whisky", sizes: ["Q", "P", "N"] },
  { brand: "O.C. Whisky", sizes: ["Q", "P", "N", "D"] },
  { brand: "Chief", sizes: ["N"] },
  { brand: "Teachers", sizes: ["Q"] },
  { brand: "American Pride", sizes: ["Q"] },
  { brand: "Black Dog Reserve", sizes: ["Q"] },
  { brand: "Deavers", sizes: ["Q"] },
  { brand: "Elite Club Wine", sizes: ["Q", "P", "N"] },
  { brand: "Knockout", sizes: [""] },  // single row, no size
  { brand: "R.C. Light", sizes: [""] },  // single row, no size
  { brand: "Budwiser", sizes: [""] },  // single row, no size
  { brand: "Breezer", sizes: [""] },  // single row, no size
  { brand: "K.F. Strong", sizes: [""] },  // single row, no size
  { brand: "K.F. Light", sizes: [""] },  // single row, no size
];

/**
 * Returns a flat array of { brand, size } rows for the template.
 */
function getBrandRows() {
  const rows = [];
  for (const entry of BRANDS) {
    for (const size of entry.sizes) {
      rows.push({ brand: entry.brand, size });
    }
  }
  return rows;
}

module.exports = { BRANDS, getBrandRows };
