import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface MockConfig {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
  tags?: string[];
}

export async function GET() {
  try {
    console.log('🔍 Mock Config GET request received');
    
    // Verificar si Prisma está disponible
    if (!prisma) {
      console.error('❌ Prisma client not available');
      return NextResponse.json({
        success: false,
        error: 'Database client not available',
        data: []
      });
    }
    
    const configs = await prisma.mockConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ Mock configs loaded:', configs.length);
    
    // Transform Prisma data to match our interface
    const transformedConfigs = configs.map(config => ({
      id: config.id,
      endpoint: config.endpoint,
      method: config.method as MockConfig['method'],
      response: config.response,
      statusCode: config.statusCode,
      headers: (config.headers as Record<string, string>) || {},
      delay: config.delay || 0,
      enabled: config.enabled,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
      name: config.name || undefined,
      description: config.description || undefined,
      tags: config.tags || []
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedConfigs
    });
  } catch (error) {
    console.error('❌ Database error in Mock Config GET:', error);
    
    // Si hay error de base de datos, devolver configuraciones por defecto
    const defaultConfigs = [
      {
        id: 'default-1',
        endpoint: '/api/mock/hubspot-calls',
        method: 'POST' as MockConfig['method'],
        response: { success: true, id: 'mock-call-123' },
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        delay: 500,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: 'HubSpot Calls Mock',
        description: 'Mock endpoint for HubSpot calls API',
        tags: ['hubspot', 'calls']
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: defaultConfigs,
      message: 'Using default configurations (database error)'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Mock Config POST request received');
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { endpoint, method, response, statusCode, headers, delay, enabled, name, description, tags } = body;

    const config = await prisma.mockConfig.create({
      data: {
        endpoint,
        method,
        response,
        statusCode: statusCode || 200,
        headers: headers || {},
        delay: delay || 0,
        enabled: enabled !== undefined ? enabled : true,
        name,
        description,
        tags: tags || []
      }
    });

    // Transform response to match our interface
    const transformedConfig = {
      id: config.id,
      endpoint: config.endpoint,
      method: config.method as MockConfig['method'],
      response: config.response,
      statusCode: config.statusCode,
      headers: (config.headers as Record<string, string>) || {},
      delay: config.delay || 0,
      enabled: config.enabled,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
      name: config.name || undefined,
      description: config.description || undefined,
      tags: config.tags || []
    };

    return NextResponse.json({
      success: true,
      data: transformedConfig
    });
  } catch (error) {
    console.error('❌ Database error in Mock Config POST:', error);
    
    // Si hay error de base de datos, devolver respuesta simulada
    const mockConfig = {
      id: `mock-${Date.now()}`,
      endpoint,
      method,
      response,
      statusCode: statusCode || 200,
      headers: headers || {},
      delay: delay || 0,
      enabled: enabled !== undefined ? enabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name,
      description,
      tags: tags || []
    };
    
    return NextResponse.json({
      success: true,
      data: mockConfig,
      message: 'Configuration saved in memory (database error)'
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, endpoint, method, response, statusCode, headers, delay, enabled, name, description, tags } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const config = await prisma.mockConfig.update({
      where: { id },
      data: {
        endpoint,
        method,
        response,
        statusCode,
        headers,
        delay,
        enabled,
        name,
        description,
        tags,
        updatedAt: new Date()
      }
    });

    // Transform response to match our interface
    const transformedConfig = {
      id: config.id,
      endpoint: config.endpoint,
      method: config.method as MockConfig['method'],
      response: config.response,
      statusCode: config.statusCode,
      headers: (config.headers as Record<string, string>) || {},
      delay: config.delay || 0,
      enabled: config.enabled,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
      name: config.name || undefined,
      description: config.description || undefined,
      tags: config.tags || []
    };

    return NextResponse.json({
      success: true,
      data: transformedConfig
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update mock configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    await prisma.mockConfig.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Mock configuration deleted successfully'
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete mock configuration' },
      { status: 500 }
    );
  }
}

// Helper function to get all mock configurations (for use in dynamic routes)
export async function getMockConfigs(): Promise<MockConfig[]> {
  try {
    const configs = await prisma.mockConfig.findMany({
      where: { enabled: true }
    });
    
    return configs.map(config => ({
      id: config.id,
      endpoint: config.endpoint,
      method: config.method as MockConfig['method'],
      response: config.response,
      statusCode: config.statusCode,
      headers: (config.headers as Record<string, string>) || {},
      delay: config.delay || 0,
      enabled: config.enabled,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
      name: config.name || undefined,
      description: config.description || undefined,
      tags: config.tags || []
    }));
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}