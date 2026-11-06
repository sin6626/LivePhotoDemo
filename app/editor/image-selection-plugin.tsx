import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isImageNode } from '@haklex/rich-editor/nodes';
import { $createNodeSelection, $getNearestNodeFromDOMNode, $getSelection, $isNodeSelection, $isRangeSelection, $setSelection, CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import * as stylex from '@stylexjs/stylex';

// 普通图片和实况图共用一套选区；键盘、剪贴板、删除和历史均由编辑器处理。
export function ImageSelectionPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const classes = (stylex.props(styles.selected).className ?? '').split(' ').filter(Boolean);
    let frame = 0;
    function paint() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => editor.read(() => {
        for (const element of editor.getRootElement()?.querySelectorAll<HTMLElement>('.rich-image-wrapper') ?? []) {
          const node = $getNearestNodeFromDOMNode(element);
          const selected = $isImageNode(node) && node.isSelected();
          element.dataset.imageSelected = String(selected);
          const imageFrame = element.querySelector('.rr-image-frame');
          if (selected) imageFrame?.classList.add(...classes);
          else imageFrame?.classList.remove(...classes);
        }
      }));
    }
    const update = editor.registerUpdateListener(paint);
    const rootListener = editor.registerRootListener((root, previous) => {
      for (const event of ['load', 'error']) {
        previous?.removeEventListener(event, paint, true);
        root?.addEventListener(event, paint, true);
      }
    });
    const click = editor.registerCommand(CLICK_COMMAND, event => {
      const target = event.target;
      if (!(target instanceof Element)) return false;
      const node = $getNearestNodeFromDOMNode(target);
      if (!$isImageNode(node)) return false;
      if (target.closest('.rr-image-edit-toolbar, [data-image-action]')) return true;
      event.preventDefault();
      editor.getRootElement()?.focus({ preventScroll: true });
      let selection = $getSelection();
      if (event.shiftKey && $isRangeSelection(selection)) {
        const parent = node.getParent();
        if (parent) selection.focus.set(parent.getKey(), node.getIndexWithinParent() + (node.isBefore(selection.anchor.getNode()) ? 0 : 1), 'element');
      } else {
        if (!event.shiftKey || !$isNodeSelection(selection)) {
          selection = $createNodeSelection();
          $setSelection(selection);
        }
        if ($isNodeSelection(selection)) {
          if (event.shiftKey && selection.has(node.getKey())) selection.delete(node.getKey());
          else selection.add(node.getKey());
        }
      }
      return true;
    }, COMMAND_PRIORITY_LOW);
    return () => { update(); click(); rootListener(); cancelAnimationFrame(frame); };
  }, [editor]);
  return null;
}
const styles = stylex.create({
  selected: {
    outlineWidth: 2, outlineStyle: 'solid', outlineColor: '#748bdb', outlineOffset: 2,
    '::after': { content: '""', position: 'absolute', inset: 0, backgroundColor: '#b6cbe644', pointerEvents: 'none', zIndex: 2 },
  },
});
