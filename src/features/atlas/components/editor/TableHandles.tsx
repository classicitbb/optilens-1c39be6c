import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { ResolvedPos } from "@tiptap/pm/model";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Combine,
  GripHorizontal,
  GripVertical,
  PanelTop,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableHandlesProps {
  editor: Editor;
  wrapperRef: RefObject<HTMLDivElement | null>;
}

type Axis = "row" | "column";

interface Hover {
  /** Document position just before the hovered cell. */
  cellPos: number;
  /** Row grip: left edge of the table, middle of the row (relative to the wrapper). */
  row: { left: number; top: number };
  /** Column grip: top edge of the table, middle of the column. */
  column: { left: number; top: number };
}

/** The position just before the table cell holding `pos`, or null outside a table. */
const cellBefore = (editor: Editor, pos: number): ResolvedPos | null => {
  const $pos = editor.state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const role = $pos.node(depth).type.spec.tableRole;
    if (role === "cell" || role === "header_cell") return editor.state.doc.resolve($pos.before(depth));
  }
  return null;
};

/**
 * Hover handles for tables: a grip on the left of the row and on top of the column under the pointer.
 * Clicking one selects the whole row or column and opens its menu (insert, delete, merge, split, header).
 * While several cells are selected a small bar above them offers Merge cells / Unmerge cells.
 */
const TableHandles = ({ editor, wrapperRef }: TableHandlesProps) => {
  const [hover, setHover] = useState<Hover | null>(null);
  const [menu, setMenu] = useState<Axis | null>(null);
  const [selectionBar, setSelectionBar] = useState<{ left: number; top: number; merged: boolean } | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onMove = (event: MouseEvent) => {
      if (menuRef.current || !editor.isEditable) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-table-handle]")) return;
      const cell = target.closest("td, th");
      const table = cell?.closest("table");
      if (!cell || !table || !editor.view.dom.contains(cell)) {
        setHover(null);
        return;
      }
      const row = cell.parentElement as HTMLElement;
      const wrap = wrapper.getBoundingClientRect();
      const tableBox = table.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      const inside = editor.view.posAtDOM(cell, 0);
      const $cell = cellBefore(editor, inside);
      if (!$cell) return;
      setHover({
        cellPos: $cell.pos,
        row: { left: tableBox.left - wrap.left - 8, top: rowBox.top - wrap.top + rowBox.height / 2 },
        column: { left: cellBox.left - wrap.left + cellBox.width / 2, top: tableBox.top - wrap.top - 7 },
      });
    };
    const onLeave = () => {
      if (!menuRef.current) setHover(null);
    };

    const onSelection = () => {
      const { selection } = editor.state;
      if (!(selection instanceof CellSelection) || !editor.isEditable) {
        setSelectionBar(null);
        return;
      }
      let count = 0;
      let merged = false;
      selection.forEachCell((node) => {
        count += 1;
        if ((node.attrs.colspan ?? 1) > 1 || (node.attrs.rowspan ?? 1) > 1) merged = true;
      });
      const anchor = editor.view.nodeDOM(selection.$anchorCell.pos);
      if ((count < 2 && !merged) || !(anchor instanceof HTMLElement)) {
        setSelectionBar(null);
        return;
      }
      const head = editor.view.nodeDOM(selection.$headCell.pos);
      const wrap = wrapper.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      const b = head instanceof HTMLElement ? head.getBoundingClientRect() : a;
      setSelectionBar({ left: Math.min(a.left, b.left) - wrap.left, top: Math.min(a.top, b.top) - wrap.top - 40, merged });
    };

    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseleave", onLeave);
    editor.on("selectionUpdate", onSelection);
    editor.on("update", onSelection);
    return () => {
      wrapper.removeEventListener("mousemove", onMove);
      wrapper.removeEventListener("mouseleave", onLeave);
      editor.off("selectionUpdate", onSelection);
      editor.off("update", onSelection);
    };
  }, [editor, wrapperRef]);

  /** Select the whole row or column of the hovered cell, so the menu's commands act on all of it. */
  const selectAxis = (axis: Axis) => {
    if (!hover) return false;
    const $cell = editor.state.doc.resolve(hover.cellPos);
    try {
      const selection = axis === "row" ? CellSelection.rowSelection($cell) : CellSelection.colSelection($cell);
      editor.view.dispatch(editor.state.tr.setSelection(selection));
      editor.view.focus();
      return true;
    } catch {
      return false;
    }
  };

  const chain = () => editor.chain().focus();
  const can = editor.can();

  const grip = (axis: Axis) => {
    if (!hover) return null;
    const place = axis === "row" ? hover.row : hover.column;
    const Icon = axis === "row" ? GripVertical : GripHorizontal;
    return (
      <DropdownMenu
        open={menu === axis}
        onOpenChange={(open) => {
          if (open && !selectAxis(axis)) return;
          setMenu(open ? axis : null);
          if (!open) setHover(null);
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-table-handle
            aria-label={axis === "row" ? "Row options" : "Column options"}
            title={axis === "row" ? "Row options" : "Column options"}
            style={{ left: place.left, top: place.top }}
            className={
              axis === "row"
                ? "absolute z-20 flex h-6 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[4px] border border-ws-line bg-ws-paper text-ws-ink-2 shadow-sm hover:bg-ws-accent hover:text-white data-[state=open]:bg-ws-accent data-[state=open]:text-white"
                : "absolute z-20 flex h-4 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[4px] border border-ws-line bg-ws-paper text-ws-ink-2 shadow-sm hover:bg-ws-accent hover:text-white data-[state=open]:bg-ws-accent data-[state=open]:text-white"
            }
          >
            <Icon className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side={axis === "row" ? "left" : "bottom"} className="w-56" onCloseAutoFocus={(event) => event.preventDefault()}>
          {axis === "row" ? (
            <>
              <DropdownMenuItem onSelect={() => chain().addRowBefore().run()}>
                <BetweenHorizontalStart className="mr-2 h-4 w-4" /> Insert row above
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => chain().addRowAfter().run()}>
                <BetweenHorizontalEnd className="mr-2 h-4 w-4" /> Insert row below
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => chain().toggleHeaderRow().run()}>
                <PanelTop className="mr-2 h-4 w-4" /> Header row
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => chain().addColumnBefore().run()}>
                <BetweenVerticalStart className="mr-2 h-4 w-4" /> Insert column left
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => chain().addColumnAfter().run()}>
                <BetweenVerticalEnd className="mr-2 h-4 w-4" /> Insert column right
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => chain().toggleHeaderColumn().run()}>
                <PanelTop className="mr-2 h-4 w-4 -rotate-90" /> Header column
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!can.mergeCells()} onSelect={() => chain().mergeCells().run()}>
            <Combine className="mr-2 h-4 w-4" /> Merge cells
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!can.splitCell()} onSelect={() => chain().splitCell().run()}>
            <SplitSquareHorizontal className="mr-2 h-4 w-4" /> Unmerge cells
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => (axis === "row" ? chain().deleteRow().run() : chain().deleteColumn().run())}
          >
            <Trash2 className="mr-2 h-4 w-4" /> {axis === "row" ? "Delete row" : "Delete column"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      {grip("row")}
      {grip("column")}
      {selectionBar ? (
        <div
          data-table-handle
          role="toolbar"
          aria-label="Selected cells"
          style={{ left: selectionBar.left, top: Math.max(selectionBar.top, 0) }}
          className="absolute z-30 flex items-center gap-0.5 rounded-[8px] border border-ws-line bg-ws-paper p-1 shadow-[var(--ws-float-shadow,0_4px_12px_rgba(0,0,0,0.2))]"
        >
          <button
            type="button"
            disabled={!can.mergeCells()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chain().mergeCells().run()}
            className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-ws-ink hover:bg-[var(--ws-hover)] disabled:opacity-40"
          >
            <Combine className="h-4 w-4" /> Merge cells
          </button>
          <button
            type="button"
            disabled={!can.splitCell()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chain().splitCell().run()}
            className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-ws-ink hover:bg-[var(--ws-hover)] disabled:opacity-40"
          >
            <SplitSquareHorizontal className="h-4 w-4" /> Unmerge cells
          </button>
        </div>
      ) : null}
    </>
  );
};

export default TableHandles;
