import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Copy rules for the app and its store listings (docs/purchases.md): the app sells nothing, so no prices, plan names,
 * upgrade or subscription wording, and no links to pricing or checkout; link codes only (no Wi-Fi); no comparisons with
 * AI assistants. Changing a code's link is mentioned only "on a paid plan", and never in the App Store listing.
 */
const root = path.resolve(import.meta.dirname, '..');

const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full, ext) : ext.test(name) ? [full] : [];
  });

const selling =
  /\$\s?\d|€|£|\bprices?\b|\bpricing\b|\bupgrade|\bsubscri|\bstarter\b|\bpremium\b|\bpro plan\b|\btrial\b|\bbuy\b|\bpurchas|\/upgrade|\/billing/i;
const offLimits = /wi-?fi|chatgpt|\bclaude\b|\bgemini\b|copilot|\btier\b|\bbadge\b/i;

/** The code without its comments, so explanations for developers may name what the UI must not. */
const withoutComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    // image file paths on the API host are storage locations, not words anyone reads
    .replace(/https:\/\/qrx\.codes\/media\/[\w/.-]+/g, '');

const read = (file: string) => readFileSync(file, 'utf8');
const rel = (file: string) => path.relative(root, file);

describe('app copy', () => {
  const sources = files(path.join(root, 'src'), /\.(ts|tsx)$/);

  it.each(sources.map(rel))('%s sells nothing', (file) => {
    const code = withoutComments(read(path.join(root, file)));
    expect(code).not.toMatch(selling);
    expect(code).not.toMatch(offLimits);
  });

  it("never opens a code's web page, which links to upgrading", () => {
    for (const file of sources.filter((f) => /[\\/](app|ui)[\\/]/.test(f))) {
      expect(read(file), rel(file)).not.toMatch(/pageUrl/);
    }
  });

  it('opens website pages only in app view, without the site navigation that links to plans', () => {
    // the screens and the link list; API data and mock samples hold code-page URLs that the app never opens
    for (const file of sources.filter((f) => /[\\/](app|ui)[\\/]|config\.ts$/.test(f))) {
      const code = withoutComments(read(file));
      for (const match of code.matchAll(/(https:\/\/qrx\.codes|\$\{config\.apiBase\})\/[^'"`\s]*/g)) {
        expect(match[0], rel(file)).toMatch(/[?&]view=app/);
      }
    }
  });

  it('mentions paid plans only as "on a paid plan"', () => {
    for (const file of sources) {
      for (const match of withoutComments(read(file)).matchAll(/[^.'"`]*\bpaid\b[^.'"`]*/gi)) {
        expect(match[0], rel(file)).toMatch(/on a paid plan/i);
      }
    }
  });
});

describe('store listings', () => {
  const meta = (p: string) => read(path.join(root, 'store', 'metadata', p));
  const listing = [
    'ios/en-US/name.txt',
    'ios/en-US/subtitle.txt',
    'ios/en-US/promotional_text.txt',
    'ios/en-US/description.txt',
    'ios/en-US/keywords.txt',
    'ios/en-US/release_notes.txt',
    'android/en-US/title.txt',
    'android/en-US/short_description.txt',
    'android/en-US/full_description.txt',
  ];

  it.each(listing)('%s follows the copy rules', (file) => {
    const text = meta(file);
    expect(text).not.toMatch(selling);
    expect(text).not.toMatch(offLimits);
    for (const match of text.matchAll(/[^.]*\bpaid\b[^.]*/gi)) expect(match[0]).toMatch(/on a paid plan/i);
  });

  it('leaves changing a link out of the App Store listing', () => {
    for (const file of listing.filter((f) => f.startsWith('ios/')))
      expect(meta(file)).not.toMatch(/paid|change where/i);
  });

  it('fits the store limits', () => {
    const limits: Record<string, number> = {
      'ios/en-US/name.txt': 30,
      'ios/en-US/subtitle.txt': 30,
      'ios/en-US/promotional_text.txt': 170,
      'ios/en-US/description.txt': 4000,
      'ios/en-US/keywords.txt': 100,
      'ios/en-US/release_notes.txt': 4000,
      'android/en-US/title.txt': 30,
      'android/en-US/short_description.txt': 80,
      'android/en-US/full_description.txt': 4000,
    };
    for (const [file, max] of Object.entries(limits)) {
      const length = [...meta(file).trim()].length;
      expect(length, file).toBeGreaterThan(0);
      expect(length, file).toBeLessThanOrEqual(max);
    }
    expect(meta('ios/en-US/keywords.txt')).not.toMatch(/,\s/);
  });

  it('keeps reviewer notes free of secrets and assistant names', () => {
    const notes = meta('ios/review_information/notes.txt');
    expect(notes).not.toMatch(/qrx_[A-Za-z0-9]{8,}/);
    expect(notes).not.toMatch(offLimits);
  });
});
