import sharp from 'sharp';

const MAX_DIMENSION = 900;
const JPEG_QUALITY = 82;

/**
 * Accepts a base64 data URL (image/jpeg, image/png, image/webp, etc.),
 * resizes it down to a maximum dimension and re-encodes it as an optimized
 * JPEG data URL. Falls back to the original input on any decode error.
 */
export async function optimizeImage(dataUrl: string): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return dataUrl;

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');

  try {
    let pipeline = sharp(buffer).rotate().resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (mime.includes('png') || mime.includes('webp')) {
      // Keep transparency for PNG/WebP when present.
      const meta = await sharp(buffer).metadata();
      if (meta.hasAlpha) {
        pipeline = pipeline.webp({ quality: 82 });
        const out = await pipeline.toBuffer();
        return `data:image/webp;base64,${out.toString('base64')}`;
      }
    }

    const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch {
    return dataUrl;
  }
}
