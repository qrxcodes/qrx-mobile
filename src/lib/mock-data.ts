import type { Account, Code, Style } from './types';

/**
 * Sample data for the mock build (store screenshots and UI tests). The pictures are QRX's own showcase codes from
 * qrx.codes, bundled under assets/mock/codes; `image` is the file name without extension.
 */
export type MockCode = Omit<Code, 'imageUrl'> & { image: string | null };

const minutesAgo = (now: number, minutes: number) => new Date(now - minutes * 60_000).toISOString();

const samples: [id: string, image: string, prompt: string, style: string | null, destination: string][] = [
  [
    'hv8551',
    'hv8551',
    'A paper boat drifting on a calm lake at dawn, watercolour',
    'ae4c1',
    'https://harbourcafe.example/menu',
  ],
  [
    'f0x2k8',
    '06-red-fox-birches',
    'A red fox in a snowy birch forest, painted in watercolour',
    'ae4c1',
    'https://winterfair.example',
  ],
  [
    'k0ip0n',
    '16-neon-koi-pond',
    'A neon koi pond seen from above, with glowing fish and lily pads at night',
    'ea58c',
    'https://nightmarket.example',
  ],
  [
    'g1raf7',
    '01-giraffe-savannah',
    'A giraffe in the African savannah at golden hour, among acacia trees',
    '7eb2b',
    'https://zoo.example/tickets',
  ],
  [
    'w4v3fj',
    '19-wave-and-mountain',
    'A ukiyo-e woodblock print of a great wave with Mount Fuji behind it',
    null,
    'https://ramenbar.example',
  ],
  [
    'c0ral9',
    '02-coral-reef',
    'A vibrant coral reef with tropical fish and sunbeams streaming through the water',
    null,
    'https://diveshop.example',
  ],
  [
    'v3nic3',
    '10-venetian-canal',
    'A Venetian canal with gondolas and colourful palaces at sunset',
    null,
    'https://travel.example/venice',
  ],
  [
    'p3ac0k',
    '13-peacock-mosaic',
    'A Byzantine-style mosaic of a peacock in teal and gold tiles',
    null,
    'https://gallery.example',
  ],
  [
    'wh4l3s',
    '15-whale-in-the-clouds',
    'A giant whale swimming through the clouds in a dreamlike sky',
    '09562',
    'https://bookshop.example',
  ],
  [
    'c0tt4g',
    '17-fairytale-cottage',
    'A fairytale cottage covered in flowers in a sunny meadow',
    '1cbd6',
    'https://florist.example',
  ],
  [
    'ic3p4l',
    '22-ice-palace',
    'An ice palace in a frozen kingdom, crystal towers beneath an aurora',
    '09562',
    'https://skiclub.example',
  ],
  [
    's4mur4',
    '25-neon-samurai',
    'A cyberpunk samurai in the rain, his katana glowing neon',
    'ea58c',
    'https://gamenight.example',
  ],
  [
    'b4ll00',
    '33-balloon-festival',
    'A hot-air balloon festival over a canyon at sunrise',
    '7eb2b',
    'https://festival.example',
  ],
];

export const MOCK_PROCESSING_ID = 'n3wc0d';

export function mockCodes(now = Date.now()): MockCode[] {
  const finished: MockCode[] = samples.map(([id, image, prompt, style, destination], i) => ({
    id,
    object: 'code',
    status: 'succeeded',
    type: 'url',
    prompt,
    style,
    destination,
    shortUrl: `https://qrx.to/${id}`,
    image,
    pageUrl: `https://qrx.codes/view/${id}`,
    error: null,
    createdAt: minutesAgo(now, 3 + i * 97),
  }));
  const processing: MockCode = {
    id: MOCK_PROCESSING_ID,
    object: 'code',
    status: 'processing',
    type: 'url',
    prompt: 'A lighthouse on a rocky coast at dawn, soft blue watercolour',
    style: 'ae4c1',
    destination: 'https://harbourcafe.example/events',
    shortUrl: `https://qrx.to/${MOCK_PROCESSING_ID}`,
    image: null,
    pageUrl: `https://qrx.codes/view/${MOCK_PROCESSING_ID}`,
    error: null,
    createdAt: minutesAgo(now, 0.6),
  };
  return [processing, ...finished];
}

export const mockStyles: Style[] = [
  ['Noop', 'No style', 'nostyle'],
  ['ae4c1', 'Watercolour', 'watercolor'],
  ['7eb2b', 'Photographic', 'photographic'],
  ['1cbd6', 'Illustration', 'illustration'],
  ['09562', 'Fantasy', 'fantasy'],
  ['a64c5', 'Anime', 'anime'],
  ['06184', 'Cartoon', 'cartoon'],
  ['994ff', 'Charcoal', 'charcoal'],
  ['ea58c', 'Cyberpunk', 'cyberpunk'],
  ['30e33', 'Digital art', 'digitalart'],
  ['534d0', 'Pixel art', 'pixelart'],
  ['abe2f', 'Pop art', 'popart'],
].map(([id, name, file]) => ({
  id: id!,
  object: 'style' as const,
  name: name!,
  previewUrl: `https://qrx.codes/img/styles/${file}-192.webp`,
}));

export function mockAccount(now = Date.now()): Account {
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  return {
    object: 'account',
    plan: 'free',
    codes: { dailyLimit: 42, remainingToday: 37, resetsAt: reset.toISOString() },
    features: { changeDestination: true },
    credentials: { type: 'oauth', prefix: null, environment: 'live' },
  };
}
