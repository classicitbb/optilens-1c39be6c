import { createElement, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LensPicker } from './LensPicker';

let root: Root | null = null;
export function unmountLensPicker() { root?.unmount(); root = null; }
export function mountLensPicker(container: HTMLElement, props: ComponentProps<typeof LensPicker>) {
  unmountLensPicker();
  root = createRoot(container);
  root.render(createElement(LensPicker, props));
}
