const encoder = new TextEncoder();
const decoder = new TextDecoder();
const xmpHeader = 'http://ns.adobe.com/xap/1.0/\0';

export async function validateMp4(video: Blob) {
  const bytes = new Uint8Array(await video.slice(0, 32).arrayBuffer());
  const brand = decoder.decode(bytes.slice(8, 12));
  if (bytes.length < 24 || decoder.decode(bytes.slice(4, 8)) !== 'ftyp' ||
      !/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(brand)) {
    throw new Error('请选择有效的 MP4 视频；MOV、WebM 暂不支持，请先转为 MP4。');
  }
}

/** image 必须是浏览器重新编码的干净 JPEG，避免旧 EXIF/XMP 和追加内容冲突。 */
export async function createMotionPhoto(image: Blob, video: Blob): Promise<Blob> {
  const start = new Uint8Array(await image.slice(0, 2).arrayBuffer());
  const end = new Uint8Array(await image.slice(-2).arrayBuffer());
  if (start[0] !== 255 || start[1] !== 216 || end[0] !== 255 || end[1] !== 217) {
    throw new Error('封面必须是完整的 JPEG 图片。');
  }
  await validateMp4(video);
  const xmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:GCamera="http://ns.google.com/photos/1.0/camera/" xmlns:Container="http://ns.google.com/photos/1.0/container/" xmlns:Item="http://ns.google.com/photos/1.0/container/item/" GCamera:MotionPhoto="1" GCamera:MotionPhotoVersion="1" GCamera:MotionPhotoPresentationTimestampUs="-1"><Container:Directory><rdf:Seq><rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="image/jpeg" Item:Semantic="Primary" Item:Length="0" Item:Padding="0"/></rdf:li><rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="${video.size}"/></rdf:li></rdf:Seq></Container:Directory></rdf:Description></rdf:RDF></x:xmpmeta>`;
  const payload = encoder.encode(xmpHeader + xmp);
  const length = payload.length + 2;
  const marker = new Uint8Array([255, 225, length >> 8, length & 255]);
  return new Blob([image.slice(0, 2), marker, payload, image.slice(2), video], { type: 'image/jpeg' });
}

/** 只检查本 Demo 生成的单 JPEG + 单 MP4 布局，不是通用实况图解析器。 */
export async function extractMotionPhoto(file: Blob): Promise<{image: Blob; video: Blob}> {
  const header = new Uint8Array(await file.slice(0, 65540).arrayBuffer());
  if (header[0] !== 255 || header[1] !== 216 || header[2] !== 255 || header[3] !== 225) {
    throw new Error('不是本 Demo 支持的 Motion Photo 文件。');
  }
  const xmpEnd = 4 + header[4] * 256 + header[5];
  const metadata = decoder.decode(header.slice(6, xmpEnd));
  const match = metadata.match(/Item:Semantic="MotionPhoto" Item:Length="(\d+)"/);
  const length = Number(match?.[1]);
  if (!metadata.startsWith(xmpHeader) || !metadata.includes('GCamera:MotionPhoto="1"') ||
      !Number.isSafeInteger(length) || length < 24 || length > file.size - xmpEnd - 2) {
    throw new Error('Motion Photo 视频长度或元数据损坏。');
  }
  const image = file.slice(0, file.size - length, 'image/jpeg');
  const end = new Uint8Array(await image.slice(-2).arrayBuffer());
  if (end[0] !== 255 || end[1] !== 217) throw new Error('Motion Photo 图片边界损坏。');
  const video = file.slice(-length, file.size, 'video/mp4');
  await validateMp4(video);
  return { image, video };
}
