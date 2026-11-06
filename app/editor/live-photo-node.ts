import { $applyNodeReplacement, createCommand, type EditorConfig, type NodeKey } from 'lexical';
import { ImageNode, type ImageNodePayload, type SerializedImageNode } from '@haklex/rich-editor/nodes';
import type { CommandItemConfig } from '@haklex/rich-editor/commands';
import { createElement, lazy, Suspense } from 'react';
import { Radio } from 'lucide-react';

const LivePhotoView = lazy(() => import('./live-photo-view'));
export const OPEN_LIVE_PHOTO_COMMAND = createCommand<void>('OPEN_LIVE_PHOTO');
export type LivePhotoData = ImageNodePayload & { videoSrc: string; fileName: string };
type SerializedLivePhoto = SerializedImageNode & { videoSrc: string; fileName: string };

export class LivePhotoNode extends ImageNode {
  __videoSrc: string;
  __fileName: string;
  static commandItems: CommandItemConfig[] = [{
    title: '实况图', description: '用图片和视频插入 Live Photo', icon: createElement(Radio, { size: 16 }),
    keywords: ['live', 'photo', 'motion', '实况', '动态照片'], group: 'insert', section: '媒体',
    placement: ['slash', 'toolbar', 'blockHandle'],
    onSelect: editor => { editor.dispatchCommand(OPEN_LIVE_PHOTO_COMMAND, undefined); },
  }];
  static getType() { return 'live-photo'; }
  static clone(node: LivePhotoNode) {
    return new LivePhotoNode({ src: node.__src, altText: node.__altText, caption: node.__caption,
      width: node.__width, height: node.__height, thumbhash: node.__thumbhash, accent: node.__accent,
      videoSrc: node.__videoSrc, fileName: node.__fileName }, node.__key);
  }
  constructor(data: LivePhotoData = { src: '', altText: '', videoSrc: '', fileName: 'photo_MP.jpg' }, key?: NodeKey) {
    super(data, key);
    this.__videoSrc = data.videoSrc;
    this.__fileName = data.fileName;
  }
  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    element.dataset.livePhoto = '';
    return element;
  }
  getVideoSrc() { return this.getLatest().__videoSrc; }
  getFileName() { return this.getLatest().__fileName; }
  setVideoSrc(src: string) { this.getWritable().__videoSrc = validateVideoSrc(src); }
  static importJSON(node: SerializedLivePhoto) {
    if (typeof node.src !== 'string' || typeof node.altText !== 'string' || typeof node.fileName !== 'string') throw new Error('实况图数据无效。');
    return $createLivePhotoNode({ ...node, videoSrc: validateVideoSrc(node.videoSrc) });
  }
  exportJSON(): SerializedLivePhoto {
    return { ...super.exportJSON(), type: 'live-photo', version: 1, videoSrc: this.getVideoSrc(), fileName: this.getFileName() };
  }
  decorate() {
    const data: LivePhotoData = { src: this.getSrc(), altText: this.getAltText(), width: this.getWidth(),
      height: this.getHeight(), caption: this.getCaption(), thumbhash: this.getThumbhash(), accent: this.getAccent(),
      videoSrc: this.getVideoSrc(), fileName: this.getFileName() };
    return createElement(Suspense, { fallback: createElement('span', null, '正在载入图片…') }, createElement(LivePhotoView, { data, nodeKey: this.getKey() }));
  }
}
function validateVideoSrc(src: string) {
  if (typeof src !== 'string' || !/^(blob:|https?:\/\/|\/(?!\/))/.test(src)) throw new Error('视频资源地址无效。');
  return src;
}
export function $createLivePhotoNode(data: LivePhotoData): LivePhotoNode {
  return $applyNodeReplacement(new LivePhotoNode({ ...data, videoSrc: validateVideoSrc(data.videoSrc) }));
}
