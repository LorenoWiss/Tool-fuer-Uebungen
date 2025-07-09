import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/levels - Creates a new level in an organization
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, organizationId, parentId } = await req.json();

  if (!name || !organizationId) {
    return NextResponse.json({ error: 'Missing required fields: name and organizationId' }, { status: 400 });
  }

  try {
    // Verify user is an ADMIN of the organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You must be an admin to create levels.' }, { status: 403 });
    }

    // Create the new level
    const newLevel = await prisma.level.create({
      data: {
        name,
        organizationId,
        parentId: parentId || null, // parentId is optional
      },
    });

    return NextResponse.json(newLevel, { status: 201 });
  } catch (error) {
    console.error('Error creating level:', error);
    return NextResponse.json({ error: 'Failed to create level' }, { status: 500 });
  }
}
