import { NextRequest, NextResponse } from 'next/server';
import { getMockConfigs } from '../config/route';

// Este endpoint maneja todas las rutas dinámicas /api/mock/[...path]
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(request, params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(request, params, 'PATCH');
}

async function handleMockRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Construir la ruta completa
    const fullPath = `/api/mock/${params.path.join('/')}`;
    
    // Obtener configuraciones de mock (ahora es async)
    const mockConfigs = await getMockConfigs();
    
    // Buscar configuración que coincida
    const matchingConfig = mockConfigs.find(config => 
      config.endpoint === fullPath && 
      config.method === method && 
      config.enabled
    );

    if (!matchingConfig) {
      return NextResponse.json(
        { 
          error: 'Mock endpoint not found',
          message: `No mock configuration found for ${method} ${fullPath}`,
          hint: 'Check your Mock Configuration panel to set up this endpoint'
        },
        { status: 404 }
      );
    }

    // Simular delay si está configurado
    if (matchingConfig.delay && matchingConfig.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, matchingConfig.delay));
    }

    // Preparar headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Mock-Endpoint': 'true',
      'X-Mock-Id': matchingConfig.id,
      ...matchingConfig.headers
    };

    // Log de la request para debugging
    console.log(`🎭 Mock API called: ${method} ${fullPath}`, {
      configId: matchingConfig.id,
      statusCode: matchingConfig.statusCode,
      delay: matchingConfig.delay
    });

    return NextResponse.json(
      matchingConfig.response,
      { 
        status: matchingConfig.statusCode,
        headers: responseHeaders
      }
    );

  } catch (error) {
    console.error('Mock API Error:', error);
    return NextResponse.json(
      { 
        error: 'Mock API internal error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}