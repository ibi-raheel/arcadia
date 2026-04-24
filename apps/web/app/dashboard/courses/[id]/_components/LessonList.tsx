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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.length === 0 ? (
        <p
          className="body-italic"
          style={{ paddingLeft: 10, color: 'var(--ink-quiet)', fontSize: 13 }}
        >
          no lessons yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
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

  const merged: React.CSSProperties = {
    ...style,
    borderRadius: 3,
    border: `1px solid ${isSelected ? 'var(--gilt)' : 'rgba(138, 106, 58, 0.3)'}`,
    background: isSelected ? 'rgba(255, 222, 155, 0.35)' : 'rgba(232, 213, 165, 0.35)',
    boxShadow: isSelected ? '0 2px 8px rgba(201, 161, 74, 0.25)' : 'none',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={merged}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
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
            color: 'var(--bronze-deep)',
            fontSize: 12,
            padding: 0,
          }}
        >
          ⋮⋮
        </button>
        <span style={{ color: 'var(--bronze-deep)', fontSize: 12 }}>
          {lesson.type === 'video' ? '▶' : '✎'}
        </span>
        <button
          type="button"
          onClick={select}
          style={{
            flex: 1,
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: isSelected ? 'var(--gilt-deep)' : 'var(--ink)',
            fontWeight: isSelected ? 600 : 400,
            padding: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lesson.title}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          title="Delete lesson"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-quiet)',
            padding: '2px 4px',
            fontSize: 10,
            cursor: 'pointer',
            borderRadius: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-quiet)')}
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
        style={{
          marginLeft: 10,
          marginTop: 4,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-hand)',
          fontSize: 15,
          color: 'var(--gilt-deep)',
          padding: 0,
          textAlign: 'left',
        }}
      >
        + add lesson
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
      style={{ marginLeft: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, LESSON_TITLE_MAX))}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="lesson title"
        disabled={pending}
        className="field"
        style={{ width: 160, fontSize: 13 }}
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        style={{
          padding: '3px 10px',
          borderRadius: 20,
          border: 'none',
          cursor: 'pointer',
          background:
            'linear-gradient(135deg, var(--bronze-bright) 0%, var(--bronze) 45%, var(--bronze-deep) 100%)',
          color: 'var(--night)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 12,
          opacity: !title.trim() || pending ? 0.4 : 1,
        }}
      >
        {pending ? '…' : 'ok'}
      </button>
    </form>
  );
}
