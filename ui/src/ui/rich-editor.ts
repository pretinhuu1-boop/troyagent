/**
 * rich-editor.ts — Tiptap WYSIWYG wrapper for Lit functional views
 *
 * Usage:
 *   mountRichEditor(containerId, initialHtml, onChange)
 *   destroyRichEditor()
 *   getRichEditorHTML() → string
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

let editor: Editor | null = null;
let mountedContainerId: string | null = null;

/** Mount Tiptap editor into a container element */
export function mountRichEditor(
  containerId: string,
  content: string,
  onChange: (html: string) => void,
): void {
  // Already mounted on this container
  if (editor && mountedContainerId === containerId) return;

  // Destroy any previous instance
  destroyRichEditor();

  // Wait for DOM element to exist
  requestAnimationFrame(() => {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn("[rich-editor] Container not found:", containerId);
      return;
    }

    editor = new Editor({
      element: el,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        }),
        Image.configure({
          inline: true,
        }),
        Placeholder.configure({
          placeholder: "Comece a escrever o conteudo do artigo...",
        }),
      ],
      content: content || "",
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
      editorProps: {
        attributes: {
          class: "tv-rich-editor-content",
        },
      },
    });

    mountedContainerId = containerId;
  });
}

/** Destroy the current editor instance */
export function destroyRichEditor(): void {
  if (editor) {
    editor.destroy();
    editor = null;
    mountedContainerId = null;
  }
}

/** Get current HTML content */
export function getRichEditorHTML(): string {
  return editor?.getHTML() ?? "";
}

/** Check if editor is mounted */
export function isRichEditorMounted(): boolean {
  return editor !== null;
}

/** Toggle bold */
export function toggleBold(): void {
  editor?.chain().focus().toggleBold().run();
}

/** Toggle italic */
export function toggleItalic(): void {
  editor?.chain().focus().toggleItalic().run();
}

/** Toggle strike */
export function toggleStrike(): void {
  editor?.chain().focus().toggleStrike().run();
}

/** Toggle heading */
export function toggleHeading(level: 2 | 3 | 4): void {
  editor?.chain().focus().toggleHeading({ level }).run();
}

/** Toggle bullet list */
export function toggleBulletList(): void {
  editor?.chain().focus().toggleBulletList().run();
}

/** Toggle ordered list */
export function toggleOrderedList(): void {
  editor?.chain().focus().toggleOrderedList().run();
}

/** Toggle blockquote */
export function toggleBlockquote(): void {
  editor?.chain().focus().toggleBlockquote().run();
}

/** Toggle code block */
export function toggleCodeBlock(): void {
  editor?.chain().focus().toggleCodeBlock().run();
}

/** Insert horizontal rule */
export function insertHR(): void {
  editor?.chain().focus().setHorizontalRule().run();
}

/** Set link */
export function setLink(): void {
  if (!editor) return;
  const url = prompt("URL do link:");
  if (url) {
    editor.chain().focus().setLink({ href: url }).run();
  } else {
    editor.chain().focus().unsetLink().run();
  }
}

/** Insert image */
export function insertImage(): void {
  if (!editor) return;
  const url = prompt("URL da imagem:");
  if (url) {
    editor.chain().focus().setImage({ src: url }).run();
  }
}

/** Undo */
export function undo(): void {
  editor?.chain().focus().undo().run();
}

/** Redo */
export function redo(): void {
  editor?.chain().focus().redo().run();
}

/** Check if a mark/node is active */
export function isActive(name: string, attrs?: Record<string, unknown>): boolean {
  return editor?.isActive(name, attrs) ?? false;
}
