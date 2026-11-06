import { DialogStackProvider } from '@haklex/rich-editor-ui';
import { ShiroEditor } from '@haklex/rich-kit-shiro';
import { ToolbarPlugin } from '@haklex/rich-plugin-toolbar';
import { NestedDocDialogEditorProvider, NestedDocPlugin, nestedDocEditNodes, type NestedDocDialogEditorProps } from '@haklex/rich-ext-nested-doc';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback } from 'react';
import { Radio } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { LivePhotoNode, OPEN_LIVE_PHOTO_COMMAND } from './live-photo-node';
import { LivePhotoPlugin } from './live-photo-plugin';
import { MediaSessionProvider, useMediaSession } from './media-session';
import { readImage } from '../lib/media';
import '@haklex/rich-kit-shiro/style.css';
import '@haklex/rich-plugin-toolbar/style.css';
import '@haklex/rich-ext-nested-doc/style.css';

const extraNodes = [...nestedDocEditNodes, LivePhotoNode];
function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  return <div {...stylex.props(s.toolbar)}><ToolbarPlugin maxVisibleInsertItems={5} insertItemOrder={['实况图', '图片', '视频']} /><button type="button" {...stylex.props(s.insert)} onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(OPEN_LIVE_PHOTO_COMMAND, undefined)}><Radio size={16} />插入实况图</button></div>;
}

// 使用博客相同的 ShiroEditor + ToolbarPlugin；去掉 Vue 桥接和博客上传 API。
function EditorContent({ initialValue, onEditorReady }: Partial<NestedDocDialogEditorProps>) {
  const session = useMediaSession();
  const imageUpload = useCallback(async (file: File) => {
    const image = await readImage(file);
    return { src: session.addImage(image.blob), width: image.width, height: image.height, altText: image.name };
  }, [session]);
  return <ShiroEditor initialValue={initialValue} onEditorReady={onEditorReady} variant="article" theme="light" imageUpload={imageUpload} extraNodes={extraNodes} header={<EditorToolbar />} placeholder="开始写作，输入 / 插入内容…" style={{ minHeight: 600 }}><LivePhotoPlugin /><NestedDocPlugin /></ShiroEditor>;
}
export default function BlogEditor() {
  return <MediaSessionProvider><DialogStackProvider><NestedDocDialogEditorProvider value={EditorContent}>
    <main {...stylex.props(s.page)}><div {...stylex.props(s.heading)}><h1 {...stylex.props(s.title)}>富文本编辑器</h1><span {...stylex.props(s.status)}>本地体验 · 刷新后清空</span></div><div {...stylex.props(s.paper)}><EditorContent /></div><p {...stylex.props(s.hint)}>支持正文混排、撤销与重做。点击「插入实况图」，或输入 / 搜索「实况图」。</p></main>
  </NestedDocDialogEditorProvider></DialogStackProvider></MediaSessionProvider>;
}
const s = stylex.create({
  page: { maxWidth: 1040, marginInline: 'auto', padding: { default: '40px 32px', '@media (max-width: 600px)': '24px 12px' } },
  heading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 600, color: '#27272a' },
  status: { fontSize: 12, color: '#71717a' },
  paper: { borderWidth: 1, borderStyle: 'solid', borderColor: '#e4e4e7', borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 4px 20px #00000003' },
  toolbar: { padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#ededf0' },
  insert: { alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'solid', borderColor: '#dedee5', backgroundColor: { default: '#fff', ':hover': '#f4f4f5' }, color: '#52525b', borderRadius: 6, padding: '7px 10px', fontSize: 12, margin: '4px 0', cursor: 'pointer' },
  hint: { textAlign: 'center', fontSize: 12, lineHeight: 1.8, color: '#71717a', marginTop: 16 },
});
