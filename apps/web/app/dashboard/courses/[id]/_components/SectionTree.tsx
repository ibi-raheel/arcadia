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
};

export function SectionTree({ courseId, initialSections }: Props): React.JSX.Element {
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
    <aside className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sections</h2>
        <AddSectionButton courseId={courseId} onError={setError} />
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      {sections.length === 0 ? (
        <p className="text-sm text-slate-500">
          No sections yet. Click <span className="font-medium text-slate-300">+ Add</span> to start.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className={`space-y-2 ${pending ? 'opacity-70' : ''}`}>
              {sections.map((s) => (
                <SortableSection key={s.id} section={s} courseId={courseId} onError={setError} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </aside>
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
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onError(null);
        }}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
      >
        + Add
      </button>
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
      className="flex items-center gap-1"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, SECTION_TITLE_MAX))}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Section title"
        disabled={pending}
        className="w-40 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
      >
        {pending ? '…' : 'OK'}
      </button>
    </form>
  );
}

function SortableSection({
  section,
  courseId,
  onError,
}: {
  readonly section: SectionRow;
  readonly courseId: string;
  readonly onError: (message: string | null) => void;
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-800 bg-slate-900/60 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="cursor-grab touch-none select-none text-slate-500 hover:text-slate-300 active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        <SectionTitleEditor section={section} courseId={courseId} onError={onError} />
      </div>

      <div className="border-t border-slate-800 px-3 py-2 pl-6">
        <LessonList
          courseId={courseId}
          sectionId={section.id}
          lessons={section.lessons}
          onError={onError}
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
    <div className="flex flex-1 items-center gap-2">
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
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 truncate text-left text-sm font-medium text-slate-200 hover:text-white"
        >
          {section.title}
        </button>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        title="Delete section"
        className="rounded-md px-1.5 py-1 text-xs text-slate-500 transition hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30"
      >
        ✕
      </button>
    </div>
  );
}
