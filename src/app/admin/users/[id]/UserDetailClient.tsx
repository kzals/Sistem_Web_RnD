"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, PencilLine } from 'lucide-react';
import { type AppRole, normalizeAppRole } from '@/lib/auth';

interface Props {
  id: string;
}

interface UserPayload {
  userId: number;
  dept: string;
  role: AppRole;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  hasSession?: boolean;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(d);
}

export default function UserDetailClient({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState<UserPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal memuat user');
        const data = await res.json();
        if (mounted) {
          setForm({
            userId: data.user.userId,
            dept: data.user.dept || '',
            role: (data.user.role || 'requester') as AppRole,
            isActive: Boolean(data.user.isActive),
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
            hasSession: Boolean(data.user.hasSession),
          });
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat user');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, dept: form.dept, role: form.role, isActive: form.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan user');
      setMessage('Perubahan tersimpan');
      router.push('/admin/users');
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!form) return;
    const pw = window.prompt('Masukkan password baru untuk user ini');
    if (!pw) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.userId, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal reset password');
      setMessage('Password berhasil diubah');
    } catch (err: any) {
      setError(err?.message || 'Gagal reset password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-600">Memuat...</div>;
  if (error) return <div className="text-sm text-rose-600">{error}</div>;
  if (!form) return <div className="text-sm text-slate-600">User tidak ditemukan</div>;

  return (
    <div className="min-h-screen">
      <header className="mb-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-6 py-8 text-white">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black">Edit User</h1>
          </div>
          <div>
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              <ArrowLeft size={16} /> Kembali
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Identitas User</div>
            <div className="text-xs text-slate-400">Departemen: {form.dept}</div>
            <div className="mt-4 space-y-4">
              <label className="block">
                <div className="text-xs text-slate-500">Nama / Departemen</div>
                <input value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" />
              </label>

              <label className="block">
                <div className="text-xs text-slate-500">Role / Akses</div>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: normalizeAppRole(e.target.value) as AppRole })} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3">
                  <option value="root">ROOT</option>
                  <option value="rnd">R&D</option>
                  <option value="requester">Requester</option>
                </select>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-5 w-5 rounded" />
                Status Aktif
              </label>

              <div>
                <div className="text-xs text-slate-500">Password</div>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">Password</div>
                  </div>
                  <div className="ml-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-600">••••••••</div>
                  <button onClick={handleResetPassword} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700">
                    <PencilLine size={14} /> Reset
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">
                  {saving ? 'Menyimpan...' : <><CheckCircle2 size={16} /> Simpan</>}
                </button>
                <button onClick={() => router.push('/admin/users')} className="rounded-2xl border px-4 py-3 text-sm">Batal</button>
                <button onClick={handleResetPassword} disabled={saving} className="ml-auto rounded-2xl border px-3 py-2 text-sm">Reset Password</button>
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 />
                    <span>Perubahan berhasil disimpan</span>
                  </div>
                </div>
              )}
              {error && <div className="text-sm text-rose-600">{error}</div>}
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold">Ringkasan</div>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">Status Session</div>
                <div className="mt-1 font-semibold text-slate-800">{form.hasSession ? 'Ada' : ' - '}</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">Dibuat</div>
                <div className="mt-1 font-semibold text-slate-800">{formatDateTime(form.createdAt)}</div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">Updated</div>
                <div className="mt-1 font-semibold text-slate-800">{formatDateTime(form.updatedAt)}</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
