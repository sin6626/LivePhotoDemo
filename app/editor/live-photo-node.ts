import { $applyNodeReplacement, createCommand, DecoratorNode, type NodeKey, type SerializedLexicalNode } from 'lexical';
import { createElement, lazy, Suspense, type ReactElement } from 'react';
import { Radio } from 'lucide-react';
import type { CommandItemConfig } from '@haklex/rich-editor/commands';

const LivePhotoView = lazy(() => import('./live-photo-view'));
export const OPEN_LIVE_PHOTO_COMMAND = createCommand<void>('OPEN_LIVE_PHOTO');

export type LivePhotoData = { assetId: string; fileName: string; width: number; height: number };
type SerializedLivePhoto = SerializedLexicalNode & LivePhotoData;
export class LivePhotoNode extends DecoratorNode<ReactElement> {
  __data: LivePhotoData;
  static commandItems: CommandItemConfig[] = [{
    title: '实况图', description: '用图片和视频插入 Live Photo',
    icon: createElement(Radio, { size: 16 }),
    keywords: ['live', 'photo', 'motion', '实况', '动态照片'],
    group: 'insert', section: '媒体', placement: ['slash', 'toolbar', 'blockHandle'],
    onSelect: editor => { editor.dispatchCommand(OPEN_LIVE_PHOTO_COMMAND, undefined); },
  }];
  static getType() { return 'live-photo'; }
  static clone(node: LivePhotoNode) { return new LivePhotoNode(node.__data, node.__key); }
  constructor(data: LivePhotoData = { assetId: '', fileName: '', width: 0, height: 0 }, key?: NodeKey) { super(key); this.__data = { ...data }; }
  createDOM() { const element = document.createElement('div'); element.dataset.livePhoto = ''; return element; }
  updateDOM() { return false; }
  isInline() { return false; }
  getData(): LivePhotoData { return { ...this.getLatest().__data }; }
  getTextContent() { return `[实况图：${this.getData().fileName}]`; }
  static importJSON(node: SerializedLivePhoto) {
    if (typeof node.assetId !== 'string' || typeof node.fileName !== 'string' ||
        !Number.isFinite(node.width) || node.width <= 0 || !Number.isFinite(node.height) || node.height <= 0) {
      throw new Error('实况图节点数据无效。');
    }
    return $createLivePhotoNode(node);
  }
  exportJSON(): SerializedLivePhoto { return { ...super.exportJSON(), ...this.getData(), type: 'live-photo', version: 1 }; }
  decorate() { return createElement(Suspense, { fallback: createElement('p', null, '正在载入实况图…') }, createElement(LivePhotoView, { data: this.getData(), nodeKey: this.getKey() })); }
}
export function $createLivePhotoNode(data: LivePhotoData): LivePhotoNode {
  return $applyNodeReplacement(new LivePhotoNode({ assetId: data.assetId, fileName: data.fileName, width: data.width, height: data.height }));
}
