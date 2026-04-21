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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { createLesson, deleteLesson, reorderLessons } from '../actions';
import { LESSON_TITLE_MAX } from '../validation';

export type LessonRow = {
  readonly id: string;
  readonly title: string;
  readonly type: 'video' | 'written' | null;
};

type Props = {
  readonly courseId: string;
  readonly sectionId: string;
  readonly lessons: readonly LessonRow[];
  readonly onError: (message: string | null) => void;
  readonly selectedLessonId: string | null;
};

export function LessonList({
  courseId,
  sectionId,
  lessons,
  onError,
  selectedLessonId,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<readonly LessonRow[]>(lessons);
  const [, startTransition] = useTransition();

  // Sync local state when server data changes (e.g. after a sibling
  // mutation triggers router.refresh). Equality check avoids stomping
  // mid-drag optimistic state unnecessarily.
  useEffect(() => {
    setItems(lessons);
  }, [lessons]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((l) => l.id === active.id);
    const newIndex = items.findIndex((l) => l.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove([...items], oldIndex, newIndex);
    const previous = items;
    setItems(next);

    startTransition(async () => {
      const result = await reorderLessons(
        courseId,
        sectionId,
        next.map((l) => l.id),
      );
      if (!result.ok) {
        onError(result.error);
        setItems(previous);
      } else {
        onError(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="pl-3 text-xs text-slate-500">No lessons yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {items.map((l) => (
                <SortableLesson
                  key={l.id}
                  lesson={l}
                  courseId={courseId}
                  onError={onError}
                  isSelected={l.id === selectedLessonId}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddLessonButton courseId={courseId} sectionId={sectionId} onError={onError} />
    </div>
  );
}

function SortableLesson({
  lesson,
  courseId,
  onError,
  isSelected,
}: {
  readonly lesson: LessonRow;
  readonly courseId: string;
  readonly onError: (message: string | null) => void;
  readonly isSelected: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  const [pending, startTransition] = useTransition();

  const select = (): void => {
    router.push(`${pathname}?lesson=${lesson.id}`, { scroll: false });
  };

  const remove = (): void => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteLesson(courseId, lesson.id);
      if (!result.ok) onError(result.error);
      else {
        onError(null);
        // If the deleted lesson was selected, drop the query param.
        if (isSelected) router.push(pathname, { scroll: false });
        else router.refresh();
      }
    });
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-md border ${
        isSelected
          ? 'border-emerald-600 bg-slate-900'
          : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 p-1.5 pl-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="cursor-grab touch-none select-none text-slate-600 hover:text-slate-400 active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        <span className="text-xs text-slate-500">{lesson.type === 'video' ? '▶' : '✎'}</span>
        <button
          type="button"
          onClick={select}
          className={`flex-1 truncate text-left text-xs ${
            isSelected ? 'text-emerald-200' : 'text-slate-300 hover:text-white'
          }`}
        >
          {lesson.title}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          title="Delete lesson"
          className="rounded px-1 py-0.5 text-[10px] text-slate-600 transition hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function AddLessonButton({
  courseId,
  sectionId,
  onError,
}: {
  readonly courseId: string;
  readonly sectionId: string;
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
        className="ml-2 mt-1 text-xs text-emerald-400 transition hover:text-emerald-300"
      >
        + Add lesson
      </button>
    );
  }

  const submit = (): void => {
    if (!title.trim()) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await createLesson(courseId, sectionId, title);
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
      className="ml-2 mt-1 flex items-center gap-1"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, LESSON_TITLE_MAX))}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Lesson title"
        disabled={pending}
        className="w-40 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        {pending ? '…' : 'OK'}
      </button>
    </form>
  );
}
