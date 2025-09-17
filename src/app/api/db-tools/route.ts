// API Route para herramientas de base de datos integradas
import { NextResponse } from 'next/server';
import DatabaseTools from '@/lib/database-tools';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');

  try {
    switch (action) {
      case 'health':
        const health = await DatabaseTools.healthCheck();
        return NextResponse.json(health);

      case 'stats':
        const stats = await DatabaseTools.getMockStats();
        return NextResponse.json(stats);

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required for search' }, { status: 400 });
        }
        const results = await DatabaseTools.searchMocks(query);
        return NextResponse.json({ results });

      case 'all':
        const all = await DatabaseTools.getAllMocks();
        return NextResponse.json({ mocks: all });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Database tools error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, data, ...params } = await request.json();

    switch (action) {
      case 'create':
        const created = await DatabaseTools.createMock(data);
        return NextResponse.json({ mock: created });

      case 'update':
        if (!params.id) {
          return NextResponse.json({ error: 'ID required for update' }, { status: 400 });
        }
        const updated = await DatabaseTools.updateMock(params.id, data);
        return NextResponse.json({ mock: updated });

      case 'delete':
        if (!params.id) {
          return NextResponse.json({ error: 'ID required for delete' }, { status: 400 });
        }
        const deleted = await DatabaseTools.deleteMock(params.id);
        return NextResponse.json({ success: deleted });

      case 'query':
        if (!params.sql) {
          return NextResponse.json({ error: 'SQL query required' }, { status: 400 });
        }
        const result = await DatabaseTools.executeQuery(params.sql);
        return NextResponse.json(result);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Database tools error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}