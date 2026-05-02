// Top-level client orchestrator for the four-category market.
//
// Holds the only piece of cross-view state: which category the member
// is browsing (`null` = the picker landing). Owns the in-memory
// "owned-this-session" set for the simulated categories — Courses uses
// the real `enrolments` row from the server-rendered initial state,
// then upgrades through the existing `enrolInCourse` action.

'use client';

import { useCallback, useMemo, useState } from 'react';

import { CATEGORY_META, type MarketCategoryId, type MarketItem } from '@/lib/market/types';
import { FIXTURE_ITEMS_BY_CATEGORY } from '@/lib/market/fixtures';

import { CategoryPicker } from './CategoryPicker';
import { CategoryView } from './CategoryView';

type Props = {
  /** Real DB-backed Course items (already shaped to MarketItem). */
  readonly courses: ReadonlyArray<MarketItem>;
};

export function Market({ courses }: Props): React.JSX.Element {
  const [active, setActive] = useState<MarketCategoryId | null>(null);
  /** Items the member has acquired *this session* — applies to all
   *  four categories (Courses get a real enrolment write too via the
   *  existing server action; the local set just keeps the UI snappy
   *  without a refetch). */
  const [ownedThisSession, setOwnedThisSession] = useState<ReadonlySet<string>>(new Set());

  const handleAcquired = useCallback((id: string) => {
    setOwnedThisSession((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Fold ownership in so children don't have to know about both.
  const itemsByCategory = useMemo(() => {
    const overlay = (item: MarketItem): MarketItem =>
      item.owned || ownedThisSession.has(item.id) ? { ...item, owned: true } : item;
    return {
      courses: courses.map(overlay),
      patterns: FIXTURE_ITEMS_BY_CATEGORY.patterns.map(overlay),
      tools: FIXTURE_ITEMS_BY_CATEGORY.tools.map(overlay),
      exclusives: FIXTURE_ITEMS_BY_CATEGORY.exclusives.map(overlay),
    } as const;
  }, [courses, ownedThisSession]);

  if (active === null) {
    const counts = {
      courses: itemsByCategory.courses.length,
      patterns: itemsByCategory.patterns.length,
      tools: itemsByCategory.tools.length,
      exclusives: itemsByCategory.exclusives.length,
    };
    return <CategoryPicker counts={counts} onPick={setActive} />;
  }

  return (
    <CategoryView
      meta={CATEGORY_META[active]}
      items={itemsByCategory[active]}
      onBack={() => setActive(null)}
      onAcquired={handleAcquired}
    />
  );
}
