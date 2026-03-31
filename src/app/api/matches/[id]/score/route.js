import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Match } from '@/lib/db/models';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const event = await request.json();

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    match.events.push({
      ...event,
      timestamp: new Date(),
    });

    await match.save();

    return NextResponse.json({ success: true, event });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
