// Захардкоженный список мини-игр
// Контент игр (вопросы, слова и т.д.) также захардкожен в компонентах игр

import { Game } from '../types';

export const HARDCODED_GAMES: Game[] = [
  {
    id: 'viktorina',
    name: 'Викторина',
    min_players: 2,
    description: 'Ответьте на вопросы и проверьте свои знания'
  },
  {
    id: 'krokodil',
    name: 'Крокодил',
    min_players: 3,
    description: 'Показывайте слова без слов'
  },
  {
    id: 'mafiya',
    name: 'Мафия',
    min_players: 5,
    description: 'Классическая игра в детектива'
  },
  {
    id: 'alias',
    name: 'Алиас',
    min_players: 4,
    description: 'Объясняйте слова своей команде'
  },
  {
    id: 'danetki',
    name: 'Данетки',
    min_players: 2,
    description: 'Разгадайте загадочные истории'
  },
  {
    id: 'shlyapa',
    name: 'Шляпа',
    min_players: 4,
    description: 'Объясняйте и угадывайте слова на скорость'
  },
  {
    id: 'kontakt',
    name: 'Контакт',
    min_players: 3,
    description: 'Угадайте загаданное слово через ассоциации'
  }
];

