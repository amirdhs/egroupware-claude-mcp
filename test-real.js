#!/usr/bin/env node

/**
 * Simple test client for EGroupware MCP Server
 */

import { spawn } from 'child_process';

// Start the MCP server
const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Helper function to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params
  };
  
  const message = JSON.stringify(request) + '\n';
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
          console.log('Content:', parsed.result.content[0].text);
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON output
      }
    }
  });
});

// Wait a bit for server to start, then send test requests
setTimeout(() => {
  console.log('\n=== Testing EGroupware MCP Server ===\n');
  
  // Test 1: Initialize
  sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  });
  
  // Test 2: List tools
  setTimeout(() => {
    sendRequest('tools/list');
  }, 100);
  
  // Test 3: Create a test contact
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'create_contact',
      arguments: {
        first_name: 'Test',
        last_name: 'User',
        email: 'test.user@example.com',
        company: 'Test Company'
      }
    });
  }, 200);
  
  // Test 4: Search contacts
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'search_contacts',
      arguments: {
        query: 'Test',
        limit: 5
      }
    });
  }, 300);
  
  // Exit after tests
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 2000);
  
}, 100);

// Handle server exit
server.on('exit', (code) => {
  console.log(`\nServer exited with code ${code}`);
});
