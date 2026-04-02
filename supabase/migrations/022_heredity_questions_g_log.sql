-- Part G: Ingestion log
-- Update ingestion log
UPDATE ingestion_log SET
  question_count = question_count + 50,
  event_count = event_count + 1,
  notes = notes || ' + Heredity (50 questions).'
WHERE source_name = 'Badger Invitational 2025';

-- If no row existed yet, insert one
INSERT INTO ingestion_log (source_name, event_count, question_count, notes)
SELECT 'Badger Invitational 2025', 1, 50, 'Heredity (50 questions).'
WHERE NOT EXISTS (SELECT 1 FROM ingestion_log WHERE source_name = 'Badger Invitational 2025');
