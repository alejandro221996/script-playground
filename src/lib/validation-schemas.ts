import { z } from 'zod';

// Schema para la ejecución de scripts
export const ExecuteScriptSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000, 'Code too long'),
  envVariables: z.record(z.string()).optional().default({}),
  testData: z.record(z.any()).optional().default({}),
  undefinedVariables: z.record(z.any()).optional().default({})
});

// Schema para configuración de mocks
export const MockConfigSchema = z.object({
  name: z.string().optional(),
  endpoint: z.string().min(1, 'Endpoint is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  response: z.any(),
  statusCode: z.number().int().min(100).max(599).default(200),
  headers: z.record(z.string()).optional().default({}),
  delay: z.number().int().min(0).max(10000).optional().default(0),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

// Schema para variables de entorno
export const EnvironmentVariableSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid environment variable name'),
  value: z.string(),
  description: z.string().optional(),
  isSecret: z.boolean().default(false)
});

// Schema para datos de prueba
export const TestDataSchema = z.object({
  phone: z.string().optional(),
  opportunityId: z.string().optional(),
  contactId: z.string().optional(),
  firstname: z.string().optional(),
  program: z.string().optional(),
  email: z.string().email().optional(),
  country: z.string().optional(),
  date_of_birth: z.number().optional(),
  start_date_1: z.number().optional(),
  code_start_date_1: z.string().optional(),
  start_date_2: z.number().optional(),
  code_start_date_2: z.string().optional(),
  start_date_3: z.number().optional(),
  code_start_date_3: z.string().optional(),
  tier_value1_4: z.string().optional(),
  tier_value5_12: z.string().optional(),
  product_key: z.string().optional(),
  source: z.string().optional(),
  rvoe: z.string().optional(),
  voicebot_phone_number: z.string().optional()
});

// Función helper para validar datos
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}
