// `/preview/studio` — public preview of the keeper's studio. Renders
// the real /dashboard page directly so the same StudioContent +
// DashboardShell you'd see at /dashboard shows up here against
// fixture data (the studio's useFetchOrMock seeds its simulation
// fixture when Supabase is unavailable).

'use client';

import StudioPage from '@/app/dashboard/page';

export const dynamic = 'force-dynamic';

export default function StudioPreviewPage(): React.JSX.Element {
  return <StudioPage />;
}
