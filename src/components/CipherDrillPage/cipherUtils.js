export const CIPHER_TYPES = ['aristocrat', 'patristocrat', 'morse', 'baconian', 'columnar'];

export const CIPHER_LABELS = {
  aristocrat: 'Aristocrat',
  patristocrat: 'Patristocrat',
  morse: 'Morse Code',
  baconian: 'Baconian',
  columnar: 'Columnar Transposition',
};

export const MORSE_CODE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.',
};

// Generate 26-letter Baconian mapping: A=AAAAA(binary 0), B=AAAAB(1), ..., Z=BABBB(25)
export const BACONIAN = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => {
  BACONIAN[c] = i.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
});

export const PLAINTEXTS = {
  easy: [
    "THE SUN IS A STAR",
    "WATER IS A COMPOUND",
    "CELLS MAKE UP LIFE",
    "DNA CODES FOR PROTEINS",
    "ATOMS FORM ALL MATTER",
    "LIGHT TRAVELS FAST",
    "PLANTS USE SUNLIGHT",
    "THE MOON ORBITS EARTH",
  ],
  medium: [
    "MITOCHONDRIA IS THE POWERHOUSE OF THE CELL",
    "THE PERIODIC TABLE ORGANIZES ELEMENTS BY ATOMIC NUMBER",
    "PHOTOSYNTHESIS CONVERTS LIGHT ENERGY INTO GLUCOSE",
    "SCIENCE OLYMPIAD DIVISION B HAS TWENTY THREE EVENTS",
    "THE WATER CYCLE INVOLVES EVAPORATION AND CONDENSATION",
    "NEWTON DISCOVERED THE LAW OF UNIVERSAL GRAVITATION",
    "DNA IS MADE OF FOUR NUCLEOTIDE BASES ADENINE THYMINE GUANINE CYTOSINE",
  ],
  hard: [
    "THE OLFACTORY NERVE CARRIES SENSORY INFORMATION FOR SMELL FROM THE NASAL CAVITY TO THE BRAIN",
    "COLUMNAR TRANSPOSITION IS A CLASSIC CIPHER USED IN WARTIME COMMUNICATIONS BY MILITARY FORCES",
    "MENDELIAN GENETICS DESCRIBES INHERITANCE PATTERNS OF DOMINANT AND RECESSIVE ALLELES IN OFFSPRING",
    "THE BRADFORD HILL CRITERIA ESTABLISHES NINE VIEWPOINTS FOR EVALUATING CAUSATION IN EPIDEMIOLOGY",
    "CODEBUSTERS TESTS KNOWLEDGE OF HISTORICAL AND MODERN CRYPTOGRAPHIC TECHNIQUES USED THROUGHOUT HISTORY",
  ],
};

export const getRandomPlaintext = (difficulty) => {
  const texts = PLAINTEXTS[difficulty] || PLAINTEXTS.easy;
  return texts[Math.floor(Math.random() * texts.length)];
};

export const generateShuffledKey = () => {
  // Generate a random derangement (no letter maps to itself)
  let mapping = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Create a derangement using a simple algorithm
  let shuffled = [...letters].sort(() => Math.random() - 0.5);

  // Ensure no fixed points (letter mapping to itself)
  let isValid = false;
  while (!isValid) {
    shuffled = [...letters].sort(() => Math.random() - 0.5);
    isValid = true;
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === shuffled[i]) {
        isValid = false;
        break;
      }
    }
  }

  const encryptMap = {};
  const decryptMap = {};

  for (let i = 0; i < letters.length; i++) {
    encryptMap[letters[i]] = shuffled[i];
    decryptMap[shuffled[i]] = letters[i];
  }

  return { encryptMap, decryptMap };
};

export const encryptSubstitution = (plaintext, encryptMap) => {
  return plaintext
    .toUpperCase()
    .split('')
    .map((char) => (encryptMap[char] ? encryptMap[char] : char))
    .join('');
};

export const encodeToMorse = (text) => {
  const cleanText = text.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  return cleanText
    .split(' ')
    .map((word) =>
      word
        .split('')
        .map((char) => MORSE_CODE[char] || '')
        .filter((code) => code)
        .join(' ')
    )
    .join(' / ');
};

export const decodeMorse = (morse) => {
  // Create reverse mapping
  const reverseMorse = {};
  Object.entries(MORSE_CODE).forEach(([char, code]) => {
    reverseMorse[code] = char;
  });

  return morse
    .split(' / ')
    .map((word) =>
      word
        .split(' ')
        .map((code) => reverseMorse[code] || '')
        .join('')
    )
    .join(' ');
};

export const encodeBaconian = (text) => {
  const cleanText = text.toUpperCase().replace(/[^A-Z ]/g, '');
  return cleanText
    .split(' ')
    .map((word) =>
      word
        .split('')
        .map((char) => BACONIAN[char] || '')
        .join(' ')
    )
    .join(' | ');
};

export const decodeBaconian = (encoded) => {
  // Create reverse mapping
  const reverseBaconian = {};
  Object.entries(BACONIAN).forEach(([char, code]) => {
    reverseBaconian[code] = char;
  });

  return encoded
    .split(' | ')
    .map((word) =>
      word
        .split(' ')
        .map((code) => reverseBaconian[code] || '')
        .join('')
    )
    .join(' ');
};

export const getColumnarKeywords = () => [
  'ATOM', 'CELL', 'GENE', 'DNA', 'STAR', 'WAVE', 'ACID', 'BASE',
  'MASS', 'FORCE', 'LIGHT', 'LASER', 'ORBIT', 'QUARK', 'HELIX',
];

export const columnarEncrypt = (plaintext, keyword) => {
  const cleanText = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
  const cols = keyword.length;
  const rows = Math.ceil(cleanText.length / cols);
  const padded = (cleanText + 'X'.repeat(rows * cols - cleanText.length)).toUpperCase();

  // Create grid
  const grid = [];
  for (let i = 0; i < rows; i++) {
    grid.push(padded.substring(i * cols, i * cols + cols).split(''));
  }

  // Get column order by keyword
  const keywordWithIndex = keyword.split('').map((char, idx) => ({ char, idx }));
  const sorted = [...keywordWithIndex].sort((a, b) => a.char.localeCompare(b.char));
  const columnOrder = sorted.map((item) => item.idx);

  // Read columns in order
  let ciphertext = '';
  for (const colIdx of columnOrder) {
    for (let row = 0; row < rows; row++) {
      ciphertext += grid[row][colIdx];
    }
  }

  return ciphertext;
};

export const columnarDecrypt = (ciphertext, keyword) => {
  const cols = keyword.length;
  const rows = Math.ceil(ciphertext.length / cols);

  // Get column order by keyword
  const keywordWithIndex = keyword.split('').map((char, idx) => ({ char, idx }));
  const sorted = [...keywordWithIndex].sort((a, b) => a.char.localeCompare(b.char));
  const columnOrder = sorted.map((item) => item.idx);

  // Create grid (empty)
  const grid = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(''));

  // Fill columns in order from ciphertext
  let pos = 0;
  for (const colIdx of columnOrder) {
    for (let row = 0; row < rows; row++) {
      if (pos < ciphertext.length) {
        grid[row][colIdx] = ciphertext[pos];
        pos++;
      }
    }
  }

  // Read rows
  let plaintext = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      plaintext += grid[row][col];
    }
  }

  return plaintext.replace(/X+$/, '').trim();
};

export const getLetterFrequencies = (text) => {
  const freqs = {};
  for (let i = 0; i < 26; i++) {
    freqs[String.fromCharCode(65 + i)] = 0;
  }

  text
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .forEach((char) => {
      freqs[char]++;
    });

  return freqs;
};
