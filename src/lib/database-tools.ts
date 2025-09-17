// Database Tools - Integración directa de herramientas de base de datos
// Replicar funcionalidad MCP pero integrada en la app

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MockConfig {
  id: string;
  endpoint: string;
  method: string;
  response: any;
  statusCode: number;
  headers?: Record<string, string>;
  delay?: number;
  enabled: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseTools {
  /**
   * Ejecutar query SQL directamente
   */
  static async executeQuery(query: string): Promise<any> {
    try {
      const result = await prisma.$queryRawUnsafe(query);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de mocks
   */
  static async getMockStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byMethod: Record<string, number>;
    recentlyCreated: number;
  }> {
    try {
      const configs = await prisma.mockConfig.findMany();
      
      const stats = {
        total: configs.length,
        enabled: configs.filter(c => c.enabled).length,
        disabled: configs.filter(c => !c.enabled).length,
        byMethod: {} as Record<string, number>,
        recentlyCreated: 0
      };

      // Contar por método
      configs.forEach(config => {
        stats.byMethod[config.method] = (stats.byMethod[config.method] || 0) + 1;
      });

      // Contar creados en últimos 7 días
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      stats.recentlyCreated = configs.filter(c => c.createdAt > weekAgo).length;

      return stats;
    } catch (error) {
      console.error('Error getting mock stats:', error);
      return {
        total: 0,
        enabled: 0,
        disabled: 0,
        byMethod: {},
        recentlyCreated: 0
      };
    }
  }

  /**
   * Buscar mocks por texto
   */
  static async searchMocks(searchTerm: string): Promise<MockConfig[]> {
    try {
      const configs = await prisma.mockConfig.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { endpoint: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } }
          ]
        }
      });

      return configs as MockConfig[];
    } catch (error) {
      console.error('Error searching mocks:', error);
      return [];
    }
  }

  /**
   * Obtener todos los mocks
   */
  static async getAllMocks(): Promise<MockConfig[]> {
    try {
      const configs = await prisma.mockConfig.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return configs as MockConfig[];
    } catch (error) {
      console.error('Error getting all mocks:', error);
      return [];
    }
  }

  /**
   * Obtener mock por endpoint y método
   */
  static async getMockByEndpoint(endpoint: string, method: string): Promise<MockConfig | null> {
    try {
      const config = await prisma.mockConfig.findFirst({
        where: {
          endpoint,
          method,
          enabled: true
        }
      });
      return config as MockConfig | null;
    } catch (error) {
      console.error('Error getting mock by endpoint:', error);
      return null;
    }
  }

  /**
   * Crear nuevo mock
   */
  static async createMock(data: Omit<MockConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<MockConfig | null> {
    try {
      const config = await prisma.mockConfig.create({
        data: {
          ...data,
          response: JSON.stringify(data.response),
          headers: data.headers ? JSON.stringify(data.headers) : null,
          tags: data.tags || []
        }
      });
      return config as MockConfig;
    } catch (error) {
      console.error('Error creating mock:', error);
      return null;
    }
  }

  /**
   * Actualizar mock existente
   */
  static async updateMock(id: string, data: Partial<MockConfig>): Promise<MockConfig | null> {
    try {
      const config = await prisma.mockConfig.update({
        where: { id },
        data: {
          ...data,
          response: data.response ? JSON.stringify(data.response) : undefined,
          headers: data.headers ? JSON.stringify(data.headers) : undefined,
          updatedAt: new Date()
        }
      });
      return config as MockConfig;
    } catch (error) {
      console.error('Error updating mock:', error);
      return null;
    }
  }

  /**
   * Eliminar mock
   */
  static async deleteMock(id: string): Promise<boolean> {
    try {
      await prisma.mockConfig.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error deleting mock:', error);
      return false;
    }
  }

  /**
   * Verificar salud de la conexión
   */
  static async healthCheck(): Promise<{ healthy: boolean; message: string; timestamp: Date }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        healthy: true,
        message: 'Database connection is healthy',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Limpiar conexiones al cerrar
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export para uso fácil
export default DatabaseTools;