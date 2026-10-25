// Central design tokens. Change these and the whole app follows.
export const colors = {
  bg: '#F3F6F2',
  surface: '#FFFFFF',
  ink: '#16261D',
  inkSoft: '#5B6B61',
  line: '#DDE5DE',
  accent: '#2E7D4F',
  accentSoft: '#E1F0E6',
  danger: '#B3361F',
  // Shopping lines you added yourself, which never scale with Cooking for. Lines from recipes use the accent.
  own: '#9A6700',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 14 };

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.ink },
  heading: { fontSize: 17, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  small: { fontSize: 13, color: colors.inkSoft },
};
