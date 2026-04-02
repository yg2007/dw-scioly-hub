-- Part J: Optics -- batch 2/2
INSERT INTO quiz_questions (event_id, topic, subtopic, question, options, correct_index, correct_answer_text, explanation, difficulty, question_type, points, source_tournament, ai_generated)
VALUES
INSERT INTO quiz_questions (event_id, topic, subtopic, question, options, correct_index, correct_answer_text, explanation, difficulty, question_type, points, source_tournament, ai_generated)
VALUES
  ((SELECT id FROM events WHERE name = 'Optics'), 'Mirrors', NULL, 'You are standing in front of the mirror and see your image. Now you take two steps towards your image. How does the distance between you and your image change?', '["4 steps closer", "4 steps away", "Same distance", "2 steps closer"]'::jsonb, 0, '4 steps closer', NULL, 'medium', 'multiple_choice', 1, 'Badger Invitational 2025', false),
  ((SELECT id FROM events WHERE name = 'Optics'), 'Mirrors', NULL, 'You are in a room with mirrored walls, floor, and ceiling. How many images of yourself can you see?', '["One", "Two", "A few dozen", "An infinite number"]'::jsonb, 3, 'An infinite number', NULL, 'hard', 'multiple_choice', 1, 'Badger Invitational 2025', false);
