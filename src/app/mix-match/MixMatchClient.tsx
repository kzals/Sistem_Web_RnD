"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, ShoppingBag, Send, CheckSquare, Square, Search } from 'lucide-react';
import { type AppRole, normalizeAppRole } from '@/lib/auth';

type UrgencyLevel = 'Rendah' | 'Sedang' | 'Tinggi';

interface TemplateOption {
  id: string;
  name: string;
  path: string;
}

interface AuthMeResponse {
  userId?: number;
  dept?: string | null;
  role?: AppRole | string | null;
  userKey?: string | null;
}

interface MixMatchItem {
  IdSampel: number;
  Design: string;
  Gambar?: string | null;
  GambarNama?: string | null;
  Lemari?: string | null;
  RakHanger?: string | null;
  BrandNameNote?: string | null;
}

const SELECTION_STORAGE_KEY = 'selectedSampelItems';
const MIX_MATCH_STORAGE_KEY = 'selectedMixMatchItems';
const FORM_STORAGE_KEY = 'formPengambilanData';
const LOCAL_STORAGE_SELECTED_KEY = 'selectedSampelItemsForm';

const UPPER_TEMPLATES: TemplateOption[] = [
  { id: 'jas', name: 'Jas', path: '/jas.png' },
  { id: 'kemeja', name: 'Kemeja', path: '/kemeja.png' },
  { id: 'kemeja-lpanjang', name: 'Kemeja Lengan Panjang', path: '/kemeja_lpanjang.png' },
];

const LOWER_TEMPLATES: TemplateOption[] = [
  { id: 'celana_panjang2', name: 'Celana Panjang', path: '/celana_panjang2.png' },
  { id: 'celana-pendek', name: 'Celana Pendek', path: '/celana_panjang2.png' },
];

function extractDriveFileId(raw?: string | null) {
  if (!raw) return null;
  const value = String(raw).trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/view\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function resolveImageUrl(raw?: string | null) {
  if (!raw) return null;
  const value = String(raw).trim();
  const fileId = extractDriveFileId(value);
  if (fileId) return `/api/drive-image/${fileId}`;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  return null;
}

function normalizeMixMatchItem(raw: any): MixMatchItem | null {
  const id = Number(raw?.IdSampel || 0);
  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    IdSampel: id,
    Design: String(raw?.Design || ''),
    Gambar: raw?.Gambar ?? null,
    GambarNama: raw?.GambarNama ?? null,
    Lemari: raw?.Lemari ?? null,
    RakHanger: raw?.RakHanger ?? null,
    BrandNameNote: raw?.BrandNameNote ?? null,
  };
}

function formatSelectedLabel(item: MixMatchItem | null) {
  if (!item) return '-';
  return `${item.Design || '-'} • ID ${item.IdSampel}`;
}

function FabricChip({
  item,
  active,
  checked,
  onToggleCheck,
  onUseAsUpper,
  onUseAsLower,
}: {
  item: MixMatchItem;
  active: 'upper' | 'lower' | null;
  checked: boolean;
  onToggleCheck: () => void;
  onUseAsUpper: () => void;
  onUseAsLower: () => void;
}) {
  const imageSrc = resolveImageUrl(item.Gambar);

  const borderStyle = checked
    ? 'border-sky-400 ring-2 ring-sky-200'
    : active
      ? 'border-sky-300 ring-2 ring-sky-100'
      : 'border-slate-200';

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition cursor-pointer ${borderStyle} hover:border-sky-300`}
      onClick={onToggleCheck}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCheck(); } }}
    >
      <div className="flex gap-3 p-3">
        <div className="flex flex-shrink-0 items-start pt-0.5 text-slate-400">
          {checked ? <CheckSquare size={20} className="text-sky-600" /> : <Square size={20} />}
        </div>
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={item.GambarNama || item.Design}
              className="h-full w-full object-cover"
              style={/kemeja/i.test(String(item.Design || '')) ? { clipPath: 'inset(18% 0 22% 0)' } : undefined}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              No Image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{item.Design}</div>
          <div className="mt-1 text-xs text-slate-500">ID {item.IdSampel}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUseAsUpper(); }}
              className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Pakaian atas
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUseAsLower(); }}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Pakaian bawah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClothingFrame({
  title,
  subtitle,
  imageSrc,
  bgId,
  frameSrc,
  overlaySrc,
  templates,
  selectedTemplate,
  onTemplateChange,
  isVisible,
  onToggleVisible,
}: {
  title: string;
  subtitle: string;
  imageSrc?: string | null;
  bgId: string;
  frameSrc?: string | null;
  overlaySrc?: string | null;
  templates?: TemplateOption[];
  selectedTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
  isVisible?: boolean;
  onToggleVisible?: () => void;
}) {
  const [overlayInfo, setOverlayInfo] = useState<{ width: number; height: number; ok: boolean } | null>(null);
  const isLowerFrame = title.toLowerCase().includes('celana');
  const isKemejaShortSleeveTemplate = !isLowerFrame && selectedTemplate === 'kemeja';
  const isUpperKemejaTemplate = !isLowerFrame && (selectedTemplate === 'kemeja' || selectedTemplate === 'kemeja-lpanjang');
  const clothClip = isLowerFrame
    ? { x: 110, y: 70, width: 380, height: 575 }
    : isKemejaShortSleeveTemplate
      ? { x: 0, y: 52, width: 600, height: 620 }
      : isUpperKemejaTemplate
        ? { x: 30, y: 52, width: 540, height: 620 }
      : { x: 30, y: 52, width: 540, height: 620 };

  useEffect(() => {
    let mounted = true;
    setOverlayInfo(null);
    if (!overlaySrc) return;
    const img = new Image();
    img.onload = () => {
      if (!mounted) return;
      // naturalWidth/naturalHeight give the intrinsic pixel size
      setOverlayInfo({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, ok: true });
      // also log to help debugging in browser console
      // eslint-disable-next-line no-console
      console.log('Mix & Match overlay loaded:', overlaySrc, 'size=', img.naturalWidth, 'x', img.naturalHeight);
    };
    img.onerror = () => {
      if (!mounted) return;
      setOverlayInfo({ width: 0, height: 0, ok: false });
      // eslint-disable-next-line no-console
      console.error('Failed to load Mix & Match overlay:', overlaySrc);
    };
    img.src = overlaySrc;
    return () => {
      mounted = false;
    };
  }, [overlaySrc]);
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          </div>
          {onToggleVisible && (
            <button
              type="button"
              onClick={onToggleVisible}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                isVisible ? 'bg-sky-500 hover:bg-sky-600' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={isVisible ? `Sembunyikan ${title}` : `Tampilkan ${title}`}
              title={isVisible ? 'Sembunyikan' : 'Tampilkan'}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                  isVisible ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          )}
        </div>
        {templates && templates.length > 0 && onTemplateChange && (
          <select
            value={selectedTemplate || ''}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">Pilih Model Pakaian</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {isVisible !== false && (
        !selectedTemplate ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <div className="mb-2 text-4xl">👕</div>
            <p className="text-sm font-medium text-slate-500">Silahkan pilih model terlebih dahulu</p>
          </div>
        ) : (
        <svg viewBox="0 0 600 720" className="w-3/4 h-auto mx-auto">
        <defs>
          <linearGradient id={bgId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <clipPath id={`${bgId}-cloth-clip`}>
            <rect x={clothClip.x} y={clothClip.y} width={clothClip.width} height={clothClip.height} rx="0" />
          </clipPath>
          <linearGradient id={`${bgId}-fade-top`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="40%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${bgId}-fade-bottom`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="60%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="600" height="720" rx="36" fill="#ffffff" />

        {/* fabric fills the full artboard; the PNG template sits on top */}
        <g clipPath={`url(#${bgId}-cloth-clip)`}>
          <rect x="0" y="0" width="600" height="720" fill={`url(#${bgId})`} />
          {imageSrc ? (
            <image href={imageSrc} x="0" y="0" width="600" height="720" preserveAspectRatio="xMidYMid slice" />
          ) : (
            <rect x="0" y="0" width="600" height="720" fill="#e2e8f0" />
          )}
          <rect x="0" y="0" width="600" height="720" fill="rgba(15,23,42,0.08)" />

          {/* fade out top/bottom artifact bands from fabric image (only for kemeja templates) */}
          {isUpperKemejaTemplate && (
            <>
              <rect x={clothClip.x} y={clothClip.y} width={clothClip.width} height="48" fill={`url(#${bgId}-fade-top)`} />
              <rect x={clothClip.x} y={clothClip.y + clothClip.height - 48} width={clothClip.width} height="48" fill={`url(#${bgId}-fade-bottom)`} />
            </>
          )}
        </g>

        {/* user-provided frame PNG (kemeja / celana) */}
        {frameSrc && (
          <svg
            x="0"
            y={isUpperKemejaTemplate ? 28 : 0}
            width="600"
            height={isUpperKemejaTemplate ? 664 : 720}
            overflow="hidden"
          >
            <image
              href={frameSrc}
              x="0"
              y={isUpperKemejaTemplate ? -28 : 0}
              width="600"
              height="720"
              preserveAspectRatio="xMidYMid meet"
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        )}

        {/* optional additional overlay */}
        {overlaySrc && (
          <image
            href={overlaySrc}
            x="0"
            y="0"
            width="600"
            height="720"
            preserveAspectRatio="xMidYMid meet"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
        )
      )}
    </div>
  );
}

export default function MixMatchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = useMemo(() => {
    const raw = searchParams.get('id');
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const fromPage = searchParams.get('from') || 'search';
  const searchQuery = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [department, setDepartment] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Sedang');
  const [items, setItems] = useState<MixMatchItem[]>([]);
  const [upperIndex, setUpperIndex] = useState(0);
  const [lowerIndex, setLowerIndex] = useState(0);
  const [showUpperPanel, setShowUpperPanel] = useState(false);
  const [showLowerPanel, setShowLowerPanel] = useState(false);
  const [showPatternPanel, setShowPatternPanel] = useState(false);
  const [showRequestPanel, setShowRequestPanel] = useState(true);
  const [selectedUpperTemplate, setSelectedUpperTemplate] = useState('');
  const [selectedLowerTemplate, setSelectedLowerTemplate] = useState('');
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<number>>(new Set());

  const backHref = fromPage === 'detail' && selectedId
    ? `/detail/${selectedId}`
    : searchQuery
      ? `/search?q=${encodeURIComponent(searchQuery)}`
      : '/search';

  const upperItem = items[upperIndex] || items[0] || null;
  const lowerItem = items[lowerIndex] || items[0] || null;
  const upperImageSrc = resolveImageUrl(upperItem?.Gambar);
  const lowerImageSrc = resolveImageUrl(lowerItem?.Gambar);
  const upperTemplatePath = UPPER_TEMPLATES.find((t) => t.id === selectedUpperTemplate)?.path || '/jas.png';
  const lowerTemplatePath = LOWER_TEMPLATES.find((t) => t.id === selectedLowerTemplate)?.path || '/celana_panjang2.png';

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const meResponse = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!meResponse.ok) {
          router.replace('/login');
          return;
        }

        const meData = (await meResponse.json()) as AuthMeResponse;
        const nextRole = normalizeAppRole(meData?.role);
        if (!meData?.dept || !nextRole) {
          router.replace('/login');
          return;
        }

        const savedForm = localStorage.getItem(FORM_STORAGE_KEY);
        if (savedForm) {
          try {
            const parsed = JSON.parse(savedForm);
            if (parsed?.customerName) setCustomerName(String(parsed.customerName));
            if (parsed?.notes) setNotes(String(parsed.notes));
            if (parsed?.urgency) setUrgency(parsed.urgency);
          } catch {
            // ignore invalid saved state
          }
        }

        const savedSelectionRaw = sessionStorage.getItem(MIX_MATCH_STORAGE_KEY) || localStorage.getItem(MIX_MATCH_STORAGE_KEY);
        let nextItems: MixMatchItem[] = [];

        if (savedSelectionRaw) {
          try {
            const parsed = JSON.parse(savedSelectionRaw);
            if (Array.isArray(parsed)) {
              nextItems = parsed
                .map((item) => normalizeMixMatchItem(item))
                .filter((item): item is MixMatchItem => item !== null);
            }
          } catch {
            // ignore invalid saved state
          }
        }

        if (nextItems.length === 0 && selectedId) {
          const productResponse = await fetch(`/api/users?id=${selectedId}`, { cache: 'no-store' });
          if (!productResponse.ok) {
            throw new Error('Gagal memuat data kain');
          }
          const data = await productResponse.json();
          const normalized = normalizeMixMatchItem(data);
          if (normalized) {
            nextItems = [normalized];
          }
        }

        if (active) {
          setRole(nextRole);
          setDepartment(String(meData.dept || '').trim());
          setCustomerName((current) => current || String(meData.userKey || meData.dept || '').trim());
          setItems(nextItems);
          setUpperIndex(nextItems.length > 0 ? 0 : 0);
          setLowerIndex(nextItems.length > 1 ? 1 : 0);
          if (nextItems.length > 0) {
            setShowUpperPanel(true);
            setShowLowerPanel(true);
            setSelectedUpperTemplate(UPPER_TEMPLATES[0]?.id || '');
            setSelectedLowerTemplate(LOWER_TEMPLATES[0]?.id || '');
            setSelectedLoanIds(new Set(nextItems.map((item) => item.IdSampel)));
          }
        }
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message || 'Gagal memuat halaman mix and match');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [router, selectedId]);

  const selectedForLoan = useMemo(() => {
    return items.filter((item) => selectedLoanIds.has(item.IdSampel));
  }, [items, selectedLoanIds]);

  const visiblePatternItems = items;
  const allSelected = items.length > 0 && items.every((item) => selectedLoanIds.has(item.IdSampel));

  const handleToggleLoanItem = (id: number) => {
    setSelectedLoanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedLoanIds(new Set(items.map((item) => item.IdSampel)));
  };

  const handleDeselectAll = () => {
    setSelectedLoanIds(new Set());
  };

  const handleGoToLoanForm = () => {
    if (selectedForLoan.length === 0) {
      setError('Pilih kain terlebih dahulu');
      return;
    }

    const selectedItems = selectedForLoan.map((item) => ({
      IdSampel: item.IdSampel,
      Design: item.Design,
      Lemari: item.Lemari,
      RakHanger: item.RakHanger,
    }));

    sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectedItems));
    localStorage.setItem(LOCAL_STORAGE_SELECTED_KEY, JSON.stringify(selectedItems));
    localStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({
        customerName: customerName.trim(),
        status: 'Dipinjam',
        notes: notes.trim(),
        urgency,
      })
    );

    router.push('/form-pengambilan');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_40%,_#fff_100%)] px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
          Memuat halaman mix and match...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_40%,_#fff_100%)] px-4 py-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-6 py-8 text-white sm:px-8">
            <h1 className="text-3xl font-black tracking-tight">Mix and Match</h1>
            <p className="mt-2 text-sm text-slate-200">Halaman untuk menyusun kain terpilih ke dalam frame pakaian.</p>
          </div>
          <div className="p-8 text-slate-700">
            <p className="text-rose-600">{error}</p>
            <div className="mt-6 flex gap-3">
              <Link href={backHref} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                <ArrowLeft size={16} /> Kembali
              </Link>
              <Link href="/search" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Cari Kain
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasItems = items.length > 0;

  

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_40%,_#fff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-6 py-6 text-white sm:px-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                <Sparkles size={14} /> Requester Workspace
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Mix and Match</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
                  Pilih kain dari hasil pencarian, atur pakaian dan celana, lalu lanjutkan ke permintaan peminjaman sampel.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:px-8 lg:py-8">
            <div className="space-y-4">
              <div className="space-y-4">
                <ClothingFrame
                  title="Pakaian"
                  subtitle={formatSelectedLabel(upperItem)}
                  imageSrc={upperImageSrc}
                  bgId="mixBgTop"
                  frameSrc={upperTemplatePath}
                  templates={UPPER_TEMPLATES}
                  selectedTemplate={selectedUpperTemplate}
                  onTemplateChange={setSelectedUpperTemplate}
                  isVisible={showUpperPanel}
                  onToggleVisible={() => setShowUpperPanel(!showUpperPanel)}
                />

                <ClothingFrame
                  title="Celana"
                  subtitle={formatSelectedLabel(lowerItem)}
                  imageSrc={lowerImageSrc}
                  bgId="mixBgBottom"
                  frameSrc={lowerTemplatePath}
                  templates={LOWER_TEMPLATES}
                  selectedTemplate={selectedLowerTemplate}
                  onTemplateChange={setSelectedLowerTemplate}
                  isVisible={showLowerPanel}
                  onToggleVisible={() => setShowLowerPanel(!showLowerPanel)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Kain Terpilih</h2>
                </div>
                {hasItems ? (
                  <>
                    <div className="mt-2 text-2xl font-black break-words text-slate-900">{upperItem?.Design || '-'}</div>
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-xs text-slate-400">Lemari</div>
                        <div className="mt-1 font-semibold text-slate-800">{upperItem?.Lemari || '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-xs text-slate-400">Rak/Hanger</div>
                        <div className="mt-1 font-semibold text-slate-800">{upperItem?.RakHanger || '-'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:col-span-2">
                        <div className="text-xs text-slate-400">Brand Name / Note</div>
                        <div className="mt-1 font-semibold text-slate-800">{upperItem?.BrandNameNote || '-'}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Tidak ada kain dipilih
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">Pola Desain</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {hasItems ? `${selectedLoanIds.size}/${items.length} Dipilih` : '0 Dipilih'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPatternPanel((current) => !current)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black leading-none transition ${
                        showPatternPanel
                          ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      aria-label={showPatternPanel ? 'Sembunyikan panel Sumber Pola' : 'Tampilkan panel Sumber Pola'}
                      title={showPatternPanel ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showPatternPanel ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                    </button>
                  </div>
                </div>

                {showPatternPanel && (
                  <div className="mt-4">
                    {hasItems ? (
                      <>
                        <div className="mb-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            disabled={allSelected}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-40"
                          >
                            Pilih Semua
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            disabled={selectedLoanIds.size === 0}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            Hapus Semua
                          </button>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto pr-1">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            {visiblePatternItems.map((item, index) => (
                              <FabricChip
                                key={item.IdSampel}
                                item={item}
                                active={upperItem?.IdSampel === item.IdSampel ? 'upper' : lowerItem?.IdSampel === item.IdSampel ? 'lower' : null}
                                checked={selectedLoanIds.has(item.IdSampel)}
                                onToggleCheck={() => handleToggleLoanItem(item.IdSampel)}
                                onUseAsUpper={() => setUpperIndex(index)}
                                onUseAsLower={() => setLowerIndex(index)}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                        <p className="text-sm text-slate-500">Silahkan Cari Pola Kain terlebih dahulu</p>
                        <Link
                          href="/search"
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                          <Search size={16} /> Cari Kain
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Data Permintaan</h2>
                  <button
                    type="button"
                    onClick={() => setShowRequestPanel((current) => !current)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black leading-none transition ${
                      showRequestPanel
                        ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                        : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    aria-label={showRequestPanel ? 'Sembunyikan panel Data Permintaan' : 'Tampilkan panel Data Permintaan'}
                    title={showRequestPanel ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showRequestPanel ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                  </button>
                </div>

                {showRequestPanel && (
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      <span className="mb-2 block">Nama Requester</span>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        placeholder="Nama pemohon"
                      />
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departemen Login</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{department || '-'}</div>
                    </div>

                    <label className="block text-sm font-semibold text-slate-700">
                      <span className="mb-2 block">Urgensi</span>
                      <select
                        value={urgency}
                        onChange={(event) => setUrgency(event.target.value as UrgencyLevel)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="Rendah">Rendah</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Tinggi">Tinggi</option>
                      </select>
                    </label>

                    <label className="block text-sm font-semibold text-slate-700">
                      <span className="mb-2 block">Catatan</span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleGoToLoanForm}
                      disabled={saving || !role}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send size={16} />
                      Ajukan Peminjaman Sampel
                    </button>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      Setelah tombol ini ditekan, pilihan kain akan dibawa ke form peminjaman yang sudah ada.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
