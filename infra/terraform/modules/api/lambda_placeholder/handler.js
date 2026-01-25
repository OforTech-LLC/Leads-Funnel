/**
 * Lead Capture Lambda Handler - Placeholder
 *
 * This is a minimal placeholder handler for initial Terraform deployment.
 * Replace with actual business logic from apps/api/dist/handler.js
 */

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event));

  // Extract environment variables
  const tableName = process.env.DDB_TABLE_NAME;
  const eventBus = process.env.EVENT_BUS_NAME;
  const environment = process.env.ENV || 'dev';

  // Parse request body
  let body = {};
  try {
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        ok: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
        },
      }),
    };
  }

  // Generate placeholder lead ID
  const leadId = `placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const timestamp = new Date().toISOString();

  // Placeholder response
  const response = {
    ok: true,
    leadId,
    status: 'accepted',
    _meta: {
      environment,
      timestamp,
      placeholder: true,
      message: 'Replace this placeholder with apps/api/dist/handler.js',
    },
  };

  console.log('Created lead:', leadId);

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'X-Request-Id': context.awsRequestId || leadId,
    },
    body: JSON.stringify(response),
  };
};
