#!/usr/bin/env node

/**
 * Test EGroupware MCP Server with one operation at a time
 */

import { spawn } from 'child_process';

// Start the MCP server
const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let testStep = 0;

// Helper function to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params
  };
  
  const message = JSON.stringify(request) + '\n';
  console.log(`\n=== Step ${++testStep}: ${method} ===`);
  console.log('Sending:', message.trim());
  server.stdin.write(message);
}

// Listen for responses
server.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n');
  responses.forEach(response => {
    if (response) {
      console.log('Received:', response);
      try {
        const parsed = JSON.parse(response);
        if (parsed.result && parsed.result.content) {
          console.log('✅ Success:', parsed.result.content[0].text);
        } else if (parsed.error) {
          console.log('❌ Error:', parsed.error.message);
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON output
      }
    }
  });
});

// Sequential test execution
setTimeout(() => {
  console.log('\n🚀 Starting EGroupware MCP Server Tests\n');
  
  // Test 1: Initialize
  sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "test-client", version: "1.0.0" }
  });
  
  // Test 2: List tools (after init)
  setTimeout(() => {
    sendRequest('tools/list');
  }, 500);
  
  // Test 3: Create contact (after tools list)
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'create_contact',
      arguments: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        company: 'Test Company'
      }
    });
  }, 1000);
  
  // Test 4: Search contacts (after contact creation)
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'search_contacts',
      arguments: {
        query: 'John',
        limit: 5
      }
    });
  }, 2000);
  
  // Test 5: Create calendar event
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'create_calendar_event',
      arguments: {
        title: 'Test Meeting',
        date: 'tomorrow',
        time: '14:30',
        duration: 60,
        location: 'Conference Room A'
      }
    });
  }, 3000);
  
  // Exit after all tests
  setTimeout(() => {
    console.log('\n✅ All tests completed!');
    server.kill();
    process.exit(0);
  }, 5000);
  
}, 100);

// Handle server exit
server.on('exit', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
});
