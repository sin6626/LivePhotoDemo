import { DialogStackProvider } from '@haklex/rich-editor-ui';
import { ShiroEditor } from '@haklex/rich-kit-shiro';
import { ToolbarPlugin } from '@haklex/rich-plugin-toolbar';
import { NestedDocDialogEditorProvider, NestedDocPlugin, nestedDocEditNodes, type NestedDocDialogEditorProps } from '@haklex/rich-ext-nested-doc';
import { useCallback } from 'react';
import * as stylex from '@stylexjs/stylex';
import { LivePhotoNode } from './live-photo-node';
import { ImageSelectionPlugin } from './image-selection-plugin';
import { LivePhotoPlugin } from './live-photo-plugin';
import { MediaSessionProvider, useMediaSession } from './media-session';
import { readEditorImage } from '../lib/media';
import '@haklex/rich-kit-shiro/style.css';
import '@haklex/rich-plugin-toolbar/style.css';
import '@haklex/rich-ext-nested-doc/style.css';
import './image-layout.css';

const extraNodes = [...nestedDocEditNodes, LivePhotoNode];
function EditorToolbar() {
  return <ToolbarPlugin maxVisibleInsertItems={5} insertItemOrder={['Image', 'Live photo', 'Video']} />;
}

// 使用博客相同的 ShiroEditor + ToolbarPlugin；去掉 Vue 桥接和博客上传 API。
function EditorContent({ initialValue, onEditorReady }: Partial<NestedDocDialogEditorProps>) {
  const session = useMediaSession();
  const imageUpload = useCallback(async (file: File) => {
    const image = await readEditorImage(file);
    return { src: session.addFile(image.blob), width: image.width, height: image.height, altText: image.name, metadataFile: image.blob };
  }, [session]);
  return <ShiroEditor initialValue={initialValue} onEditorReady={onEditorReady} variant="article" theme="light" imageUpload={imageUpload} extraNodes={extraNodes} header={<EditorToolbar />} placeholder="Start writing, or type / to insert…" style={{ minHeight: 600 }}><ImageSelectionPlugin /><LivePhotoPlugin /><NestedDocPlugin /></ShiroEditor>;
}
export default function BlogEditor() {
  return <MediaSessionProvider><DialogStackProvider><NestedDocDialogEditorProvider value={EditorContent}>
    <main {...stylex.props(s.page)}><div {...stylex.props(s.heading)}><h1 {...stylex.props(s.title)}>Rich text editor</h1><span {...stylex.props(s.status)}>Local demo · Cleared on reload</span></div><div {...stylex.props(s.paper)}><EditorContent /></div><p {...stylex.props(s.hint)}>Insert images and live photos from the toolbar or / menu. Click to select. Press and hold to play.</p></main>
  </NestedDocDialogEditorProvider></DialogStackProvider></MediaSessionProvider>;
}
const s = stylex.create({
  page: { maxWidth: 1040, marginInline: 'auto', padding: { default: '40px 32px', '@media (max-width: 600px)': '24px 12px' } },
  heading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 600, color: '#27272a' },
  status: { fontSize: 12, color: '#71717a' },
  paper: { borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 4px 20px #00000003' },
  hint: { textAlign: 'center', fontSize: 12, lineHeight: 1.8, color: '#71717a', marginTop: 16 },
});
