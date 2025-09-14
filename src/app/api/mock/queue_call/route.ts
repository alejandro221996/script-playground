import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Obtener los datos enviados
    const requestData = await request.json();
    
    console.log('🎭 Mock Call Orchestrator queue_call - Request recibida:', JSON.stringify(requestData, null, 2));
    
    // Simular un pequeño delay como una API real
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Respuesta mock más realista para Retell AI
    const mockResponse = {
      success: true,
      call_id: `retell_call_${Date.now()}`,
      status: 'queued',
      message: 'Voicebot call successfully queued',
      queue_info: {
        position: Math.floor(Math.random() * 5) + 1,
        estimated_start_time: new Date(Date.now() + 15000).toISOString(),
        priority: 'normal'
      },
      call_details: {
        hubspot_flow: requestData.hubspot_flow,
        phone_number: requestData.phone_number,
        record_id: requestData.record_id,
        from_number: requestData.payload?.from_number,
        to_number: requestData.payload?.to_number
      },
      ai_config: {
        model: 'gpt-4-turbo',
        voice: 'mexican_spanish_professional',
        dynamic_variables: Object.keys(requestData.payload?.retell_llm_dynamic_variables || {}).length
      },
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'Mock Retell AI Orchestrator',
        version: '1.0.0'
      }
    };
        record_id: requestData.record_id,
        hubspot_flow: requestData.hubspot_flow
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Mock API queue_call responde:', mockResponse);
    
    return NextResponse.json(mockResponse, { status: 200 });
    
  } catch (error) {
    console.error('❌ Error en Mock API queue_call:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    );
  }
}