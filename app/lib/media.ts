import { isHeif, normalizeMedia } from './normalize-media';
import { validateMp4 } from './motion-photo';

export async function readEditorImage(file: File, signal?: AbortSignal) {
  if (await isHeif(file)) file = (await normalizeMedia(file, 'image', signal)).file;
  if (file.size > 20 * 1024 * 1024) throw new Error('Images must be smaller than 20 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This browser could not decode the image.'); });
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error('Images must be no larger than 24 megapixels.');
    return { blob: file, name: file.name, width: bitmap.width, height: bitmap.height };
  } finally { bitmap.close(); }
}

export async function readImage(file: File, signal?: AbortSignal) {
  const heif = await isHeif(file);
  if (heif) file = (await normalizeMedia(file, 'image', signal)).file;
  if (!/\.(png|jpe?g)$/i.test(file.name)) throw new Error('Choose a PNG, JPEG, HEIC or HEIF cover image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Images must be smaller than 20 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Could not decode the image. Choose a PNG or JPEG file.'); });
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error('Images must be no larger than 24 megapixels.');
    if (heif) return { blob: file, name: file.name, width: bitmap.width, height: bitmap.height, converted: true };
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser does not support image processing.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not encode the JPEG image.')), 'image/jpeg', 0.92));
    canvas.width = canvas.height = 0;
    return { blob, name: file.name, width: bitmap.width, height: bitmap.height, converted: false };
  } finally { bitmap.close(); }
}

export async function readVideo(file: File, signal?: AbortSignal) {
  if (file.size > 100 * 1024 * 1024) throw new Error('Videos must be smaller than 100 MB.');
  const normalized = await normalizeMedia(file, 'video', signal);
  file = normalized.file;
  await validateMp4(file);
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => finish(new Error('Video loading timed out. Try a shorter MP4 clip.')), 12000);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        video.onloadeddata = video.onerror = null;
        error ? reject(error) : resolve();
      };
      const abort = () => finish(new Error('Media preparation cancelled.'));
      if (signal?.aborted) return abort();
      signal?.addEventListener('abort', abort, { once:true });
      video.onloadeddata = () => finish();
      video.onerror = () => finish(new Error('This browser cannot play this video. Try an H.264 MP4 file.'));
      video.src = url;
    });
    if (!video.videoWidth || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('This file does not contain a playable video track.');
    if (video.duration > 30) throw new Error('Videos must be 30 seconds or shorter. A 2–5 second clip works best.');
    return { blob: file, name: file.name, width: video.videoWidth, height: video.videoHeight, duration: video.duration, action: normalized.action };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
