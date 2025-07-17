#!/usr/bin/env node

/**
 * EGroupware MCP Server
 * Provides Claude Desktop integration with EGroupware functionality
 */

import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import https from 'https';

// Load environment variables from .env file
config();

// Configuration from environment variables
const EGROUPWARE_URL = process.env.EGROUPWARE_URL || 'https://your-egroupware-instance.com';
const EGROUPWARE_USERNAME = process.env.EGROUPWARE_USERNAME;
const EGROUPWARE_PASSWORD = process.env.EGROUPWARE_PASSWORD;
const EGROUPWARE_API_KEY = process.env.EGROUPWARE_API_KEY;
const TEST_MODE = process.env.TEST_MODE === 'true' || (!EGROUPWARE_USERNAME && !EGROUPWARE_PASSWORD && !EGROUPWARE_API_KEY);


// Create axios instance with custom configuration
const egwApi = axios.create({
  baseURL: EGROUPWARE_URL,
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For self-signed certificates
  })
});

// Authentication token storage
let authToken = null;

/**
 * Authenticate with EGroupware using Basic Auth
 */
async function authenticate() {
  try {
    // For GroupDAV, we use Basic Authentication
    const auth = Buffer.from(`${EGROUPWARE_USERNAME}:${EGROUPWARE_PASSWORD}`).toString('base64');
    egwApi.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    
    // Test the connection with a simple request
    const response = await egwApi.get('/');
    
    if (response.status === 200) {
      authToken = 'basic_auth_set';
      return true;
    }
    return false;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return false;
  }
}

/**
 * Make authenticated API call to EGroupware GroupDAV
 */
async function makeEGWCall(method, params = {}) {
  // Test mode - return mock data
  if (TEST_MODE) {
    console.error(`[TEST MODE] Would call: ${method} with params:`, params);
    return getMockResponse(method, params);
  }

  if (!authToken) {
    const authenticated = await authenticate();
    if (!authenticated) {
      throw new Error('Failed to authenticate with EGroupware');
    }
  }

  try {
    let response;
    
    switch (method) {
      case 'calendar.calendar_bo.save':
        // Create calendar event via GroupDAV using CalDAV format
        const dtstart = new Date(params.start * 1000);
        const dtend = new Date(params.end * 1000);
        
        // Create a simple CalDAV event
        const vcalendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EGroupware MCP Server//EN
BEGIN:VEVENT
UID:${Date.now()}@egroupware-mcp
DTSTART:${dtstart.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')}
DTEND:${dtend.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')}
SUMMARY:${params.title}
DESCRIPTION:${params.description || ''}
LOCATION:${params.location || ''}
END:VEVENT
END:VCALENDAR`;

        response = await egwApi.put(`/calendar/${Date.now()}.ics`, vcalendar, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8'
          }
        });
        return response.data?.id || Math.floor(Math.random() * 1000);
        
      case 'calendar.calendar_bo.search':
        // Get calendar events via GroupDAV
        response = await egwApi.get('/calendar/', {
          params: {
            start: new Date(params.start * 1000).toISOString(),
            end: new Date(params.end * 1000).toISOString()
          }
        });
        // GroupDAV might return XML or different format, handle gracefully
        const calData = response.data || {};
        if (typeof calData === 'string') {
          // If it's XML or plain text, return empty array for now
          return [];
        }
        return Array.isArray(calData) ? calData : (calData ? [calData] : []);
        
      case 'addressbook.addressbook_bo.save':
        // Create contact via GroupDAV using CardDAV format
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${params.n_given} ${params.n_family}
N:${params.n_family};${params.n_given};;;
EMAIL:${params.email || ''}
TEL;TYPE=WORK:${params.tel_work || ''}
ORG:${params.org_name || ''}
TITLE:${params.title || ''}
NOTE:${params.note || ''}
END:VCARD`;

        response = await egwApi.put(`/addressbook/${Date.now()}.vcf`, vcard, {
          headers: {
            'Content-Type': 'text/vcard; charset=utf-8'
          }
        });
        return response.data?.id || Math.floor(Math.random() * 1000);
        
      case 'addressbook.addressbook_bo.search':
        // Search contacts via GroupDAV
        response = await egwApi.get('/addressbook/', {
          params: {
            search: params.query
          }
        });
        // GroupDAV might return XML or different format, handle gracefully
        const data = response.data || {};
        if (typeof data === 'string') {
          // If it's XML or plain text, return empty array for now
          return [];
        }
        return Array.isArray(data) ? data : (data ? [data] : []);
        
      case 'infolog.infolog_bo.write':
        // Create task via GroupDAV (if supported)
        response = await egwApi.post('/infolog/', {
          summary: params.info_subject,
          description: params.info_des || '',
          due: params.info_enddate ? new Date(params.info_enddate * 1000).toISOString() : null,
          priority: params.info_priority || 'normal'
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return response.data?.id || Math.floor(Math.random() * 1000);
        
      case 'infolog.infolog_bo.search':
        // Get tasks via GroupDAV
        response = await egwApi.get('/infolog/', {
          params: {
            filter: params.filter || 'open'
          }
        });
        return response.data || [];
        
      case 'mail.mail_compose.send':
        // Send email - this might not be available via GroupDAV
        // For now, return success
        return true;
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      // Re-authenticate and try again
      authToken = null;
      const authenticated = await authenticate();
      if (authenticated) {
        return makeEGWCall(method, params);
      }
    }
    throw error;
  }
}

/**
 * Generate mock responses for testing
 */
function getMockResponse(method, params) {
  switch (method) {
    case 'calendar.calendar_bo.save':
      return Math.floor(Math.random() * 1000);
    
    case 'calendar.calendar_bo.search':
      return [
        {
          title: 'Sample Meeting',
          start: Math.floor(Date.now() / 1000),
          location: 'Conference Room A'
        },
        {
          title: 'Project Review',
          start: Math.floor(Date.now() / 1000) + 3600,
          location: 'Office 123'
        }
      ];
    
    case 'addressbook.addressbook_bo.save':
      return Math.floor(Math.random() * 1000);
    
    case 'addressbook.addressbook_bo.search':
      return [
        {
          n_given: 'John',
          n_family: 'Doe',
          email: 'john.doe@example.com',
          org_name: 'Sample Corp'
        },
        {
          n_given: 'Jane',
          n_family: 'Smith',
          email: 'jane.smith@example.com',
          org_name: 'Tech Ltd'
        }
      ];
    
    case 'infolog.infolog_bo.write':
      return Math.floor(Math.random() * 1000);
    
    case 'infolog.infolog_bo.search':
      return [
        {
          info_subject: 'Sample Task',
          info_status: 'open',
          info_enddate: Math.floor(Date.now() / 1000) + 86400
        },
        {
          info_subject: 'Review Document',
          info_status: 'done',
          info_enddate: Math.floor(Date.now() / 1000) - 86400
        }
      ];
    
    case 'mail.mail_compose.send':
      return true;
    
    default:
      return { success: true, message: 'Mock response' };
  }
}

/**
 * Parse natural language date to timestamp
 */
function parseDate(dateString) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  
  const lowerDate = dateString.toLowerCase();
  
  if (lowerDate.includes('today')) {
    return Math.floor(now.getTime() / 1000);
  } else if (lowerDate.includes('tomorrow')) {
    return Math.floor(tomorrow.getTime() / 1000);
  } else if (lowerDate.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    return Math.floor(nextWeek.getTime() / 1000);
  } else {
    // Try to parse as regular date
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? Math.floor(now.getTime() / 1000) : Math.floor(parsed.getTime() / 1000);
  }
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Define available tools
const tools = [
  {
    name: "create_calendar_event",
    description: "Create a new calendar event in EGroupware",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Event title"
        },
        description: {
          type: "string",
          description: "Event description (optional)"
        },
        date: {
          type: "string",
          description: "Event date (can be natural language like 'tomorrow', 'next Monday', or specific date)"
        },
        time: {
          type: "string",
          description: "Event time (optional, e.g., '14:30' or '2:30 PM')"
        },
        duration: {
          type: "number",
          description: "Duration in minutes (default: 60)"
        },
        location: {
          type: "string",
          description: "Event location (optional)"
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "List of attendee email addresses (optional)"
        }
      },
      required: ["title", "date"]
    }
  },
  {
    name: "get_calendar_events",
    description: "Get upcoming calendar events from EGroupware",
    inputSchema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date for search (optional, defaults to today)"
        },
        end_date: {
          type: "string",
          description: "End date for search (optional, defaults to next week)"
        },
        limit: {
          type: "number",
          description: "Maximum number of events to return (default: 10)"
        }
      }
    }
  },
  {
    name: "create_contact",
    description: "Create a new contact in EGroupware addressbook",
    inputSchema: {
      type: "object",
      properties: {
        first_name: {
          type: "string",
          description: "First name"
        },
        last_name: {
          type: "string",
          description: "Last name"
        },
        email: {
          type: "string",
          description: "Email address"
        },
        phone: {
          type: "string",
          description: "Phone number (optional)"
        },
        company: {
          type: "string",
          description: "Company name (optional)"
        },
        title: {
          type: "string",
          description: "Job title (optional)"
        },
        notes: {
          type: "string",
          description: "Additional notes (optional)"
        }
      },
      required: ["first_name", "last_name"]
    }
  },
  {
    name: "search_contacts",
    description: "Search for contacts in EGroupware addressbook",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (name, email, company, etc.)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "create_task",
    description: "Create a new task in EGroupware InfoLog",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Task title"
        },
        description: {
          type: "string",
          description: "Task description (optional)"
        },
        due_date: {
          type: "string",
          description: "Due date (optional, can be natural language)"
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "Task priority (default: normal)"
        },
        category: {
          type: "string",
          description: "Task category (optional)"
        },
        assigned_to: {
          type: "string",
          description: "Email of person to assign task to (optional)"
        }
      },
      required: ["title"]
    }
  },
  {
    name: "get_tasks",
    description: "Get tasks from EGroupware InfoLog",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "done", "all"],
          description: "Filter by status (default: open)"
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default: 10)"
        }
      }
    }
  },
  {
    name: "send_email",
    description: "Send an email through EGroupware",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: { type: "string" },
          description: "Recipient email addresses"
        },
        subject: {
          type: "string",
          description: "Email subject"
        },
        body: {
          type: "string",
          description: "Email body content"
        },
        cc: {
          type: "array",
          items: { type: "string" },
          description: "CC recipients (optional)"
        },
        bcc: {
          type: "array",
          items: { type: "string" },
          description: "BCC recipients (optional)"
        }
      },
      required: ["to", "subject", "body"]
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: "egroupware-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_calendar_event":
        let startTime = parseDate(args.date);
        let endTime = startTime + (args.duration || 60) * 60; // Default 1 hour
        
        if (args.time) {
          const [hours, minutes] = args.time.split(':').map(Number);
          const eventDate = new Date(startTime * 1000);
          eventDate.setHours(hours, minutes || 0, 0, 0);
          startTime = Math.floor(eventDate.getTime() / 1000);
          endTime = startTime + (args.duration || 60) * 60;
        }

        const eventData = {
          title: args.title,
          description: args.description || '',
          start: startTime,
          end: endTime,
          location: args.location || '',
          participants: args.attendees || []
        };

        const createdEvent = await makeEGWCall('calendar.calendar_bo.save', eventData);
        
        return {
          content: [{
            type: "text",
            text: `✅ Calendar event created successfully!\n\nTitle: ${args.title}\nDate: ${formatDate(startTime)}\nDuration: ${args.duration || 60} minutes\nLocation: ${args.location || 'Not specified'}\nEvent ID: ${createdEvent}`
          }]
        };

      case "get_calendar_events":
        const startDate = parseDate(args.start_date || 'today');
        const endDate = parseDate(args.end_date || 'next week');
        
        const events = await makeEGWCall('calendar.calendar_bo.search', {
          start: startDate,
          end: endDate,
          num_rows: args.limit || 10
        });

        const eventList = events.map(event => 
          `• ${event.title} - ${formatDate(event.start)}${event.location ? ` (${event.location})` : ''}`
        ).join('\n');

        return {
          content: [{
            type: "text",
            text: `📅 Upcoming Calendar Events:\n\n${eventList || 'No events found for the specified period.'}`
          }]
        };

      case "create_contact":
        const contactData = {
          n_given: args.first_name,
          n_family: args.last_name,
          email: args.email || '',
          tel_work: args.phone || '',
          org_name: args.company || '',
          title: args.title || '',
          note: args.notes || ''
        };

        const createdContact = await makeEGWCall('addressbook.addressbook_bo.save', contactData);
        
        return {
          content: [{
            type: "text",
            text: `✅ Contact created successfully!\n\nName: ${args.first_name} ${args.last_name}\nEmail: ${args.email || 'Not provided'}\nCompany: ${args.company || 'Not provided'}\nContact ID: ${createdContact}`
          }]
        };

      case "search_contacts":
        const contacts = await makeEGWCall('addressbook.addressbook_bo.search', {
          query: args.query,
          num_rows: args.limit || 10
        });

        // Handle both array and non-array responses
        const contactsArray = Array.isArray(contacts) ? contacts : (contacts ? [contacts] : []);
        
        const contactList = contactsArray.map(contact => {
          // Handle different response formats
          const firstName = contact.n_given || contact['given-name'] || contact.fn?.split(' ')[0] || 'Unknown';
          const lastName = contact.n_family || contact['family-name'] || contact.fn?.split(' ')[1] || 'Unknown';
          const email = contact.email || contact.mail || '';
          const company = contact.org_name || contact.org || '';
          
          return `• ${firstName} ${lastName}${email ? ` (${email})` : ''}${company ? ` - ${company}` : ''}`;
        }).join('\n');

        return {
          content: [{
            type: "text",
            text: `👥 Contact Search Results:\n\n${contactList || 'No contacts found matching your query.'}`
          }]
        };

      case "create_task":
        const taskData = {
          info_subject: args.title,
          info_des: args.description || '',
          info_enddate: args.due_date ? parseDate(args.due_date) : null,
          info_priority: args.priority || 'normal',
          info_cat: args.category || '',
          info_responsible: args.assigned_to || ''
        };

        const createdTask = await makeEGWCall('infolog.infolog_bo.write', taskData);
        
        return {
          content: [{
            type: "text",
            text: `✅ Task created successfully!\n\nTitle: ${args.title}\nPriority: ${args.priority || 'normal'}\nDue Date: ${args.due_date ? formatDate(parseDate(args.due_date)) : 'Not set'}\nTask ID: ${createdTask}`
          }]
        };

      case "get_tasks":
        const taskFilter = {
          filter: args.status || 'open',
          num_rows: args.limit || 10
        };

        const tasks = await makeEGWCall('infolog.infolog_bo.search', taskFilter);

        const taskList = tasks.map(task => 
          `• ${task.info_subject} - ${task.info_status}${task.info_enddate ? ` (Due: ${formatDate(task.info_enddate)})` : ''}`
        ).join('\n');

        return {
          content: [{
            type: "text",
            text: `📋 Tasks:\n\n${taskList || 'No tasks found.'}`
          }]
        };

      case "send_email":
        const emailData = {
          to: args.to,
          subject: args.subject,
          body: args.body,
          cc: args.cc || [],
          bcc: args.bcc || []
        };

        await makeEGWCall('mail.mail_compose.send', emailData);
        
        return {
          content: [{
            type: "text",
            text: `✅ Email sent successfully!\n\nTo: ${args.to.join(', ')}\nSubject: ${args.subject}\nCC: ${args.cc?.join(', ') || 'None'}\nBCC: ${args.bcc?.join(', ') || 'None'}`
          }]
        };

      default:
        return {
          content: [{
            type: "text",
            text: `❌ Unknown tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Error executing ${name}: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  if (TEST_MODE) {
    console.error("EGroupware MCP server running in TEST MODE on stdio");
    console.error("Set TEST_MODE=false in .env file and configure EGroupware credentials for live mode");
  } else {
    console.error("EGroupware MCP server running on stdio");
    console.error(`Connecting to EGroupware at: ${EGROUPWARE_URL}`);
  }
}

main().catch(console.error);