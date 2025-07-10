import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/levels/[id] - Fetches details for a single level, including its children
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const levelId = params.id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the level first to get its organizationId
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: { organizationId: true },
    });

    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    // Verify the user is a member of the organization to which the level belongs
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: level.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden. You are not a member of this organization.' }, { status: 403 });
    }

    // If authorized, fetch the full level details including children and parent for breadcrumbs
    const levelDetails = await prisma.level.findUnique({
      where: {
        id: levelId,
      },
      include: {
        children: {
          orderBy: {
            name: 'asc',
          },
        },
        parent: true, // Include parent for breadcrumb navigation
        organization: true, // Include organization for breadcrumbs
      },
    });

    return NextResponse.json(levelDetails, { status: 200 });

  } catch (error) {
    console.error(`Error fetching level ${levelId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch level details' }, { status: 500 });
  }
}
