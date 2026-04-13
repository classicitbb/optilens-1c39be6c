import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon, Type, Plus, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  height?: string;
}

const RichTextEditor = ({
  content,
  onChange,
  placeholder = "Write a description...",
  className,
  minHeight = "200px",
  height,
}: RichTextEditorProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const suppressUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      if (!suppressUpdate.current) {
        onChange(ed.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none overflow-y-auto text-foreground",
          "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2",
          "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5",
          "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1",
          "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2",
          "[&_li]:text-sm [&_li]:mb-0.5",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none",
        ),
        style: `min-height: ${minHeight};${height ? `height: ${height}; max-height: ${height};` : ""} padding: 12px; box-sizing: border-box;`,
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      suppressUpdate.current = true;
      editor.commands.setContent(content || "");
      suppressUpdate.current = false;
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) return null;

  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : "Aa";

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        {/* Heading dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 font-medium">
              <Type className="h-3.5 w-3.5" />
              {currentHeading}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[120px]">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={cn("text-xs", !editor.isActive("heading") && "bg-muted")}
            >
              Normal text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={cn("text-xs font-bold", editor.isActive("heading", { level: 1 }) && "bg-muted")}
            >
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={cn("text-xs font-semibold", editor.isActive("heading", { level: 2 }) && "bg-muted")}
            >
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={cn("text-xs", editor.isActive("heading", { level: 3 }) && "bg-muted")}
            >
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Bold */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", editor.isActive("bold") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>

        {/* Italic */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", editor.isActive("italic") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Bullet list */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", editor.isActive("bulletList") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>

        {/* Ordered list */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", editor.isActive("orderedList") && "bg-muted")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Link */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", editor.isActive("link") && "bg-muted")}
              title="Link"
              onClick={() => {
                const existing = editor.getAttributes("link").href;
                setLinkUrl(existing || "");
              }}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="flex gap-1.5">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && setLink()}
              />
              <Button size="sm" className="h-7 text-xs" onClick={setLink}>
                Set
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick insert menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Quick insert">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              Horizontal Rule
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              Block Quote
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              Code Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
