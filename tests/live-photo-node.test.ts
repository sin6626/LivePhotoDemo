import assert from 'node:assert/strict';
import test from 'node:test';
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical';
import { $createLivePhotoNode, LivePhotoNode } from '../app/editor/live-photo-node.ts';

test('实况图作为独立块与正文共存，JSON 往返保留素材身份且不塞入视频内容', () => {
  const editor = createEditor({ nodes: [LivePhotoNode], onError: error => { throw error; } });
  const data = { assetId: 'local-asset-1', fileName: '旅行_MP.jpg', width: 640, height: 480 };
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
    assert.equal(node.isInline(), false);
    assert.deepEqual(node.getData(), data);
    assert.equal($getRoot().getFirstChild()?.getTextContent(), '照片之前');
    assert.equal($getRoot().getLastChild()?.getTextContent(), '照片之后');
  });
});
