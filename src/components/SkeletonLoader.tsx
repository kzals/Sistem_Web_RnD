'use client';

// Skeleton for small stats cards
export function SkeletonCard({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-12 mb-2"></div>
        <div className="h-6 bg-slate-200 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
          <div className="h-10 bg-slate-200 rounded w-32"></div>
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
      </div>
      <div className="mt-4 h-2 bg-slate-200 rounded-full"></div>
    </div>
  );
}

// Skeleton for status cards grid (6 cards)
export function SkeletonStatusCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {Array(6)
        .fill(null)
        .map((_, i) => (
          <SkeletonCard key={i} variant="compact" />
        ))}
    </div>
  );
}

// Skeleton for section header
export function SkeletonSectionHeader() {
  return (
    <div className="mb-4 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-40 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-64"></div>
    </div>
  );
}

// Skeleton for table row
export function SkeletonTableRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100 hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-12"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-16"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-6 bg-slate-200 rounded-full w-16"></div>
      </td>
    </tr>
  );
}

// Skeleton for notification card
export function SkeletonNotificationCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-4 bg-slate-300 rounded w-20 flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-40 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-full"></div>
          <div className="h-3 bg-slate-200 rounded w-24 mt-2"></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for borrowed product card
export function SkeletonBorrowedCard() {
  return (
    <tr className="animate-pulse border-b border-slate-100 hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-16"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </td>
      <td className="px-5 py-4">
        <div className="h-6 bg-slate-200 rounded-full w-14"></div>
      </td>
    </tr>
  );
}
