"""
Lead Capture Lambda Handler - Placeholder

This is a minimal placeholder handler. Replace with actual business logic.

Expected Request (POST /lead):
{
    "name": "string (required, 1-100 chars)",
    "email": "string (required, valid email)",
    "phone": "string (optional, E.164 format)",
    "message": "string (optional, max 1000 chars)",
    "utm_source": "string (optional)",
    "utm_medium": "string (optional)",
    "utm_campaign": "string (optional)"
}

Success Response (200):
{
    "success": true,
    "leadId": "uuid",
    "message": "Thank you for your submission"
}

Error Response (400/500):
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Human readable message",
        "details": [{"field": "email", "message": "Invalid email format"}]
    }
}
"""

import json
import logging
import os
import uuid
from datetime import datetime

# Configure logging
log_level = os.environ.get("LOG_LEVEL", "INFO")
logger = logging.getLogger()
logger.setLevel(log_level)


def lambda_handler(event, context):
    """
    Main Lambda handler for lead capture.

    This is a placeholder that returns a success response.
    Actual implementation should:
    1. Validate input
    2. Check for duplicates (by email)
    3. Check rate limits (by IP)
    4. Store lead in DynamoDB
    5. Emit event to EventBridge
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Get environment variables
    table_name = os.environ.get("DYNAMODB_TABLE_NAME")
    event_bus = os.environ.get("EVENT_BUS_NAME")
    environment = os.environ.get("ENVIRONMENT", "dev")

    # Extract request body
    try:
        if event.get("body"):
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
        else:
            body = {}
    except json.JSONDecodeError:
        return _error_response(400, "INVALID_JSON", "Request body must be valid JSON")

    # Generate lead ID
    lead_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Placeholder response
    response_body = {
        "success": True,
        "leadId": lead_id,
        "message": "Thank you for your submission",
        "_meta": {
            "environment": environment,
            "timestamp": timestamp,
            "placeholder": True,  # Remove when implementing actual logic
        },
    }

    logger.info(f"Created lead: {lead_id}")

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "X-Request-Id": context.aws_request_id if context else lead_id,
        },
        "body": json.dumps(response_body),
    }


def _error_response(status_code: int, code: str, message: str, details: list = None):
    """Generate standardized error response."""
    error_body = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details:
        error_body["error"]["details"] = details

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
        },
        "body": json.dumps(error_body),
    }
