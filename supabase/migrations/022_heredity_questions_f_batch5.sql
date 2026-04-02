-- Part F: Heredity -- batch 5/5
INSERT INTO quiz_questions (event_id, topic, subtopic, question, options, correct_index, correct_answer_text, explanation, difficulty, question_type, points, source_tournament, ai_generated)
VALUES
INSERT INTO quiz_questions (event_id, topic, subtopic, question, options, correct_index, correct_answer_text, explanation, difficulty, question_type, points, source_tournament, ai_generated)
VALUES
  ((SELECT id FROM events WHERE name = 'Heredity'), 'RNA Structure and Function', NULL, 'Uracil is a base in DNA.', '["True", "False", "", ""]'::jsonb, 1, 'False', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'Sex-Linked Inheritance', NULL, 'Hemophilia B is a sex-linked recessive disorder.', '["True", "False", "", ""]'::jsonb, 0, 'True', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'General Genetics', NULL, 'The p-arm is the longer arm of a chromosome.', '["True", "False", "", ""]'::jsonb, 1, 'False', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'Chromatin Structure', NULL, 'Heterochromatin is genetically active.', '["True", "False", "", ""]'::jsonb, 1, 'False', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'Transcription', NULL, 'The stages of transcription are initiation, elongation, and termination.', '["True", "False", "", ""]'::jsonb, 0, 'True', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'RNA Structure and Function', NULL, 'mRNA assists in attaching amino acids to each other.', '["True", "False", "", ""]'::jsonb, 1, 'False', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'PCR', NULL, 'Taq polymerase is used to perform PCR.', '["True", "False", "", ""]'::jsonb, 0, 'True', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'RNA Structure and Function', NULL, 'The ribosome is made of rRNA and proteins.', '["True", "False", "", ""]'::jsonb, 0, 'True', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'DNA Replication', NULL, 'DNA replication is semiconservative.', '["True", "False", "", ""]'::jsonb, 0, 'True', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Heredity'), 'Mutations', NULL, 'A codon consists of two nucleotides.', '["True", "False", "", ""]'::jsonb, 1, 'False', NULL, 'easy', 'true_false', 1, 'Badger Invitational 2025', false);
