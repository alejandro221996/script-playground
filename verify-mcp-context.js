#!/usr/bin/env node

/**
 * Script de verificación MCP para Script Playground
 * Verifica que el servidor MCP esté correctamente configurado como contexto
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPContextVerifier {
  constructor() {
    this.projectRoot = process.cwd(); // Use current working directory
    this.mcpServerPath = join(this.projectRoot, 'mcp-servers/postgresql/dist/index.js');
  }

  async verifyFiles() {
    console.log('🔍 Verificando archivos de configuración...\n');
    
    const requiredFiles = [
      'script-playground.code-workspace',
      '.vscode/settings.json',
      '.vscode/mcp-settings.json', 
      '.vscode/MCP_CONTEXT_GUIDE.md',
      'mcp-servers/postgresql/dist/index.js',
      'mcp-servers/postgresql/package.json'
    ];

    let allExists = true;
    
    for (const file of requiredFiles) {
      const filePath = join(this.projectRoot, file);
      const exists = existsSync(filePath);
      console.log(`${exists ? '✅' : '❌'} ${file} ${!exists ? '(not found at: ' + filePath + ')' : ''}`);
      if (!exists) allExists = false;
    }

    console.log();
    return allExists;
  }

  async testMCPConnection() {
    console.log('🔗 Probando conexión MCP...\n');
    
    return new Promise((resolve, reject) => {
      const server = spawn('node', [this.mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.projectRoot
      });

      let output = '';
      let errorOutput = '';

      server.stdout.on('data', (data) => {
        output += data.toString();
      });

      server.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Send test request
      const testRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      };

      server.stdin.write(JSON.stringify(testRequest) + '\n');
      server.stdin.end();

      setTimeout(() => {
        server.kill();
        
        if (output.includes('"tools"') && output.includes('list_mock_configs')) {
          console.log('✅ Servidor MCP responde correctamente');
          console.log('✅ Herramientas de mock disponibles');
          resolve(true);
        } else if (errorOutput) {
          console.log('❌ Error en servidor MCP:', errorOutput);
          resolve(false);
        } else {
          console.log('❌ Servidor MCP no responde correctamente');
          resolve(false);
        }
      }, 3000);
    });
  }

  async testDatabaseConnection() {
    console.log('🗄️  Probando conexión a base de datos...\n');
    
    return new Promise((resolve, reject) => {
      const server = spawn('node', [this.mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.projectRoot
      });

      let output = '';
      let errorOutput = '';

      server.stdout.on('data', (data) => {
        output += data.toString();
      });

      server.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Test database query
      const dbTestRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_mock_stats",
          arguments: {}
        }
      };

      server.stdin.write(JSON.stringify(dbTestRequest) + '\n');
      server.stdin.end();

      setTimeout(() => {
        server.kill();
        
        if (output.includes('total_configs') || output.includes('rowCount')) {
          console.log('✅ Conexión a PostgreSQL exitosa');
          console.log('✅ Datos de mock accesibles');
          resolve(true);
        } else {
          console.log('❌ Error conectando a PostgreSQL');
          if (errorOutput) console.log('Error:', errorOutput);
          resolve(false);
        }
      }, 5000);
    });
  }

  generateReport(filesOk, mcpOk, dbOk) {
    console.log('\n' + '='.repeat(50));
    console.log('📋 REPORTE DE VERIFICACIÓN MCP CONTEXT');
    console.log('='.repeat(50));
    
    console.log(`\n🗂️  Archivos de configuración: ${filesOk ? '✅ OK' : '❌ ERROR'}`);
    console.log(`🔗 Servidor MCP: ${mcpOk ? '✅ OK' : '❌ ERROR'}`);
    console.log(`🗄️  Base de datos PostgreSQL: ${dbOk ? '✅ OK' : '❌ ERROR'}`);
    
    if (filesOk && mcpOk && dbOk) {
      console.log('\n🎉 ¡TODO CONFIGURADO CORRECTAMENTE!');
      console.log('\n📝 Para usar el contexto MCP:');
      console.log('   1. Abre VS Code con: script-playground.code-workspace');
      console.log('   2. En Copilot Chat usa: @postgresql-script-playground');
      console.log('   3. Ejemplo: @postgresql-script-playground get_mock_stats');
      console.log('\n📖 Ver guía completa en: .vscode/MCP_CONTEXT_GUIDE.md');
    } else {
      console.log('\n⚠️  PROBLEMAS DETECTADOS:');
      if (!filesOk) console.log('   - Faltan archivos de configuración');
      if (!mcpOk) console.log('   - Servidor MCP no responde');
      if (!dbOk) console.log('   - No se puede conectar a PostgreSQL');
    }
    
    console.log('\n' + '='.repeat(50));
  }

  async runVerification() {
    console.log('🚀 Script Playground - Verificación MCP Context\n');
    
    const filesOk = await this.verifyFiles();
    const mcpOk = await this.testMCPConnection();
    const dbOk = await this.testDatabaseConnection();
    
    this.generateReport(filesOk, mcpOk, dbOk);
    
    return filesOk && mcpOk && dbOk;
  }
}

// Ejecutar verificación
const verifier = new MCPContextVerifier();
verifier.runVerification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error durante verificación:', error);
    process.exit(1);
  });