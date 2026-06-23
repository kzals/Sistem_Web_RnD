import { Suspense } from 'react';
import Image from 'next/image';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <Image
            src="/trisula-512.png"
            alt="Trisula logo"
            width={72}
            height={72}
            priority
            className="mx-auto mb-3 h-18 w-18 rounded-xl"
          />
          <h1 className="text-2xl font-bold text-gray-900">Sistem Research & Development</h1>
          <p className="mt-1 text-sm text-gray-500">Silakan login untuk melanjutkan</p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}