// The scriptorium editor — a WYSIWYG surface for writing lessons.
// Built on TipTap (ProseMirror under the hood). Content goes in and
// out as markdown via the `tiptap-markdown` extension, so the
// database column stays markdown and the academy viewer keeps
// rendering the same content it always did — only the authoring
// surface is upgraded.
//
// Styling matches the published lesson look as closely as a rich-
// text editor can: same display font for headings, same body
// serif, same hand font on italic emphasis. Edit IS the preview.

'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { Markdown } from 'tiptap-markdown';

import { EditorToolbar } from './EditorToolbar';

import './editor.css';

type Props = {
  readonly value: string;
  readonly onChange: (markdown: string) => void;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly disabled?: boolean;
};

/** Render-to-markdown hook that serialises the current editor state.
 *  Separated so the caller can stay synchronous in onChange. */
function editorMarkdown(editor: Editor): string {
  // tiptap-markdown adds editor.storage.markdown.getMarkdown()
  const storage = editor.storage as unknown as {
    markdown?: { getMarkdown?: () => string };
  };
  return storage.markdown?.getMarkdown?.() ?? editor.getText();
}

export function ScriptoriumEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
}: Props): React.JSX.Element {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: { HTMLAttributes: { class: 'scriptorium-code-block' } },
        blockquote: { HTMLAttributes: { class: 'scriptorium-blockquote' } },
        // We use the Link extension below; strip the starter-kit one.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: 'scriptorium-link', rel: 'noreferrer' },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'scriptorium-img' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'begin writing — the scribe listens…',
      }),
      Markdown.configure({
        transformPastedText: true,
        transformCopiedText: true,
        breaks: false,
        linkify: true,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: updatedEditor }) => {
      onChangeRef.current(editorMarkdown(updatedEditor));
    },
    // Avoid "Tiptap Editor is not mounted" SSR hydration mismatch.
    immediatelyRender: false,
  });

  // Only re-seed the editor content when the caller swaps the value
  // identity (e.g. lesson-switch). Otherwise we'd clobber keystrokes
  // on every parent re-render.
  const lastSetValue = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === lastSetValue.current) return;
    lastSetValue.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const currentLength = editor ? editor.getText().length : value.length;
  const overCap = maxLength ? currentLength > maxLength : false;

  return (
    <div className={`scriptorium-editor ${overCap ? 'is-over-cap' : ''}`}>
      <EditorToolbar editor={editor} disabled={disabled} />
      <div className="scriptorium-editor-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
