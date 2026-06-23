'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PWAInstallButton from '@/components/PWAInstallButton';

export default function LoginForm() {
  const router = useRouter();
  const [dept, setDept] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await fetch('/api/auth/options', { cache: 'no-store' });
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        const nextOptions = Array.isArray(data?.departments)
          ? data.departments.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
          : [];

        setDepartmentOptions(nextOptions);
      } catch {}
    };

    loadOptions();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept, password }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const nextPath = '/';
        router.push(nextPath);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Login gagal.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="dept" className="mb-1 block text-sm font-medium text-gray-700">
          Nama Departemen
        </label>
        <input
          id="dept"
          type="text"
          list="department-options"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          placeholder="Contoh: RnD"
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="department-options">
          {departmentOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Memproses...' : 'Login'}
      </button>
      <PWAInstallButton label="Download App" />
    </form>
  );
}