import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const organizationId = params.id;
  const userId = session.user.id;

  try {
    // First, verify the user is a member of the organization to ensure authorization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId,
          userId: userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden. You are not a member of this organization.' }, { status: 403 });
    }

    // Fetch the organization details including all its levels for hierarchical display
    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        levels: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Return organization data along with the user's role
    return NextResponse.json({ ...organization, role: member.role }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching organization ${organizationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch organization details' }, { status: 500 });
  }
}
