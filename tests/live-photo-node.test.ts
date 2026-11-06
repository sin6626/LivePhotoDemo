import assert from 'node:assert/strict';
import test from 'node:test';
import { $copyNode, $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical';
import { $isImageNode } from '@haklex/rich-editor/nodes';
import { $createLivePhotoNode, LivePhotoNode } from '../app/editor/live-photo-node.ts';

test('实况图作为独立块与正文共存，JSON 往返保留素材身份且不塞入视频内容', () => {
  const editor = createEditor({ nodes: [LivePhotoNode], onError: error => { throw error; } });
  const data = { src: 'blob:http://localhost/cover', videoSrc: 'blob:http://localhost/video', altText: '旅行封面', caption: '旅行说明', fileName: '旅行_MP.jpg', width: 640, height: 480 };
  editor.update(() => {
    $getRoot().append(
      $createParagraphNode().append($createTextNode('照片之前')),
      $createLivePhotoNode(data),
      $createParagraphNode().append($createTextNode('照片之后')),
    );
  }, { discrete: true });
  const saved = editor.getEditorState().toJSON();
  assert.deepEqual(saved.root.children.map(node => node.type), ['paragraph', 'live-photo', 'paragraph']);
  assert.ok(JSON.stringify(saved).length < 1500);
  editor.setEditorState(editor.parseEditorState(JSON.stringify(saved)));
  editor.getEditorState().read(() => {
    const node = $getRoot().getChildAtIndex(1);
    assert.ok(node instanceof LivePhotoNode);
    assert.ok($isImageNode(node), '必须是编辑器原 ImageNode 的扩展');
    assert.equal(node.isInline(), false);
    assert.equal(node.getSrc(), data.src);
    assert.equal(node.getVideoSrc(), data.videoSrc);
    assert.equal(node.getAltText(), data.altText);
    assert.equal(node.getCaption(), data.caption);
    assert.equal($getRoot().getFirstChild()?.getTextContent(), '照片之前');
    assert.equal($getRoot().getLastChild()?.getTextContent(), '照片之后');
  });
});

test('原图片的复制与替换方法保留实况信息，修改副本不影响原图', () => {
  const editor = createEditor({ nodes: [LivePhotoNode], onError: error => { throw error; } });
  editor.update(() => {
    const original = $createLivePhotoNode({ src: 'blob:http://localhost/one', videoSrc: 'blob:http://localhost/video', altText: '原图', fileName: 'one_MP.jpg', width: 640, height: 480 });
    $getRoot().append(original);
    const copy = $copyNode(original);
    original.insertAfter(copy);
    assert.ok($isImageNode(copy));
    assert.ok(copy instanceof LivePhotoNode);
    copy.setSrc('blob:http://localhost/new-cover');
    copy.setAltText('新描述');
    copy.setCaption('新图注');
    copy.setDimensions(480, 640);
    assert.equal(copy.getVideoSrc(), 'blob:http://localhost/video');
    copy.setVideoSrc('blob:http://localhost/new-video');
    assert.equal(copy.exportJSON().videoSrc, 'blob:http://localhost/new-video');
    assert.equal(original.getVideoSrc(), 'blob:http://localhost/video');
    assert.equal(original.getSrc(), 'blob:http://localhost/one');
    assert.equal(copy.getCaption(), '新图注');
  }, { discrete: true });
});
