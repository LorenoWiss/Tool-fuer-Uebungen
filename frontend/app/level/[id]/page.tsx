'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Simplified interfaces for the page
interface LevelStub {
  id: string;
  name: string;
}

interface OrganizationStub {
    id: string;
    name: string;
}

interface LevelData {
  id: string;
  name: string;
  children: LevelStub[];
  parent: LevelStub | null;
  organization: OrganizationStub;
}

export default function LevelDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const levelId = params.id as string;

  const [level, setLevel] = useState<LevelData | null>(null);
  const [newSubLevelName, setNewSubLevelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLevelDetails = useCallback(async () => {
    if (!levelId) return;
    try {
      setError('');
      setLoading(true);
      const res = await fetch(`/api/levels/${levelId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to fetch level details: ${res.status}`);
      }
      const data = await res.json();
      setLevel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchLevelDetails();
    }
  }, [status, router, fetchLevelDetails]);

  const handleCreateSubLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubLevelName.trim() || !level) {
      setError('Level name cannot be empty.');
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSubLevelName,
          organizationId: level.organization.id,
          parentId: level.id, // Set current level as parent
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create sub-level');
      }

      setNewSubLevelName('');
      await fetchLevelDetails(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (loading || status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <p>Error: {error}</p>
        <Link href="/dashboard" className="mt-4 text-blue-500 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  if (!level) {
    return <div className="flex justify-center items-center min-h-screen"><p>Level not found.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          {' > '}
          <Link href={`/organization/${level.organization.id}`} className="hover:underline">{level.organization.name}</Link>
          {level.parent && (
            <>
              {' > ... > '}
              <Link href={`/level/${level.parent.id}`} className="hover:underline">{level.parent.name}</Link>
            </>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6">{level.name}</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Sub-Level</h2>
            <form onSubmit={handleCreateSubLevel} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newSubLevelName}
                onChange={(e) => setNewSubLevelName(e.target.value)}
                placeholder="Enter sub-level name"
                className="flex-grow p-2 border rounded-md"
              />
              <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600">
                Create Sub-Level
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Sub-Levels</h2>
            {level.children.length > 0 ? (
              <ul className="space-y-4">
                {level.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/level/${child.id}`} className="block p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors">
                      <p className="font-medium text-lg">{child.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No sub-levels created yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
