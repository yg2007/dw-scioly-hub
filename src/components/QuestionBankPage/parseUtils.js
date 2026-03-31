/** Extract correct_index (0–3) from a correct_answer string like "B - text" or just "B" */
export function parseCorrectIndex(correctAnswer, choices = []) {
  const s = String(correctAnswer || "").trim();
  const letterMatch = s.match(/^([A-Da-d])\s*[-–.)s]/);
  if (letterMatch) return letterMatch[1].toUpperCase().charCodeAt(0) - 65;
  if (/^[A-Da-d]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
  // fall back to text match
  const lower = s.toLowerCase();
  const idx = choices.findIndex((c) => c && String(c).toLowerCase() === lower);
  return idx >= 0 ? idx : 0;
}

/** Infer question_type from the choices array */
export function inferType(choices = []) {
  const filled = choices.filter(Boolean);
  if (filled.length === 0) return "short_answer";
  if (filled.length === 2 && filled.some((c) => /^true$/i.test(c))) return "true_false";
  return "multiple_choice";
}

/** Parse a JSON file (array or { questions: [...] } object) */
export function parseJSON(text) {
  const raw = JSON.parse(text);
  const arr = Array.isArray(raw) ? raw
    : Array.isArray(raw.questions) ? raw.questions
    : [];

  return arr.map((q, i) => {
    const choices = (q.choices || q.options || []).map(String);
    const qType = inferType(choices);
    const correctRaw = q.correct_answer || q.correctAnswer || q.answer || "";
    return {
      _id: i,
      eventHint: q.event || q.event_name || null,
      question: String(q.question || q.text || "").trim(),
      question_type: qType,
      options: qType !== "short_answer" ? choices.slice(0, 4) : null,
      correct_index: qType !== "short_answer" ? parseCorrectIndex(correctRaw, choices) : null,
      correct_answer_text: correctRaw,
      topic: q.topic || "General",
      subtopic: q.subtopic || null,
      difficulty: Number(q.difficulty) || 2,
    };
  }).filter((q) => q.question.length > 0);
}

/** Parse a single CSV line, respecting quoted fields */
export function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

/** Parse a CSV file with flexible column names */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, "")
  );

  return lines.slice(1).map((line, i) => {
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, j) => { row[h] = (cols[j] || "").trim(); });

    const question = row.question || row.q || "";
    const choices = [
      row.a || row.choicea || row.choice_a || row.optiona || row.option1 || "",
      row.b || row.choiceb || row.choice_b || row.optionb || row.option2 || "",
      row.c || row.choicec || row.choice_c || row.optionc || row.option3 || "",
      row.d || row.choiced || row.choice_d || row.optiond || row.option4 || "",
    ].filter(Boolean);

    const correctRaw = row.correct || row.correctanswer || row.correct_answer || row.answer || "";
    const qType = inferType(choices);

    return {
      _id: i,
      eventHint: row.event || null,
      question: question.trim(),
      question_type: qType,
      options: qType !== "short_answer" ? choices : null,
      correct_index: qType !== "short_answer" ? parseCorrectIndex(correctRaw, choices) : null,
      correct_answer_text: correctRaw,
      topic: row.topic || "General",
      subtopic: row.subtopic || null,
      difficulty: parseInt(row.difficulty || "2") || 2,
    };
  }).filter((q) => q.question.length > 0);
}

export const CSV_TEMPLATE = `question,A,B,C,D,correct,topic,difficulty
Which lobe of the brain is responsible for speech production?,Frontal,Parietal,Occipital,Temporal,A,Brain Anatomy,2
What is the powerhouse of the cell?,Nucleus,Mitochondria,Ribosome,Golgi Apparatus,B,Cell Biology,1`;
