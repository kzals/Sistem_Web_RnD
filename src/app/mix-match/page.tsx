import { Suspense } from 'react';
import MixMatchClient from './MixMatchClient';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_40%,_#fff_100%)] px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          Memuat halaman mix and match...
        </div>
      </div>
    }>
      <MixMatchClient />
    </Suspense>
  );
}
