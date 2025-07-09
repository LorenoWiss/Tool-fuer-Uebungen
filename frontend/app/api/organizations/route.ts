import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/organizations - Fetches organizations for the logged-in user
export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const organizationMemberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        organization: true, // Include the full organization details
      },
    });

    const organizations = organizationMemberships.map((m) => m.organization);

    return NextResponse.json(organizations, { status: 200 });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST /api/organizations - Creates a new organization
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
  }

  try {
    const newOrganization = await prisma.$transaction(async (tx) => {
      // 1. Create the organization
      const organization = await tx.organization.create({
        data: {
          name,
          ownerId: session.user.id,
        },
      });

      // 2. Add the creator as the first admin member
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: session.user.id,
          role: 'ADMIN',
        },
      });

      return organization;
    });

    return NextResponse.json(newOrganization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
