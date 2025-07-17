# EGroupware MCP Server for Claude Desktop

A Model Context Protocol (MCP) server that provides Claude Desktop integration with EGroupware functionality.

## Features

- **Calendar Management**: Create and retrieve calendar events
- **Contact Management**: Create and search contacts in the addressbook
- **Task Management**: Create and manage tasks in InfoLog
- **Email**: Send emails through EGroupware


## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### Environment Variables

Create a `.env` file in the project root with your EGroupware credentials:

```env
# EGroupware Configuration
EGROUPWARE_URL=https://your-egroupware-instance.com/egw/groupdav.php/username
EGROUPWARE_USERNAME=your-username
EGROUPWARE_PASSWORD=your-password

# Optional: Set to 'true' to enable test mode
TEST_MODE=false
```

### Test Mode

Set `TEST_MODE=true` in your `.env` file to run the server with mock responses. This is useful for:
- Testing the MCP integration without a real EGroupware instance
- Development and debugging
- Demonstrating functionality

## Usage

### Running the Server

```bash
# Start the server
npm start

# Or run with auto-restart on file changes
npm run dev

# Or run directly
node index.js
```

### Testing

Run the test client to verify functionality:

```bash
node test-real.js
```

## Available Tools

### 1. create_calendar_event
Create a new calendar event in EGroupware.

**Parameters:**
- `title` (required): Event title
- `date` (required): Event date (supports natural language like "tomorrow", "next Monday")
- `time` (optional): Event time (e.g., "14:30" or "2:30 PM")
- `duration` (optional): Duration in minutes (default: 60)
- `description` (optional): Event description
- `location` (optional): Event location
- `attendees` (optional): Array of attendee email addresses

### 2. get_calendar_events
Get upcoming calendar events from EGroupware.

**Parameters:**
- `start_date` (optional): Start date for search (defaults to today)
- `end_date` (optional): End date for search (defaults to next week)
- `limit` (optional): Maximum number of events to return (default: 10)

### 3. create_contact
Create a new contact in EGroupware addressbook.

**Parameters:**
- `first_name` (required): First name
- `last_name` (required): Last name
- `email` (optional): Email address
- `phone` (optional): Phone number
- `company` (optional): Company name
- `title` (optional): Job title
- `notes` (optional): Additional notes

### 4. search_contacts
Search for contacts in EGroupware addressbook.

**Parameters:**
- `query` (required): Search query (name, email, company, etc.)
- `limit` (optional): Maximum number of results (default: 10)

### 5. create_task
Create a new task in EGroupware InfoLog.

**Parameters:**
- `title` (required): Task title
- `description` (optional): Task description
- `due_date` (optional): Due date (supports natural language)
- `priority` (optional): Task priority (low, normal, high, urgent)
- `category` (optional): Task category
- `assigned_to` (optional): Email of person to assign task to

### 6. get_tasks
Get tasks from EGroupware InfoLog.

**Parameters:**
- `status` (optional): Filter by status (open, done, all) - default: open
- `limit` (optional): Maximum number of tasks to return (default: 10)

### 7. send_email
Send an email through EGroupware.

**Parameters:**
- `to` (required): Array of recipient email addresses
- `subject` (required): Email subject
- `body` (required): Email body content
- `cc` (optional): Array of CC recipients
- `bcc` (optional): Array of BCC recipients

## Integration with Claude Desktop

To use this MCP server with Claude Desktop:

1. Add the server configuration to your Claude Desktop MCP settings
2. The server runs on stdio transport
3. Make sure the server is running before starting Claude Desktop

## Development

### File Structure

```
├── index.js           # Main MCP server implementation
├── test-real.js       # Test client for verification
├── package.json       # Node.js dependencies and scripts
├── .env              # Environment variables (not in git)
├── .gitignore        # Git ignore file
└── README.md         # This file
```



## Troubleshooting

### Authentication Issues

If you're getting authentication errors:

1. Verify your EGroupware URL, username, and password in `.env`
2. Check if your EGroupware instance is accessible
3. Enable TEST_MODE to verify the MCP integration works


## Support

For issues related to:
- EGroupware connectivity: Check your EGroupware configuration
- MCP integration: Verify the server is running correctly
- Claude Desktop: Ensure proper MCP configuration in Claude Desktop settings
