#!/usr/bin/env node

/**
 * Simple test for EGroupware GroupDAV connection
 */

import { config } from 'dotenv';
import axios from 'axios';
import https from 'https';

// Load environment variables
config();

const EGROUPWARE_URL = process.env.EGROUPWARE_URL;
const EGROUPWARE_USERNAME = process.env.EGROUPWARE_USERNAME;
const EGROUPWARE_PASSWORD = process.env.EGROUPWARE_PASSWORD;

// Create axios instance
const egwApi = axios.create({
  baseURL: EGROUPWARE_URL,
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

async function testConnection() {
  console.log(`Testing connection to: ${EGROUPWARE_URL}`);
  console.log(`Username: ${EGROUPWARE_USERNAME}`);
  
  try {
    // Set up Basic Auth
    const auth = Buffer.from(`${EGROUPWARE_USERNAME}:${EGROUPWARE_PASSWORD}`).toString('base64');
    egwApi.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    
    console.log('\n1. Testing basic connection...');
    const response = await egwApi.get('/');
    console.log(`✅ Connection successful! Status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    
    console.log('\n2. Testing calendar endpoint...');
    try {
      const calResponse = await egwApi.get('/calendar/');
      console.log(`✅ Calendar endpoint accessible! Status: ${calResponse.status}`);
    } catch (error) {
      console.log(`❌ Calendar endpoint error: ${error.message}`);
    }
    
    console.log('\n3. Testing addressbook endpoint...');
    try {
      const abResponse = await egwApi.get('/addressbook/');
      console.log(`✅ Addressbook endpoint accessible! Status: ${abResponse.status}`);
    } catch (error) {
      console.log(`❌ Addressbook endpoint error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testConnection();
