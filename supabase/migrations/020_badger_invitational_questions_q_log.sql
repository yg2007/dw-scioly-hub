-- Part Q: Ingestion log
─────────────────────────────────────
INSERT INTO ingestion_log (source_name, event_count, question_count, notes)
VALUES (
  'Badger Invitational 2025',
  5,
  136,
  'Division B only. Events: Ecology (50), Meteorology (20), Optics (12), Reach for the Stars (24), Wind Power (30). Extracted via pdfplumber + python-docx.'
)
ON CONFLICT (source_name) DO UPDATE SET
  event_count = EXCLUDED.event_count,
  question_count = EXCLUDED.question_count,
  notes = EXCLUDED.notes;
