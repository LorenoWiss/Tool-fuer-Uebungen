'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  ownerId: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (status === 'authenticated') {
      fetchOrganizations();
    }
  }, [status, router]);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (!res.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const data = await res.json();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newOrgName.trim()) {
      setError('Organization name cannot be empty.');
      return;
    }

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newOrgName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }

      setNewOrgName('');
      await fetchOrganizations(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }

  if (!session) {
    return null; // Redirect is handled by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p>Welcome, {session.user?.name || session.user?.email}!</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
          <form onSubmit={handleCreateOrganization} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="flex-grow p-2 border rounded-md"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Create
            </button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Organizations</h2>
          {organizations.length > 0 ? (
            <ul className="space-y-4">
              {organizations.map((org) => (
                <li key={org.id}>
                  <Link href={`/organization/${org.id}`} className="block p-4 border rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors">
                    <p className="font-medium text-lg">{org.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>You are not a member of any organization yet. Create one to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
}
