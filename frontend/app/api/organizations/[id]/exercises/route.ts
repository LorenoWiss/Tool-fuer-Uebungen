import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET /api/organizations/[id]/exercises
// Gets all exercises for a specific organization
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const organizationId = params.id;
  const userId = session.user.id;

  try {
    // First, verify the user is a member of the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!member) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
      });
    }

    // Fetch exercises for the organization
    const exercises = await prisma.exercise.findMany({
      where: {
        organizationId: organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}

// POST /api/organizations/[id]/exercises
// Creates a new exercise in an organization
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const organizationId = params.id;
  const userId = session.user.id;

  try {
    // Verify the user is an ADMIN of the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!member || member.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        status: 403,
      });
    }

    const { name, description } = await request.json();

    if (!name) {
      return new NextResponse(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
      });
    }

    const newExercise = await prisma.exercise.create({
      data: {
        name,
        description: description || null,
        organization: {
          connect: { id: organizationId },
        },
      },
    });

    return NextResponse.json(newExercise, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}






