export const BOSS_ARCHETYPES = [
  {
    id: 'knight',
    title: 'Azure Knight',
    names: ['Sir Nightguard', 'Lady Frostguard', 'The Iron Vow'],
    palette: {
      primary: '#2F6BFF',
      secondary: '#0F1B2E',
      accent: '#A3BFFF',
      trail: '#4F82FF',
    },
  },
  {
    id: 'dragon',
    title: 'Storm Dragon',
    names: ['Ashen Wyrm', 'Skyfire Drake', 'Galejaw'],
    palette: {
      primary: '#3BA4FF',
      secondary: '#0A2330',
      accent: '#9AD8FF',
      trail: '#3BA4FF',
    },
  },
  {
    id: 'devil',
    title: 'Void Devil',
    names: ['Maledict', 'Ash Duke', 'Ironhorn'],
    palette: {
      primary: '#6B5CFF',
      secondary: '#140F2E',
      accent: '#B8B0FF',
      trail: '#6B5CFF',
    },
  },
  {
    id: 'orc',
    title: 'Orc Warlord',
    names: ['Grimjaw', 'Gorebanner', 'Stonebreaker'],
    palette: {
      primary: '#2FA3FF',
      secondary: '#0E2233',
      accent: '#9AD2FF',
      trail: '#2FA3FF',
    },
  },
  {
    id: 'lich',
    title: 'Frost Lich',
    names: ['Throne of Ice', 'Gravenight', 'Sable Chill'],
    palette: {
      primary: '#4D96FF',
      secondary: '#0E1B30',
      accent: '#B6CCFF',
      trail: '#4D96FF',
    },
  },
  {
    id: 'reaper',
    title: 'Grim Reaper',
    names: ['Nocturne', 'Blackwind', 'Silence'],
    palette: {
      primary: '#7A5CFF',
      secondary: '#1B1730',
      accent: '#C9C0FF',
      trail: '#7A5CFF',
    },
  },
];

export function getBossCharacter(bossIndex = 1) {
  if (BOSS_ARCHETYPES.length === 0) return null;
  const safeIndex = Math.max(1, bossIndex);
  const archetype = BOSS_ARCHETYPES[(safeIndex - 1) % BOSS_ARCHETYPES.length];
  const name =
    archetype.names[(safeIndex - 1) % archetype.names.length] ?? archetype.title;

  return {
    id: archetype.id,
    title: archetype.title,
    name,
    palette: archetype.palette,
  };
}
