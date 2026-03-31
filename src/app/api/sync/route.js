import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Tournament, Team, Match } from '@/lib/db/models';

export async function POST(request) {
  try {
    await connectDB();
    const { items } = await request.json();

    const results = [];

    for (const item of items) {
      try {
        switch (item.type) {
          case 'tournament':
            if (item.action === 'create') {
              const tournament = await Tournament.create(item.data);
              results.push({ id: item.id, success: true, serverId: tournament._id });
            } else if (item.action === 'update') {
              await Tournament.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          case 'team':
            if (item.action === 'create') {
              const team = await Team.create(item.data);
              results.push({ id: item.id, success: true, serverId: team._id });
            } else if (item.action === 'update') {
              await Team.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          case 'match':
            if (item.action === 'update') {
              await Match.findByIdAndUpdate(item.data._id, item.data);
              results.push({ id: item.id, success: true });
            }
            break;

          default:
            results.push({ id: item.id, success: false, error: 'Unknown type' });
        }
      } catch (err) {
        results.push({ id: item.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
