'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Level {
  id: string;
  name: string;
}

interface OrganizationData {
  id: string;
  name: string;
  levels: Level[];
}

export default function OrganizationDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrganizationDetails = async () => {
    if (!orgId) return;
    try {
      setError('');
      setLoading(true);
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to fetch organization details with status: ${res.status}`);
      }
      const data = await res.json();
      setOrganization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchOrganizationDetails();
    }
  }, [status, orgId]);

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) {
      setError('Level name cannot be empty.');
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLevelName, organizationId: orgId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create level');
      }

      setNewLevelName('');
      await fetchOrganizationDetails(); // Refresh data
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

  if (!organization) {
    return <div className="flex justify-center items-center min-h-screen"><p>Organization not found.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-500 hover:underline">&larr; Back to Dashboard</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6">{organization.name}</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Top-Level</h2>
            <form onSubmit={handleCreateLevel} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                placeholder="Enter level name (e.g., Department, Team)"
                className="flex-grow p-2 border rounded-md"
              />
              <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600">
                Create Level
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Top-Levels</h2>
            {organization.levels.length > 0 ? (
              <ul className="space-y-4">
                {organization.levels.map((level) => (
                  <li key={level.id} className="p-4 border rounded-md shadow-sm bg-white">
                    <p className="font-medium text-lg">{level.name}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No top-levels created yet. Add one to get started.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
