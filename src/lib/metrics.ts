interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private maxMetrics = 1000; // Límite para evitar memory leaks

  private addMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metrics.push(metric);

    // Mantener solo las métricas más recientes
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // En desarrollo, log las métricas
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value}`, tags);
    }
  }

  // Métricas de performance
  timing(name: string, duration: number, tags?: Record<string, string>) {
    this.addMetric(`timing.${name}`, duration, tags);
  }

  // Contadores
  increment(name: string, tags?: Record<string, string>) {
    this.addMetric(`counter.${name}`, 1, tags);
  }

  // Gauges (valores instantáneos)
  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.addMetric(`gauge.${name}`, value, tags);
  }

  // Métricas específicas de la aplicación
  scriptExecution(duration: number, success: boolean, scriptType?: string) {
    this.timing('script_execution', duration, {
      success: success.toString(),
      script_type: scriptType || 'unknown'
    });
    
    this.increment('script_executions_total', {
      success: success.toString(),
      script_type: scriptType || 'unknown'
    });
  }

  apiRequest(method: string, path: string, duration: number, status: number) {
    this.timing('api_request', duration, {
      method,
      path,
      status: status.toString()
    });
    
    this.increment('api_requests_total', {
      method,
      path,
      status_class: `${Math.floor(status / 100)}xx`
    });
  }

  databaseQuery(operation: string, duration: number, success: boolean) {
    this.timing('database_query', duration, {
      operation,
      success: success.toString()
    });
  }

  // Obtener métricas para dashboard
  getMetrics(since?: number): Metric[] {
    const sinceTimestamp = since || (Date.now() - 60000); // Últimos 60 segundos por defecto
    return this.metrics.filter(m => m.timestamp >= sinceTimestamp);
  }

  // Obtener estadísticas agregadas
  getStats(metricName: string, since?: number): {
    count: number;
    avg: number;
    min: number;
    max: number;
    sum: number;
  } {
    const metrics = this.getMetrics(since).filter(m => m.name === metricName);
    
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, sum: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      sum
    };
  }

  // Limpiar métricas antiguas
  cleanup(olderThan: number = 3600000) { // 1 hora por defecto
    const cutoff = Date.now() - olderThan;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }
}

export const metrics = new MetricsCollector();

// Hook para medir tiempo de ejecución
export function measureTime<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>
): T | Promise<T> {
  const start = Date.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          metrics.timing(name, Date.now() - start, { ...tags, success: 'true' });
          return value;
        })
        .catch(error => {
          metrics.timing(name, Date.now() - start, { ...tags, success: 'false' });
          throw error;
        });
    } else {
      metrics.timing(name, Date.now() - start, { ...tags, success: 'true' });
      return result;
    }
  } catch (error) {
    metrics.timing(name, Date.now() - start, { ...tags, success: 'false' });
    throw error;
  }
}

// Middleware para métricas de API
export function withMetrics<T extends any[], R>(
  name: string,
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    return measureTime(name, () => handler(...args));
  };
}
