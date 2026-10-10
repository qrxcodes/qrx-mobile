import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import type { ImageSource } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import type { Code } from '@/lib/types';

/** Bundled pictures for the mock build (`mock:<file>` image URLs). */
const mockImages: Record<string, number> = {
  hv8551: require('../../assets/mock/codes/hv8551.jpg'),
  '01-giraffe-savannah': require('../../assets/mock/codes/01-giraffe-savannah.jpg'),
  '02-coral-reef': require('../../assets/mock/codes/02-coral-reef.jpg'),
  '06-red-fox-birches': require('../../assets/mock/codes/06-red-fox-birches.jpg'),
  '10-venetian-canal': require('../../assets/mock/codes/10-venetian-canal.jpg'),
  '13-peacock-mosaic': require('../../assets/mock/codes/13-peacock-mosaic.jpg'),
  '15-whale-in-the-clouds': require('../../assets/mock/codes/15-whale-in-the-clouds.jpg'),
  '16-neon-koi-pond': require('../../assets/mock/codes/16-neon-koi-pond.jpg'),
  '17-fairytale-cottage': require('../../assets/mock/codes/17-fairytale-cottage.jpg'),
  '19-wave-and-mountain': require('../../assets/mock/codes/19-wave-and-mountain.jpg'),
  '22-ice-palace': require('../../assets/mock/codes/22-ice-palace.jpg'),
  '25-neon-samurai': require('../../assets/mock/codes/25-neon-samurai.jpg'),
  '33-balloon-festival': require('../../assets/mock/codes/33-balloon-festival.jpg'),
};

/** The style previews ship with the app, so the style grid shows at once and offline. Keyed by the preview's file. */
const stylePreviews: Record<string, number> = {
  nostyle: require('../../assets/styles/nostyle.jpg'),
  anime: require('../../assets/styles/anime.jpg'),
  cartoon: require('../../assets/styles/cartoon.jpg'),
  charcoal: require('../../assets/styles/charcoal.jpg'),
  cyberpunk: require('../../assets/styles/cyberpunk.jpg'),
  digitalart: require('../../assets/styles/digitalart.jpg'),
  fantasy: require('../../assets/styles/fantasy.jpg'),
  illustration: require('../../assets/styles/illustration.jpg'),
  photographic: require('../../assets/styles/photographic.jpg'),
  pixelart: require('../../assets/styles/pixelart.jpg'),
  popart: require('../../assets/styles/popart.jpg'),
  watercolor: require('../../assets/styles/watercolor.jpg'),
};

export function codeImageSource(imageUrl: string | null): ImageSource | number | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('mock:')) return mockImages[imageUrl.slice(5)] ?? null;
  return { uri: imageUrl, cacheKey: imageUrl };
}

/** The bundled preview for a style (matched on the preview file name the API gives), else the API's URL. */
export function stylePreviewSource(previewUrl: string | null): ImageSource | number | null {
  if (!previewUrl) return null;
  const file = /\/([a-z]+)(?:-\d+)?\.(?:png|webp|jpg|avif)$/i.exec(previewUrl)?.[1]?.toLowerCase();
  if (file && stylePreviews[file]) return stylePreviews[file]!;
  return { uri: previewUrl };
}

/** Downloads (or, in the mock build, unpacks) the code's picture to a cache file named after the code. */
async function localImage(code: Code): Promise<File> {
  if (!code.imageUrl) throw new Error('This code has no picture yet.');
  if (code.imageUrl.startsWith('mock:')) {
    const asset = await Asset.fromModule(mockImages[code.imageUrl.slice(5)]!).downloadAsync();
    const source = new File(asset.localUri!);
    const target = new File(Paths.cache, `qrx-${code.id}.jpg`);
    if (target.exists) target.delete();
    source.copy(target);
    return target;
  }
  const dir = new Directory(Paths.cache, 'codes');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `qrx-${code.id}.png`);
  if (target.exists) return target;
  return File.downloadFileAsync(code.imageUrl, target);
}

export type SaveResult = 'saved' | 'denied';

/** Adds the picture to the photo library. Asks only for add-only access on iOS; Android 10+ needs no permission. */
export async function saveToPhotos(code: Code): Promise<SaveResult> {
  // Android 10+ lets an app add its own images without a permission (the manifest blocks the read ones)
  const needsPermission = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) < 29);
  if (needsPermission) {
    const permission = await MediaLibrary.requestPermissionsAsync(true, []);
    if (!permission.granted) return 'denied';
  }
  const file = await localImage(code);
  await MediaLibrary.Asset.create(file.uri);
  return 'saved';
}

/** Opens the share sheet with the picture file. */
export async function shareImage(code: Code): Promise<void> {
  const file = await localImage(code);
  await Sharing.shareAsync(file.uri, {
    mimeType: file.uri.endsWith('.png') ? 'image/png' : 'image/jpeg',
    UTI: file.uri.endsWith('.png') ? 'public.png' : 'public.jpeg',
    dialogTitle: 'Share QR code',
  });
}

/** Opens the share sheet with the short link. */
export async function shareLink(code: Code): Promise<void> {
  if (!code.shortUrl) return;
  await Share.share(Platform.OS === 'ios' ? { url: code.shortUrl } : { message: code.shortUrl });
}

export async function copyLink(code: Code): Promise<void> {
  if (code.shortUrl) await Clipboard.setStringAsync(code.shortUrl);
}
