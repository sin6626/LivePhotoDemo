import assert from 'node:assert/strict';
import test from 'node:test';
import { createMotionPhoto, extractMotionPhoto } from '../app/lib/motion-photo.ts';

const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]);
const video = new Blob([new Uint8Array([0, 0, 0, 24]), 'ftypisom', new Uint8Array(4), 'isommp42']);

test('输出可以从 XMP 长度定位视频，视频字节不被修改', async () => {
  const result = await createMotionPhoto(jpeg, video);
  const bytes = new Uint8Array(await result.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [255, 216, 255, 225]);
  const segmentLength = bytes[4] * 256 + bytes[5];
  const metadata = new TextDecoder().decode(bytes.slice(6, 4 + segmentLength));
  assert.match(metadata, /GCamera:MotionPhoto="1"/);
  assert.match(metadata, /Item:Length="24"/);
  assert.match(metadata, /Item:Semantic="Primary"/);
  assert.equal(bytes[4 + segmentLength], 255);
  assert.equal(bytes[5 + segmentLength], 217);
  assert.deepEqual(await result.slice(-24).arrayBuffer(), await video.arrayBuffer());
  const extracted = await extractMotionPhoto(result);
  assert.deepEqual(await extracted.video.arrayBuffer(), await video.arrayBuffer());
  assert.equal(extracted.image.size + extracted.video.size, result.size);
});

test('拒绝伪装成 JPEG 或 MP4 的文件与损坏的长度', async () => {
  await assert.rejects(createMotionPhoto(new Blob(['png']), video), /JPEG/);
  await assert.rejects(createMotionPhoto(jpeg, new Blob(['not mp4'])), /MP4/);
  await assert.rejects(extractMotionPhoto(jpeg), /Motion Photo/);
  const bad = new Blob(['GCamera:MotionPhoto="1" Item:Semantic="MotionPhoto" Item:Length="99999"']);
  await assert.rejects(extractMotionPhoto(bad));
});
