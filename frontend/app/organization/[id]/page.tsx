'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LevelItem from '@/components/LevelItem';

interface Level {
  id: string;
  name: string;
  parentId: string | null;
  children: Level[];
}

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED';
}

interface OrganizationData {
  id: string;
  name: string;
  ownerId: string;
  levels: Level[];
  role: 'ADMIN' | 'MEMBER';
  exercises: Exercise[];
}

export default function OrganizationDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [parentLevelId, setParentLevelId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrganizationDetails = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      setLoading(true);
      const [orgData, exercisesData] = await Promise.all([
        fetch(`/api/organizations/${id}`),
        fetch(`/api/organizations/${id}/exercises`),
      ]);
      if (!orgData.ok || !exercisesData.ok) {
        const errorData = await orgData.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch organization details with status: ${orgData.status}`);
      }
      const data = await orgData.json();
      const exercises = await exercisesData.json();
      setOrganization({ ...data, exercises });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      fetchOrganizationDetails();
    }
  }, [status, id, router, fetchOrganizationDetails]);

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) {
      setError('Level name cannot be empty.');
      return;
    }

    try {
      setError('');
      const res = await fetch(`/api/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLevelName, parentId: parentLevelId, organizationId: id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create level');
      }

      setNewLevelName('');
      setParentLevelId(null);
      await fetchOrganizationDetails(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) {
      setError('Exercise name cannot be empty.');
      return;
    }

    try {
      setError('');
      const newExercise = await fetch(`/api/organizations/${id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: exerciseName, description: exerciseDescription }),
      });

      if (!newExercise.ok) {
        const errorData = await newExercise.json();
        throw new Error(errorData.error || 'Failed to create exercise');
      }

      const exercise = await newExercise.json();
      setOrganization((prevOrganization) => prevOrganization ? { ...prevOrganization, exercises: [exercise, ...prevOrganization.exercises] } : null);
      setExerciseName('');
      setExerciseDescription('');
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

  const buildLevelTree = (levels: Level[]): Level[] => {
    const levelMap: { [key: string]: Level & { children: Level[] } } = {};
    const tree: Level[] = [];

    levels.forEach(level => {
      levelMap[level.id] = { ...level, children: [] };
    });

    levels.forEach(level => {
      if (level.parentId) {
        levelMap[level.parentId]?.children.push(levelMap[level.id]);
      } else {
        tree.push(levelMap[level.id]);
      }
    });

    return tree;
  };

  const levelTree = buildLevelTree(organization.levels);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-500 hover:underline">&larr; Back to Dashboard</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6">{organization.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Levels Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-3">Levels</h2>
              <div className="bg-white p-4 rounded shadow">
                {levelTree.length > 0 ? (
                  <ul className="space-y-2">
                    {levelTree.map((level) => (
                      <LevelItem key={level.id} level={level} />
                    ))}
                  </ul>
                ) : (
                  <p>No levels created yet.</p>
                )}
              </div>
              {organization.role === 'ADMIN' && (
                <form onSubmit={handleCreateLevel} className="bg-white p-4 rounded shadow mt-4">
                  <h3 className="text-xl font-semibold mb-2">Create New Level</h3>
                  <div className="mb-4">
                    <label htmlFor="levelName" className="block text-sm font-medium text-gray-700">Level Name</label>
                    <input
                      type="text"
                      id="levelName"
                      value={newLevelName}
                      onChange={(e) => setNewLevelName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="parentLevel" className="block text-sm font-medium text-gray-700">Parent Level (optional)</label>
                    <select
                      id="parentLevel"
                      value={parentLevelId || ''}
                      onChange={(e) => setParentLevelId(e.target.value || null)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black p-2"
                    >
                      <option value="">None (Top Level)</option>
                      {organization.levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Create Level
                  </button>
                </form>
              )}
            </section>

            {/* Exercises Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-3">Exercises</h2>
              <div className="bg-white p-4 rounded shadow">
                {organization.exercises.length > 0 ? (
                  <ul>
                    {organization.exercises.map((exercise) => (
                      <li key={exercise.id} className="border-b last:border-b-0 py-2">
                        <h4 className="font-bold">{exercise.name}</h4>
                        <p className="text-sm text-gray-600">{exercise.description}</p>
                        <span
                          className={`text-xs font-semibold uppercase bg-gray-200 text-gray-800 px-2 py-1 rounded-full ${
                            exercise.status === 'PLANNED'
                              ? 'bg-yellow-200 text-yellow-800'
                              : exercise.status === 'ONGOING'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-green-200 text-green-800'
                          }`}
                        >
                          {exercise.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No exercises created yet.</p>
                )}
              </div>
              {organization.role === 'ADMIN' && (
                <form onSubmit={handleCreateExercise} className="bg-white p-4 rounded shadow mt-4">
                  <h3 className="text-xl font-semibold mb-2">Create New Exercise</h3>
                  <div className="mb-4">
                    <label htmlFor="exerciseName" className="block text-sm font-medium text-gray-700">
                      Exercise Name
                    </label>
                    <input
                      type="text"
                      id="exerciseName"
                      value={exerciseName}
                      onChange={(e) => setExerciseName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black p-2"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="exerciseDescription" className="block text-sm font-medium text-gray-700">
                      Description (optional)
                    </label>
                    <textarea
                      id="exerciseDescription"
                      value={exerciseDescription}
                      onChange={(e) => setExerciseDescription(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black p-2"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Create Exercise
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
