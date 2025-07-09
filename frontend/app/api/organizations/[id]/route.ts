import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const organizationId = params.id;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, verify the user is a member of the organization to ensure authorization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden. You are not a member of this organization.' }, { status: 403 });
    }

    // If authorized, fetch the organization details along with its top-level levels
    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        levels: {
          where: {
            parentId: null, // Only fetch top-level levels
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization, { status: 200 });
  } catch (error) {
    console.error(`Error fetching organization ${organizationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch organization details' }, { status: 500 });
  }
}
