import { useColorScheme } from 'react-native';

/** The QRX palette, the same tokens as the website (web/app/app.css in the main repo). */
export const palettes = {
  light: {
    bg: '#f6f5f2',
    surface: '#ffffff',
    raised: '#ffffff',
    sunken: '#eeece7',
    ink: '#16171a',
    muted: '#5c6068',
    line: '#e3e1db',
    lineStrong: '#cbc8c0',
    field: '#8c8982',
    accent: '#2453d6',
    accentPressed: '#1b42b0',
    accentInk: '#ffffff',
    accentSoft: '#e8eefc',
    success: '#1d7348',
    successSoft: '#e2f3e9',
    danger: '#b42318',
    dangerSoft: '#fcebe9',
    warning: '#85570a',
    warningSoft: '#fdf3dc',
    shadow: 'rgba(0,0,0,0.18)',
  },
  dark: {
    bg: '#0d0e10',
    surface: '#15171a',
    raised: '#1c1f23',
    sunken: '#101113',
    ink: '#edece8',
    muted: '#a3a6ad',
    line: '#272a2f',
    lineStrong: '#3a3e45',
    field: '#6e727a',
    accent: '#86a8ff',
    accentPressed: '#a9c1ff',
    accentInk: '#0b1430',
    accentSoft: '#1a2440',
    success: '#6bd39a',
    successSoft: '#13281c',
    danger: '#ff8f85',
    dangerSoft: '#3a1a18',
    warning: '#f0c35a',
    warningSoft: '#33270f',
    shadow: 'rgba(0,0,0,0.6)',
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)['light']]: string };

/** Instrument Sans for text, Bricolage Grotesque for display, as on qrx.codes. Loaded in the root layout. */
export const fonts = {
  regular: 'InstrumentSans-Regular',
  medium: 'InstrumentSans-Medium',
  semibold: 'InstrumentSans-SemiBold',
  bold: 'InstrumentSans-Bold',
  display: 'BricolageGrotesque-SemiBold',
} as const;

export const radius = { sm: 6, md: 10, lg: 16, xl: 22, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Content never grows wider than this on iPad and large phones in landscape. */
export const MAX_CONTENT_WIDTH = 640;

export function useTheme(): { c: Palette; dark: boolean } {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { c: dark ? palettes.dark : palettes.light, dark };
}
