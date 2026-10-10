import type { QrxApi } from '@/lib/api';
import { MOCK_PROCESSING_ID, mockAccount, mockCodes, mockStyles, type MockCode } from '@/lib/mock-data';
import type { Code } from '@/lib/types';

/** Pictures resolve through `mock:<file>` URLs (see images.ts), so the bundled files are used on both platforms. */
const toCode = ({ image, ...code }: MockCode): Code => ({ ...code, imageUrl: image ? `mock:${image}` : null });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The API with bundled sample data and no network: the mock build signs in automatically and every screen has
 * something to show. A new code "finishes" after a few seconds with one of the sample pictures.
 */
export function createMockApi(): QrxApi {
  const codes = mockCodes();
  const created = new Map<string, { code: MockCode; readyAt: number }>();

  const find = (id: string): MockCode | undefined => {
    const made = created.get(id);
    if (made) {
      if (Date.now() >= made.readyAt && made.code.status === 'processing') {
        made.code = { ...made.code, status: 'succeeded', image: 'hv8551' };
      }
      return made.code;
    }
    return codes.find((c) => c.id === id);
  };

  return {
    async account() {
      return mockAccount();
    },
    async listStyles() {
      return { object: 'list', data: mockStyles, hasMore: false, nextCursor: null };
    },
    async listCodes() {
      const mine = [...[...created.values()].map((m) => find(m.code.id)!), ...codes];
      return { object: 'list', data: mine.map(toCode), hasMore: false, nextCursor: null };
    },
    async getCode(id, wait = 0) {
      const code = find(id);
      if (!code) throw new TypeError('not found');
      // the sample "in progress" code stays in progress, for the progress screenshot
      // the in-progress sample always looks about 25 seconds in ("Building the code into it")
      if (id === MOCK_PROCESSING_ID) code.createdAt = new Date(Date.now() - 25_000).toISOString();
      if (code.status !== 'processing') return toCode(code);
      // like the API, hold the request; the sample code never finishes, so it waits the whole time
      if (id === MOCK_PROCESSING_ID) {
        await delay(Math.min(wait, 25) * 1000);
        return toCode(code);
      }
      await delay(Math.min(wait, 2) * 1000);
      return toCode(find(id)!);
    },
    async createCode(body, idempotencyKey) {
      const id = `m${idempotencyKey
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 5)
        .toLowerCase()}`;
      if (!created.has(id)) {
        created.set(id, {
          readyAt: Date.now() + 6000,
          code: {
            id,
            object: 'code',
            status: 'processing',
            type: 'url',
            prompt: body.prompt,
            style: body.style ?? null,
            destination: body.destination,
            shortUrl: `https://qrx.to/${id}`,
            image: null,
            pageUrl: `https://qrx.codes/view/${id}`,
            error: null,
            createdAt: new Date().toISOString(),
          },
        });
      }
      return toCode(find(id)!);
    },
    async changeDestination(id, destination) {
      const code = find(id);
      if (!code) throw new TypeError('not found');
      code.destination = destination;
      return toCode(code);
    },
    async reportCode(id) {
      return { object: 'report', code: id, receivedAt: new Date().toISOString() };
    },
  };
}
