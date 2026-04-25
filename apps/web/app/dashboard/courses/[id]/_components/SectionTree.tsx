'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { BronzeButton, Kicker, LedgerCard } from '@/components/scriptorium';

import { createSection, deleteSection, renameSection, reorderSections } from '../actions';
import { SECTION_TITLE_MAX } from '../validation';
import { LessonList, type LessonRow } from './LessonList';

export type SectionRow = {
  readonly id: string;
  readonly title: string;
  readonly sort_order: number;
  readonly lessons: readonly LessonRow[];
};

type Props = {
  readonly courseId: string;
  readonly initialSections: readonly SectionRow[];
  readonly selectedLessonId?: string | null;
};

export function SectionTree({
  courseId,
  initialSections,
  selectedLessonId = null,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [sections, setSections] = useState<readonly SectionRow[]>(initialSections);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sync local state when the server-rendered `initialSections` changes —
  // e.g. after a create / rename / delete mutation calls router.refresh().
  // Without this, `useState`'s one-time initialisation leaves the UI
  // stuck on the pre-mutation list.
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove([...sections], oldIndex, newIndex);
      setSections(next); // optimistic

      startTransition(async () => {
        const result = await reorderSections(
          courseId,
          next.map((s) => s.id),
        );
        if (!result.ok) {
          setError(result.error);
          setSections(initialSections); // revert
        } else {
          setError(null);
          router.refresh();
        }
      });
    },
    [courseId, sections, initialSections, router],
  );

  return (
    <LedgerCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Kicker>chapters</Kicker>
        <AddSectionButton courseId={courseId} onError={setError} />
      </div>

      {error && (
        <p
          style={{
            marginBottom: 12,
            padding: '8px 10px',
            background: 'rgba(143, 37, 48, 0.14)',
            border: '1px dashed var(--wax-deep)',
            borderRadius: 3,
            color: 'var(--oxblood)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
          }}
        >
          {error}
        </p>
      )}

      {sections.length === 0 ? (
        <p className="body-italic" style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          no chapters yet. click <span style={{ color: 'var(--ink)' }}>+ add</span> to start.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                opacity: pending ? 0.7 : 1,
              }}
            >
              {sections.map((s) => (
                <SortableSection
                  key={s.id}
                  section={s}
                  courseId={courseId}
                  onError={setError}
                  selectedLessonId={selectedLessonId}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </LedgerCard>
  );
}

function AddSectionButton({
  courseId,
  onError,
}: {
  readonly courseId: string;
  readonly onError: (message: string | null) => void;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <BronzeButton
        size="sm"
        onClick={() => {
          setOpen(true);
          onError(null);
        }}
      >
        + add
      </BronzeButton>
    );
  }

  const submit = (): void => {
    if (!title.trim()) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await createSection(courseId, title);
      if (!result.ok) onError(result.error);
      else {
        setTitle('');
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, SECTION_TITLE_MAX))}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="chapter name"
        disabled={pending}
        className="field"
        style={{ width: 160, fontSize: 14 }}
      />
      <BronzeButton type="submit" size="sm" disabled={pending || !title.trim()}>
        {pending ? '…' : 'ok'}
      </BronzeButton>
    </form>
  );
}

function SortableSection({
  section,
  courseId,
  onError,
  selectedLessonId,
}: {
  readonly section: SectionRow;
  readonly courseId: string;
  readonly onError: (message: string | null) => void;
  readonly selectedLessonId: string | null;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const merged: React.CSSProperties = {
    ...style,
    background: 'rgba(255, 244, 210, 0.55)',
    border: '1px solid rgba(138, 106, 58, 0.4)',
    borderRadius: 3,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={merged}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          style={{
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--bronze)',
            fontSize: 14,
            padding: '2px 4px',
          }}
        >
          ⋮⋮
        </button>
        <SectionTitleEditor section={section} courseId={courseId} onError={onError} />
      </div>

      <div
        style={{
          borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
          padding: '8px 12px 10px 24px',
        }}
      >
        <LessonList
          courseId={courseId}
          sectionId={section.id}
          lessons={section.lessons}
          onError={onError}
          selectedLessonId={selectedLessonId}
        />
      </div>
    </li>
  );
}

function SectionTitleEditor({
  section,
  courseId,
  onError,
}: {
  readonly section: SectionRow;
  readonly courseId: string;
  readonly onError: (message: string | null) => void;
}): React.JSX.Element {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [pending, startTransition] = useTransition();

  const commit = (): void => {
    if (title.trim() === section.title) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renameSection(courseId, section.id, title);
      if (!result.ok) {
        onError(result.error);
        setTitle(section.title);
      } else {
        onError(null);
        setEditing(false);
        router.refresh();
      }
    });
  };

  const remove = (): void => {
    if (!window.confirm(`Delete section "${section.title}" and all its lessons?`)) return;
    startTransition(async () => {
      const result = await deleteSection(courseId, section.id);
      if (!result.ok) onError(result.error);
      else {
        onError(null);
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, SECTION_TITLE_MAX))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              setTitle(section.title);
              setEditing(false);
            }
          }}
          disabled={pending}
          className="field"
          style={{ flex: 1, fontSize: 15 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{
            flex: 1,
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 17,
            color: 'var(--ink)',
            padding: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {section.title}
        </button>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        title="Delete section"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-soft)',
          padding: '3px 6px',
          fontSize: 13,
          cursor: 'pointer',
          borderRadius: 3,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-soft)')}
      >
        ✕
      </button>
    </div>
  );
}
