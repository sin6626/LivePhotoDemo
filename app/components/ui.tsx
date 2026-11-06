// shadcn/ui Button 的 Radix Slot 组合方式，样式适配为 StyleX。
import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import * as stylex from '@stylexjs/stylex';

export function Button({ asChild = false, secondary = false, ...props }: ComponentProps<'button'> & { asChild?: boolean; secondary?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp {...stylex.props(s.button, secondary && s.secondary)} {...props} />;
}
const s = stylex.create({
  button: { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8, minHeight: 40, paddingInline: 16, backgroundColor: { default: '#27272a', ':hover': '#3f3f46', ':disabled': '#e4e4e7' }, color: { default: 'white', ':disabled': '#71717a' }, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'background-color 160ms' },
  secondary: { backgroundColor: { default: '#fff', ':hover': '#f4f4f5' }, borderColor: '#e4e4e7', color: '#52525b' },
});
