export async function isHeif(file: File) {
  if (/\.hei[cf]$/i.test(file.name) || /^image\/hei[cf](?:-sequence)?$/i.test(file.type)) return true;
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const text = new TextDecoder().decode(head);
  if (text.includes('avif') || text.includes('avis')) return false;
  return text.slice(4,8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(text.slice(8,12));
}

export async function normalizeMedia(file: File, kind: 'image'|'video', signal?: AbortSignal) {
  const limit = (kind === 'image' ? 20 : 100) * 1024 * 1024;
  if (!file.size || file.size > limit) throw new Error(`Choose a non-empty ${kind} up to ${limit / 1024 / 1024} MB.`);
  const url = new URL('/api/media/normalize', location.origin);
  const headers = { 'Content-Type':'application/octet-stream', 'X-Media-Kind':kind, 'X-Media-Name':encodeURIComponent(file.name) };
  let statusCode = 0;
  let summary: object = { error:'Request interrupted' };
  const timeout = AbortSignal.timeout(125000);
  try {
    const response = await fetch(url,{ method:'POST',headers,body:file,credentials:'omit',signal:signal ? AbortSignal.any([signal,timeout]) : timeout });
    statusCode = response.status;
    if (!response.ok) throw new Error(response.headers.get('content-type')?.startsWith('text/plain') ? (await response.text()).slice(0,300) : 'The local converter is unavailable.');
    const action = response.headers.get('X-Media-Action');
    const id = response.headers.get('X-Media-Id');
    if (response.status === 204 && action === 'original') {
      summary = { id, action, bytes:file.size };
      const mp4 = file.type === 'video/mp4' && /\.mp4$/i.test(file.name) ? file : new File([file], `${file.name.replace(/\.[^.]*$/, '')}.mp4`, { type:'video/mp4', lastModified:file.lastModified });
      return { file:mp4, action };
    }
    const type = kind === 'image' ? 'image/jpeg' : 'video/mp4';
    if (response.status !== 200 || (action !== 'remuxed' && action !== 'converted' && action !== 'cached') || response.headers.get('Content-Type') !== type) throw new Error('The local converter is unavailable. Run the demo on this Mac.');
    const blob = await response.blob();
    if (!blob.size || blob.size > limit) throw new Error('Invalid converted file size.');
    const output = new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.${kind === 'image' ? 'jpg' : 'mp4'}`, {type});
    summary = { id, action, bytes:output.size, type };
    return { file:output, action };
  } catch (error) {
    summary = { error:error instanceof Error ? error.message : 'Request failed' };
    throw error;
  } finally {
    if (import.meta.env.DEV) console.info('[local media]', { statusCode, method:'POST', url:url.href, headers, params:{name:file.name,type:file.type,size:file.size,kind}, response:summary });
  }
}
