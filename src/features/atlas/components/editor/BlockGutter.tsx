import { useCallback, useEffect, useState, type DragEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { DOMSerializer } from "@tiptap/pm/model";
import { Copy, GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BLOG_COLOR_NAMES } from "@/components/blog/BlogPostRenderer";
import { cn } from "@/lib/utils";
import { TURN_INTO, addBlockBelow, blockTextRange, blockText, colorBlock, deleteBlock, duplicateBlock, setCalloutIcon, topLevelBlockAt, turnInto } from "./blockOps";
import type { AskIrisRequest } from "./extensions";

const ICONS = ["💡", "⚠️", "✅", "❗", "📌", "🛠️", "📦", "❓"];

interface BlockGutterProps {
  editor: Editor;
  wrapperRef: RefObject<HTMLDivElement | null>;
  onAskIris: (request: AskIrisRequest) => void;
}

/**
 * Hover gutter for the top-level block under the pointer: "+" adds a block below
 * and opens "/"; the grip drags to reorder and, on click, opens the block menu.
 */
const BlockGutter = ({ editor, wrapperRef, onAskIris }: BlockGutterProps) => {
  const [hover, setHover] = useState<{ top: number; pos: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onMove = (event: MouseEvent) => {
      if (menuOpen || !editor.isEditable) return;
      const { view } = editor;
      const content = view.dom.getBoundingClientRect();
      const left = Math.min(Math.max(event.clientX, content.left + 8), content.right - 8);
      const found = view.posAtCoords({ left, top: event.clientY });
      if (!found) return;
      const block = topLevelBlockAt(editor, found.inside >= 0 ? found.inside : found.pos);
      const dom = block ? view.nodeDOM(block.pos) : null;
      if (!block || !(dom instanceof HTMLElement)) return;
      const box = dom.getBoundingClientRect();
      const wrap = wrapper.getBoundingClientRect();
      setHover((current) => {
        const top = box.top - wrap.top;
        return current && current.pos === block.pos && current.top === top ? current : { top, pos: block.pos };
      });
    };
    const onLeave = () => {
      if (!menuOpen) setHover(null);
    };
    const onUpdate = () => {
      if (!menuOpen) setHover(null);
    };

    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseleave", onLeave);
    editor.on("update", onUpdate);
    return () => {
      wrapper.removeEventListener("mousemove", onMove);
      wrapper.removeEventListener("mouseleave", onLeave);
      editor.off("update", onUpdate);
    };
  }, [editor, menuOpen, wrapperRef]);

  const currentBlock = useCallback(() => {
    if (!hover) return null;
    const node = editor.state.doc.nodeAt(hover.pos);
    return node ? { pos: hover.pos, node } : null;
  }, [editor, hover]);

  const onDragStart = (event: DragEvent<HTMLButtonElement>) => {
    const block = currentBlock();
    if (!block) return;
    const { view } = editor;
    const selection = NodeSelection.create(view.state.doc, block.pos);
    view.dispatch(view.state.tr.setSelection(selection));
    const slice = selection.content();
    const holder = document.createElement("div");
    holder.appendChild(DOMSerializer.fromSchema(view.state.schema).serializeFragment(slice.content));
    event.dataTransfer.clearData();
    event.dataTransfer.setData("text/html", holder.innerHTML);
    event.dataTransfer.setData("text/plain", slice.content.textBetween(0, slice.content.size, "\n\n"));
    event.dataTransfer.effectAllowed = "copyMove";
    const nodeDom = view.nodeDOM(block.pos);
    if (nodeDom instanceof HTMLElement) event.dataTransfer.setDragImage(nodeDom, 0, 0);
    view.dragging = { slice, move: true };
  };

  const onDragEnd = () => {
    editor.view.dragging = null;
  };

  const block = currentBlock();
  if (!hover || !block) return null;

  const textual = !block.node.isAtom && block.node.type.name !== "table";
  const isCallout = block.node.type.name === "callout";

  const act = (fn: () => void) => () => {
    fn();
    setMenuOpen(false);
  };

  return (
    <div className="ws-gutter absolute z-10 flex items-center gap-0.5" style={{ top: hover.top }} contentEditable={false}>
      <button
        type="button"
        aria-label="Add a block below"
        title="Add a block below"
        onClick={() => addBlockBelow(editor, block)}
        className="flex h-6 w-6 items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-hover)]"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            draggable
            aria-label="Drag to move, click for block menu"
            title="Drag to move · click for menu"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded-[4px] text-ws-ink-3 hover:bg-[var(--ws-hover)] active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" className="max-h-[70vh] w-60 overflow-y-auto p-1" onOpenAutoFocus={(event) => event.preventDefault()}>
          <MenuButton onClick={act(() => onAskIris({ selection: blockText(block) }))}>
            <Sparkles className="h-3.5 w-3.5 text-ws-accent" /> Ask Iris
          </MenuButton>

          {textual ? (
            <>
              <p className="ws-label px-2 pb-1 pt-2 text-[10px] text-ws-ink-3">Turn into</p>
              <div className="grid grid-cols-2 gap-0.5">
                {TURN_INTO.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={kind === "secret" && !(block.node.isTextblock && block.node.type.name !== "codeBlock")}
                    onClick={act(() => {
                      editor.chain().focus().setTextSelection(blockTextRange(editor, block)).run();
                      turnInto(editor, kind);
                    })}
                    className="rounded-[4px] px-2 py-1 text-left text-[13px] hover:bg-[var(--ws-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="ws-label px-2 pb-1 pt-2 text-[10px] text-ws-ink-3">Colour</p>
              <div className="flex flex-wrap gap-1 px-1 pb-1">
                <Swatch label="Default colour" onClick={act(() => colorBlock(editor, block, { color: null, background: null }))}>
                  ∅
                </Swatch>
                {BLOG_COLOR_NAMES.map((name) => (
                  <Swatch key={name} label={`${name} text`} className={`ws-color-${name}`} onClick={act(() => colorBlock(editor, block, { color: name, background: isCallout ? name : undefined }))}>
                    A
                  </Swatch>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 px-1 pb-1">
                {BLOG_COLOR_NAMES.map((name) => (
                  <Swatch key={name} label={`${name} background`} className={`ws-bg-${name}`} onClick={act(() => colorBlock(editor, block, { background: name }))}>
                    A
                  </Swatch>
                ))}
              </div>
            </>
          ) : null}

          {isCallout ? (
            <>
              <p className="ws-label px-2 pb-1 pt-2 text-[10px] text-ws-ink-3">Callout icon</p>
              <div className="flex flex-wrap gap-1 px-1 pb-1">
                {ICONS.map((icon) => (
                  <Swatch key={icon} label={`Icon ${icon}`} onClick={act(() => setCalloutIcon(editor, block, icon))}>
                    {icon}
                  </Swatch>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-1 border-t border-ws-line pt-1">
            <MenuButton onClick={act(() => duplicateBlock(editor, block))}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </MenuButton>
            <MenuButton onClick={act(() => deleteBlock(editor, block))}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </MenuButton>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const MenuButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[14px] hover:bg-[var(--ws-hover)]">
    {children}
  </button>
);

const Swatch = ({ label, className, onClick, children }: { label: string; className?: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={cn("flex h-6 w-6 items-center justify-center rounded-[4px] border border-ws-line text-[12px] font-semibold hover:opacity-80", className)}
  >
    {children}
  </button>
);

export default BlockGutter;
