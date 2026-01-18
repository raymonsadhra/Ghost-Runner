export const AVATAR_BASES = [
  { id: 'street', name: 'Street Runner', color: '#2F6BFF' },
  { id: 'trail', name: 'Trail Nomad', color: '#3BA4FF' },
  { id: 'neon', name: 'Neon Sprinter', color: '#7FB2FF' },
];

export const COSMETIC_CATEGORIES = [
  { id: 'head', label: 'Head' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessory', label: 'Accessory' },
];

export const COSMETICS = [
  { id: 'cap_basic', name: 'Basic Cap', category: 'head', xpRequired: 0 },
  { id: 'hood_ember', name: 'Ember Hood', category: 'head', xpRequired: 300 },
  { id: 'helm_iron', name: 'Iron Helm', category: 'head', xpRequired: 800 },

  { id: 'tee_basic', name: 'Training Tee', category: 'top', xpRequired: 0 },
  { id: 'jacket_racer', name: 'Racer Jacket', category: 'top', xpRequired: 500 },
  { id: 'cloak_shadow', name: 'Shadow Cloak', category: 'top', xpRequired: 1200 },

  { id: 'shorts_basic', name: 'Running Shorts', category: 'bottom', xpRequired: 0 },
  { id: 'pants_utility', name: 'Utility Pants', category: 'bottom', xpRequired: 400 },
  { id: 'greaves_forge', name: 'Forge Greaves', category: 'bottom', xpRequired: 1100 },

  { id: 'shoes_basic', name: 'Daily Trainers', category: 'shoes', xpRequired: 0 },
  { id: 'shoes_bolt', name: 'Bolt Runners', category: 'shoes', xpRequired: 600 },
  { id: 'boots_war', name: 'Warstride Boots', category: 'shoes', xpRequired: 1400 },

  { id: 'band_basic', name: 'Pulse Band', category: 'accessory', xpRequired: 0 },
  { id: 'visor_holo', name: 'Holo Visor', category: 'accessory', xpRequired: 700 },
  { id: 'aura_flare', name: 'Flare Aura', category: 'accessory', xpRequired: 1600 },
];
