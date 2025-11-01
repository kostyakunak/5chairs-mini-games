/*
  # Add More Mini-Games
  
  1. Changes
    - Add 2 new mini-games to the games table:
      - "Шляпа" (Hat) - word guessing game, min 4 players
      - "Контакт" (Contact) - word association game, min 3 players
  
  2. Notes
    - Expands the variety of available games
    - Each game has appropriate minimum player requirements
*/

-- Insert new mini-games
INSERT INTO games (name, min_players, description) VALUES
  ('Шляпа', 4, 'Объясняйте и угадывайте слова на скорость'),
  ('Контакт', 3, 'Угадайте загаданное слово через ассоциации')
ON CONFLICT DO NOTHING;