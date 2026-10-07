import type { ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { ArrowLeftRight, BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart, PanelTop, RotateCcw, Rows3, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { autofitTableColumns, resetTableColumnWidths } from "./blockOps";
import { TABLE_SPACINGS, type TableSpacing } from "./extensions";

const TableMenuItems = ({ editor }: { editor: Editor }) => {
  const spacing = (editor.getAttributes("table").spacing as TableSpacing | undefined) ?? "normal";
  const run = (command: () => unknown) => () => {
    command();
  };
  const chain = () => editor.chain().focus();

  return (
    <>
      <ContextMenuItem onSelect={run(() => chain().addRowBefore().run())}>
        <BetweenHorizontalStart className="mr-2 h-4 w-4" /> Insert row above
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => chain().addRowAfter().run())}>
        <BetweenHorizontalEnd className="mr-2 h-4 w-4" /> Insert row below
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => chain().deleteRow().run())}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete row
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={run(() => chain().addColumnBefore().run())}>
        <BetweenVerticalStart className="mr-2 h-4 w-4" /> Insert column left
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => chain().addColumnAfter().run())}>
        <BetweenVerticalEnd className="mr-2 h-4 w-4" /> Insert column right
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => chain().deleteColumn().run())}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete column
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={run(() => chain().toggleHeaderRow().run())}>
        <PanelTop className="mr-2 h-4 w-4" /> Header row
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => autofitTableColumns(editor))}>
        <ArrowLeftRight className="mr-2 h-4 w-4" /> Autofit columns to contents
      </ContextMenuItem>
      <ContextMenuItem onSelect={run(() => resetTableColumnWidths(editor))}>
        <RotateCcw className="mr-2 h-4 w-4" /> Reset column widths
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Rows3 className="mr-2 h-4 w-4" /> Cell spacing
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup value={spacing} onValueChange={(value) => chain().updateAttributes("table", { spacing: value }).run()}>
            {TABLE_SPACINGS.map(({ value, label }) => (
              <ContextMenuRadioItem key={value} value={value}>
                {label}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={run(() => chain().deleteTable().run())}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete table
      </ContextMenuItem>
    </>
  );
};

/**
 * Right-clicking a table cell opens the table menu: rows, columns, header, column widths, spacing, delete.
 * Anywhere else the browser's own menu is left alone.
 */
const TableContextMenu = ({ editor, children }: { editor: Editor; children: ReactNode }) => {
  const onContextMenuCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!editor.isEditable || !editor.view.dom.contains(target) || !target.closest("td, th")) {
      event.stopPropagation();
      return;
    }
    // A right-click puts the caret in the clicked cell, unless it lands inside cells the user already selected.
    const found = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
    const { selection } = editor.state;
    const insideSelection = found && selection instanceof CellSelection && selection.ranges.some((range) => found.pos >= range.$from.pos && found.pos <= range.$to.pos);
    if (found && !insideSelection) editor.commands.setTextSelection(found.pos);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenuCapture={onContextMenuCapture}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64" onCloseAutoFocus={(event) => event.preventDefault()}>
        <TableMenuItems editor={editor} />
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TableContextMenu;
