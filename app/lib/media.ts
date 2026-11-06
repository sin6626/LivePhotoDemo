import { validateMp4 } from './motion-photo';

export async function readEditorImage(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error('图片请控制在 20 MB 以内。');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('浏览器无法读取这张图片。'); });
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error('图片请控制在 2400 万像素以内。');
    return { blob: file, name: file.name, width: bitmap.width, height: bitmap.height };
  } finally { bitmap.close(); }
}

export async function readImage(file: File) {
  if (!/\.(png|jpe?g)$/i.test(file.name)) throw new Error('封面请选择 PNG、JPG 或 JPEG。');
  if (file.size > 20 * 1024 * 1024) throw new Error('图片请控制在 20 MB 以内。');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('图片无法解码，请重新选择 PNG 或 JPG。'); });
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error('图片请控制在 2400 万像素以内。');
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持图片处理。');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('JPEG 编码失败。')), 'image/jpeg', 0.92));
    canvas.width = canvas.height = 0;
    return { blob, name: file.name, width: bitmap.width, height: bitmap.height };
  } finally { bitmap.close(); }
}

export async function readVideo(file: File) {
  if (file.size > 100 * 1024 * 1024) throw new Error('视频请控制在 100 MB 以内。');
  await validateMp4(file);
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => finish(new Error('视频读取超时，请换一段较短的 MP4。')), 12000);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        video.onloadeddata = video.onerror = null;
        error ? reject(error) : resolve();
      };
      video.onloadeddata = () => finish();
      video.onerror = () => finish(new Error('浏览器无法播放此视频，建议使用 H.264 编码的 MP4。'));
      video.src = url;
    });
    if (!video.videoWidth || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('文件中没有可播放的视频轨道。');
    if (video.duration > 30) throw new Error('Demo 支持 30 秒以内的视频，建议选择 2–5 秒的片段。');
    return { blob: file, name: file.name, width: video.videoWidth, height: video.videoHeight, duration: video.duration };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
