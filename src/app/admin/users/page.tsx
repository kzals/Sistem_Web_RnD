'use client';

import { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, KeyRound, Loader2, Plus, RefreshCw, Shield, ToggleLeft, ToggleRight, Trash2, UserPlus, X } from 'lucide-react';
import { type AppRole, normalizeAppRole } from '@/lib/auth';

interface AdminUser {
  userId: number;
  dept: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  hasSession: boolean;
}

interface UserUpdatePayload {
  userId: number;
  dept?: string;
  role?: AppRole;
  isActive?: boolean;
  password?: string;
}

interface AdminUserRowProps {
  user: AdminUser;
  isEditing: boolean;
  editDept?: string;
  editRole?: AppRole;
  editIsActive?: boolean;
  saving: boolean;
  onStartEdit: (user: AdminUser) => void;
  onCancelEdit: () => void;
  onSave: (payload: UserUpdatePayload) => void;
  onToggleActive: (user: AdminUser) => void;
  onResetPassword: (userId: number) => void;
  onEditDeptChange: (value: string) => void;
  onEditRoleChange: (value: AppRole) => void;
  onEditActiveChange: (value: boolean) => void;
  onHardDeleteClick: (user: AdminUser) => void;
}

const roleOptions: Array<{ value: AppRole; label: string; description: string }> = [
  { value: 'root', label: 'ROOT', description: 'Akses penuh ke semua menu dan manajemen user' },
  { value: 'rnd', label: 'R&D', description: 'Kelola data produk, sampel, dan notifikasi' },
  { value: 'requester', label: 'Requester', description: 'Buat request dan lihat data yang diizinkan' },
];

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

const AdminUserRow = memo(function AdminUserRow({
  user,
  isEditing,
  editDept,
  editRole,
  editIsActive,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onToggleActive,
  onResetPassword,
  onEditDeptChange,
  onEditRoleChange,
  onEditActiveChange,
  onHardDeleteClick,
}: AdminUserRowProps) {
  const createdLabel = formatDateTime(user.createdAt);
  const updatedLabel = user.updatedAt ? formatDateTime(user.updatedAt) : '';

  return (
    <tr className={user.isActive ? 'bg-white' : 'bg-slate-50/80'}>
      <td className="px-4 py-4 font-semibold text-slate-900">{user.userId}</td>
      <td className="px-4 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editDept ?? user.dept}
            onChange={(event) => onEditDeptChange(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        ) : (
          <div>
            <div className="font-semibold text-slate-900">{user.dept}</div>
            <div className="text-xs text-slate-500">{updatedLabel}</div>
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <select
            value={editRole ?? user.role}
            onChange={(event) => onEditRoleChange((normalizeAppRole(event.target.value) || 'requester') as AppRole)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {user.role}
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editIsActive ?? user.isActive}
              onChange={(event) => onEditActiveChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Aktif
          </label>
        ) : (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {user.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.hasSession ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
          {user.hasSession ? 'Ada' : 'Kosong'}
        </span>
      </td>
      <td className="px-4 py-4 text-slate-600">{createdLabel}</td>
      <td className="px-4 py-4">
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSave({ userId: user.userId, dept: editDept ?? user.dept, role: editRole ?? user.role, isActive: editIsActive ?? user.isActive })}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Simpan
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (window.location.href = `/admin/users/${user.userId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(user)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {user.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
              {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            <button
              type="button"
              onClick={() => onHardDeleteClick(user)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AlertTriangle size={14} />
              Hapus User
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createForm, setCreateForm] = useState({ dept: '', password: '', role: 'requester' as AppRole, isActive: true });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ dept: '', password: '', role: 'requester' as AppRole, isActive: true });
  const [deleteTarget, setDeleteTarget] = useState<{ user: AdminUser; hard: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      return [user.dept, user.role, String(user.userId)].some((value) => value.toLowerCase().includes(query));
    });
  }, [search, users]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [search, users.length]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (response.status === 403) {
        router.replace('/');
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal memuat user');
      }
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat user');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = useCallback(async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept: createForm.dept,
          password: createForm.password,
          role: createForm.role,
          isActive: createForm.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal membuat user');
      }
      setUsers((current) => [...current, data.user].sort((a, b) => a.userId - b.userId));
      setCreateForm({ dept: '', password: '', role: 'requester', isActive: true });
      setMessage('User baru berhasil dibuat');
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat user');
    } finally {
      setSaving(false);
    }
  }, [createForm]);

  const handleSaveUser = useCallback(async (payload: UserUpdatePayload) => {
    if (!payload.userId) return;
    if (!payload.dept && payload.role === undefined && payload.isActive === undefined && !payload.password) {
      setMessage('Tidak ada perubahan untuk disimpan');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal menyimpan perubahan');
      }
      setUsers((currentUsers) => currentUsers.map((user) => (user.userId === data.user.userId ? data.user : user)));
      setEditingUserId(null);
      setMessage('Perubahan user tersimpan');
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleToggleActive = useCallback(async (user: AdminUser) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, isActive: !user.isActive }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal mengubah status');
      }
      setUsers((currentUsers) => currentUsers.map((item) => (item.userId === user.userId ? data.user : item)));
      setMessage(user.isActive ? 'User berhasil dinonaktifkan' : 'User berhasil diaktifkan');
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah status');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleResetPassword = useCallback(async (userId: number) => {
    const password = window.prompt('Masukkan password baru untuk user ini');
    if (!password) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal reset password');
      }
      setUsers((currentUsers) => currentUsers.map((item) => (item.userId === userId ? data.user : item)));
      setMessage('Password user berhasil direset');
    } catch (err: any) {
      setError(err?.message || 'Gagal reset password');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleEditClick = useCallback((user: AdminUser) => {
    setEditingUserId(user.userId);
    setEditForm({ dept: user.dept, password: '', role: user.role, isActive: user.isActive });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditForm({ dept: '', password: '', role: 'requester', isActive: true });
  }, []);

  const handleHardDeleteClick = useCallback((user: AdminUser) => {
    setDeleteTarget({ user, hard: true });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users?hard=1`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.user.userId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal menghapus user');
      }
      setUsers((current) => current.filter((u) => u.userId !== deleteTarget.user.userId));
      setMessage(`User "${deleteTarget.user.dept}" berhasil dihapus`);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus user');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleEditDeptChange = useCallback((value: string) => {
    setEditForm((current) => ({ ...current, dept: value }));
  }, []);

  const handleEditRoleChange = useCallback((value: AppRole) => {
    setEditForm((current) => ({ ...current, role: value }));
  }, []);

  const handleEditActiveChange = useCallback((value: boolean) => {
    setEditForm((current) => ({ ...current, isActive: value }));
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eff6ff,_#f8fafc_42%,_#fff_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-6 py-6 text-white md:flex-row md:items-end md:justify-between md:px-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                <Shield size={14} />
                Admin ROOT
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-4xl">Kelola User, Role, dan Akses</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
                  Tambah user baru, ubah role, aktifkan atau nonaktifkan akses, dan reset password dari satu halaman.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCw size={16} />
              Muat Ulang
            </button>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tambah User</h2>
                <p className="mt-1 text-sm text-slate-600">Gunakan form ini untuk membuat akun baru.</p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Departemen / Nama User
                  <input
                    type="text"
                    value={createForm.dept}
                    onChange={(event) => setCreateForm((current) => ({ ...current, dept: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    placeholder="Contoh: TIC / RND / Finance"
                  />
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Password
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    placeholder="Password"
                  />
                </label>

                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Role
                  <select
                    value={createForm.role}
                    onChange={(event) => setCreateForm((current) => ({ ...current, role: normalizeAppRole(event.target.value) || 'requester' }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  Aktif
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(event) => setCreateForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={saving || loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Buat User
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Catatan</div>
                <p className="mt-2 leading-6">
                  ROOT terakhir tidak bisa dinonaktifkan atau diturunkan role-nya agar akses admin tidak terkunci.
                </p>
              </div>
            </aside>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Daftar User</h2>
                  <p className="text-sm text-slate-500">Total {filteredUsers.length} user ditampilkan.</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari departemen, role, atau ID"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 md:w-80"
                  />
                </div>
              </div>

              {message && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 size={18} className="mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  <AlertCircle size={18} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="flex items-center justify-center px-6 py-20 text-slate-500">
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Memuat data user...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-slate-500">
                    Tidak ada user yang cocok dengan pencarian.
                  </div>
                ) : (
                  <div className="max-h-[65vh] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 shadow-[0_1px_0_rgba(148,163,184,0.35)]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">ID</th>
                          <th className="px-4 py-3 font-semibold">User</th>
                          <th className="px-4 py-3 font-semibold">Role</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Login Session</th>
                          <th className="px-4 py-3 font-semibold">Dibuat</th>
                          <th className="px-4 py-3 font-semibold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedUsers.map((user) => {
                          const isEditing = editingUserId === user.userId;
                          return (
                            <AdminUserRow
                              key={user.userId}
                              user={user}
                              isEditing={isEditing}
                              editDept={isEditing ? editForm.dept : undefined}
                              editRole={isEditing ? editForm.role : undefined}
                              editIsActive={isEditing ? editForm.isActive : undefined}
                              saving={saving}
                              onStartEdit={handleEditClick}
                              onCancelEdit={handleCancelEdit}
                              onSave={handleSaveUser}
                              onToggleActive={handleToggleActive}
                              onResetPassword={handleResetPassword}
                              onEditDeptChange={handleEditDeptChange}
                              onEditRoleChange={handleEditRoleChange}
                              onEditActiveChange={handleEditActiveChange}
                              onHardDeleteClick={handleHardDeleteClick}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="text-sm text-slate-600">Menampilkan {pagedUsers.length} dari {filteredUsers.length} user</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-slate-600">Halaman {page} / {totalPages}</div>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total User</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{users.length}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">ROOT Aktif</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{users.filter((user) => user.role === 'root' && user.isActive).length}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aktif</div>
                  <div className="mt-2 text-3xl font-black text-slate-900">{users.filter((user) => user.isActive).length}</div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCancelDelete}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Hapus User Permanen</h3>
                <p className="text-sm text-slate-500">Tindakan ini tidak bisa dibatalkan</p>
              </div>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">{deleteTarget.user.dept}</div>
              <div className="mt-1 text-slate-600">
                Role: <span className="font-medium text-slate-800">{deleteTarget.user.role.toUpperCase()}</span>
              </div>
            </div>

            <p className="mb-6 text-sm font-medium text-red-600">
              Data user akan dihapus permanen dari database dan tidak bisa dikembalikan.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
