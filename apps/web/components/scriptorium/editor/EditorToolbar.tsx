// Toolbar for the scriptorium editor. One row of bronze-rimmed
// buttons above the content surface. Each button toggles a TipTap
// mark or node; active state shown by a verdigris underline.

'use client';

import type { Editor } from '@tiptap/react';

type Props = {
  readonly editor: Editor | null;
  readonly disabled?: boolean;
};

export function EditorToolbar({ editor, disabled }: Props): React.JSX.Element {
  if (!editor) return <div className="scriptorium-editor-toolbar is-empty" />;

  const isActive = (name: string, attrs?: Record<string, unknown>): boolean => {
    return editor.isActive(name, attrs);
  };

  const promptForLink = (): void => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="scriptorium-editor-toolbar" role="toolbar" aria-label="formatting">
      <Group>
        <Button
          label="heading 2"
          symbol="H₂"
          active={isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
        />
        <Button
          label="heading 3"
          symbol="H₃"
          active={isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
        />
        <Button
          label="paragraph"
          symbol="¶"
          active={isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={disabled}
        />
      </Group>

      <Group>
        <Button
          label="bold"
          symbol="B"
          symbolBold
          active={isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
        />
        <Button
          label="italic"
          symbol="I"
          symbolItalic
          active={isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
        />
        <Button
          label="strike"
          symbol="S"
          symbolStrike
          active={isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
        />
      </Group>

      <Group>
        <Button
          label="bullet list"
          symbol="•"
          active={isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
        />
        <Button
          label="numbered list"
          symbol="1."
          active={isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
        />
        <Button
          label="quote"
          symbol="❝"
          active={isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
        />
      </Group>

      <Group>
        <Button
          label="inline code"
          symbol="‹›"
          active={isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled}
        />
        <Button
          label="code block"
          symbol="{ }"
          active={isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={disabled}
        />
        <Button
          label="link"
          symbol="⤴"
          active={isActive('link')}
          onClick={promptForLink}
          disabled={disabled}
        />
      </Group>

      <Group>
        <Button
          label="undo"
          symbol="↶"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
        />
        <Button
          label="redo"
          symbol="↷"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
        />
      </Group>
    </div>
  );
}

function Group({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <div className="scriptorium-editor-toolbar-group">{children}</div>;
}

function Button({
  label,
  symbol,
  active,
  symbolBold,
  symbolItalic,
  symbolStrike,
  onClick,
  disabled,
}: {
  readonly label: string;
  readonly symbol: string;
  readonly active?: boolean;
  readonly symbolBold?: boolean;
  readonly symbolItalic?: boolean;
  readonly symbolStrike?: boolean;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`scriptorium-editor-btn ${active ? 'is-active' : ''}`}
    >
      <span
        style={{
          fontWeight: symbolBold ? 700 : undefined,
          fontStyle: symbolItalic ? 'italic' : undefined,
          textDecoration: symbolStrike ? 'line-through' : undefined,
        }}
      >
        {symbol}
      </span>
    </button>
  );
}
