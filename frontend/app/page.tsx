'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-6">
          Welcome to the Collaborative Exercise Tool
        </h1>

        {session ? (
          <div className="text-center">
            <p className="mb-4">Signed in as {session.user?.email}</p>
            <div className="flex justify-center items-center gap-4 mt-4">
                <Link href="/dashboard" className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600">
                    Go to Dashboard
                </Link>
                <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-red-500 text-white font-bold py-2 px-4 rounded hover:bg-red-600"
                >
                Sign Out
                </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4">You are not signed in.</p>
            <Link href="/login" className="bg-blue-500 text-white font-bold py-2 px-4 rounded">
              Sign In
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
