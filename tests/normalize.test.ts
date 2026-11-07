import assert from 'node:assert/strict';
import test from 'node:test';
import { videoPlan } from '../server/normalize.ts';

const video = { codec_type: 'video', codec_name: 'h264', profile: 'High', level: 41, pix_fmt: 'yuv420p', width: 864, height: 1920, avg_frame_rate: '29/1' };
const audio = { codec_type: 'audio', codec_name: 'aac', profile: 'LC', channels: 2 };
const probe = (brand: string, v = video, a = audio) => ({ format: { duration: '2.94', tags: { major_brand: brand } }, streams: [v, a] });
test('同一 H.264/AAC 在 MP4 中直通、在 MOV 中仅换容器；HEVC 只重编视频', () => {
  assert.equal(videoPlan(probe('isom')).action, 'original');
  assert.equal(videoPlan(probe('qt  ')).action, 'remuxed');
  assert.deepEqual(videoPlan(probe('isom', { ...video, codec_name: 'hevc' })), { action: 'converted', copyVideo: false, copyAudio: true });
  assert.equal(videoPlan(probe('qt  ', video, { ...audio, codec_name: 'pcm_s16le' })).copyVideo, true);
});
test('转码前拒绝超时长、HDR 和没有视频的输入', () => {
  assert.throws(() => videoPlan({ ...probe('qt  '), format: { duration: '31' } }), /30 seconds/);
  assert.throws(() => videoPlan({ ...probe('qt  '), streams: [{ ...video, color_transfer: 'smpte2084' }] }), /HDR/);
  assert.throws(() => videoPlan({ ...probe('qt  '), streams: [audio] }), /video track/);
});
