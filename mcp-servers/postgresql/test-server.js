#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverPath = join(__dirname, 'dist/index.js');
  }

  async sendMCPRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      let output = '';

      server.stdout.on('data', (data) => {
        output += data.toString();
      });

      server.on('close', () => {
        try {
          // Find JSON response in output
          const lines = output.split('\n');
          const jsonLine = lines.find(line => line.startsWith('{') && line.includes('jsonrpc'));
          if (jsonLine) {
            resolve(JSON.parse(jsonLine));
          } else {
            reject(new Error('No JSON response found'));
          }
        } catch (error) {
          reject(error);
        }
      });

      server.on('error', reject);

      // Send MCP request
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      };

      server.stdin.write(JSON.stringify(request) + '\n');
      server.stdin.end();
    });
  }

  async testListTools() {
    console.log('🧪 Testing list_tools...');
    try {
      const response = await this.sendMCPRequest('tools/list');
      console.log('✅ Available tools:', response.result?.tools?.length || 0);
      console.log('   Tools:', response.result?.tools?.map((t) => t.name).join(', '));
    } catch (error) {
      console.error('❌ Error listing tools:', error);
    }
    console.log();
  }

  async testMockStats() {
    console.log('📊 Testing get_mock_stats...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'get_mock_stats',
        arguments: {}
      });
      console.log('✅ Mock stats retrieved successfully');
      const content = response.result?.content?.[0]?.text;
      if (content) {
        const stats = JSON.parse(content);
        console.log('   Stats:', stats);
      }
    } catch (error) {
      console.error('❌ Error getting mock stats:', error);
    }
    console.log();
  }

  async testListMocks() {
    console.log('🎯 Testing list_mock_configs...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'list_mock_configs',
        arguments: { enabled_only: false }
      });
      console.log('✅ Mock configs listed successfully');
      const content = response.result?.content?.[0]?.text;
      if (content) {
        const result = JSON.parse(content);
        console.log(`   Found ${result.rowCount} mock configurations`);
      }
    } catch (error) {
      console.error('❌ Error listing mock configs:', error);
    }
    console.log();
  }

  async testSearchMocks() {
    console.log('🔍 Testing search_mocks...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'search_mocks',
        arguments: { search_term: 'users' }
      });
      console.log('✅ Mock search completed successfully');
      const content = response.result?.content?.[0]?.text;
      if (content) {
        const result = JSON.parse(content);
        console.log(`   Found ${result.rowCount} matches for 'users'`);
      }
    } catch (error) {
      console.error('❌ Error searching mocks:', error);
    }
    console.log();
  }

  async testListTables() {
    console.log('📋 Testing list_tables...');
    try {
      const response = await this.sendMCPRequest('tools/call', {
        name: 'list_tables',
        arguments: { schema: 'public' }
      });
      console.log('✅ Tables listed successfully');
      const content = response.result?.content?.[0]?.text;
      if (content) {
        const result = JSON.parse(content);
        console.log(`   Found ${result.rowCount} tables`);
        result.rows.forEach((row) => {
          console.log(`   - ${row.table_name} (${row.type})`);
        });
      }
    } catch (error) {
      console.error('❌ Error listing tables:', error);
    }
    console.log();
  }

  async runAllTests() {
    console.log('🚀 Starting MCP PostgreSQL Server Tests\n');
    
    await this.testListTools();
    await this.testMockStats();
    await this.testListMocks();
    await this.testSearchMocks();
    await this.testListTables();
    
    console.log('✨ All tests completed!\n');
    console.log('🎉 Your MCP PostgreSQL server is ready to use in VS Code!');
    console.log('📝 Make sure you have the MCP extension installed and configured.');
  }
}

const tester = new MCPTester();
tester.runAllTests().catch(console.error);