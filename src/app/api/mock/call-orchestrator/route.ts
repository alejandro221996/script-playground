import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🎭 Mock Call Orchestrator - Request recibida:', JSON.stringify(body, null, 2));
    
    // Simular respuesta exitosa del Call Orchestrator
    const mockResponse = {
      success: true,
      call_id: `mock_call_${Date.now()}`,
      status: 'queued',
      message: 'Call successfully queued for processing',
      estimated_start_time: new Date(Date.now() + 5000).toISOString(), // 5 segundos
      queue_position: Math.floor(Math.random() * 10) + 1,
      metadata: {
        hubspot_flow: body.hubspot_flow,
        phone_number: body.phone_number,
        record_id: body.record_id,
        timestamp: new Date().toISOString()
      }
    };
    
    // Simular delay realista
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('✅ Mock Call Orchestrator - Respuesta enviada:', mockResponse);
    
    return NextResponse.json(mockResponse, { status: 200 });
  } catch (error) {
    console.error('❌ Error in Mock Call Orchestrator:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Mock Call Orchestrator internal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// También manejar GET requests para testing
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Mock Call Orchestrator endpoint is active',
    endpoints: {
      POST: 'Queue a new call',
      GET: 'Check endpoint status'
    },
    timestamp: new Date().toISOString()
  });
}