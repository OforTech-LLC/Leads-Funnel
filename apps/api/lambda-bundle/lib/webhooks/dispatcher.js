/**
 * Webhook Dispatcher
 *
 * Delivers webhook payloads to registered endpoints with:
 * - HMAC-SHA256 signature verification
 * - 5-second timeout
 * - Delivery attempt recording in DynamoDB
 * - Retry with exponential backoff (3 attempts: 0s, 30s, 300s)
 * - Idempotency via eventId + deliveryAttempt dedup key (Issue #8)
 */
import { createHmac } from 'crypto';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { ulid } from '../id.js';
import { createLogger } from '../logging.js';
import { findWebhooksForEvent } from './registry.js';
import { DB_PREFIXES } from '../constants.js';
const log = createLogger('webhook-dispatcher');
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DELIVERY_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 30_000, 300_000]; // 0s, 30s, 5min
const DELIVERY_TTL_DAYS = 30;
// ---------------------------------------------------------------------------
// Idempotency (Issue #8)
// ---------------------------------------------------------------------------
/**
 * Build a dedup key from eventId + webhookId + attempt number.
 *
 * This ensures that if a Lambda retry re-processes the same event,
 * we do not deliver the same payload twice.  The dedup record is
 * written with a TTL so it auto-expires after the delivery window.
 */
function buildDedupKey(eventId, webhookId, attempt) {
    return `${eventId}#${webhookId}#${attempt}`;
}
/**
 * Check whether a delivery has already been attempted for the given
 * eventId + webhookId + attempt combination.
 *
 * @returns true if the delivery was already recorded (skip).
 */
async function isDeliveryDuplicate(dedupKey) {
    const doc = getDocClient();
    try {
        const result = await doc.send(new GetCommand({
            TableName: tableName(),
            Key: {
                pk: `${DB_PREFIXES.IDEMPOTENCY}WH#${dedupKey}`,
                sk: 'DEDUP',
            },
        }));
        return !!result.Item;
    }
    catch {
        // If the check fails, proceed with delivery (fail-open for liveness)
        return false;
    }
}
/**
 * Record a dedup entry so future retries of the same event+webhook+attempt
 * are skipped.
 */
async function recordDedupKey(dedupKey) {
    const doc = getDocClient();
    const ttl = Math.floor(Date.now() / 1000) + DELIVERY_TTL_DAYS * 86400;
    try {
        await doc.send(new PutCommand({
            TableName: tableName(),
            Item: {
                pk: `${DB_PREFIXES.IDEMPOTENCY}WH#${dedupKey}`,
                sk: 'DEDUP',
                createdAt: new Date().toISOString(),
                ttl,
            },
        }));
    }
    catch {
        // Non-critical: if dedup write fails, worst case is a duplicate delivery
    }
}
// ---------------------------------------------------------------------------
// HMAC Signature
// ---------------------------------------------------------------------------
/**
 * Compute HMAC-SHA256 signature for a webhook payload.
 * The signature is placed in the X-Webhook-Signature header.
 */
function computeSignature(payload, secret) {
    return createHmac('sha256', secret).update(payload).digest('hex');
}
// ---------------------------------------------------------------------------
// Delivery Recording
// ---------------------------------------------------------------------------
/**
 * Record a webhook delivery attempt in DynamoDB.
 *
 * Key schema:
 *   PK = WHDELIVER#<webhookId>
 *   SK = <timestamp>
 */
async function recordDelivery(delivery) {
    const doc = getDocClient();
    try {
        await doc.send(new PutCommand({
            TableName: tableName(),
            Item: delivery,
        }));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error('webhook.delivery.recordFailed', { webhookId: delivery.webhookId, error: msg });
    }
}
// ---------------------------------------------------------------------------
// HTTP Delivery
// ---------------------------------------------------------------------------
/**
 * Deliver a payload to a single webhook URL with timeout.
 */
async function deliverToUrl(url, payload, signature) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'User-Agent': 'Kanjona-Webhooks/1.0',
            },
            body: payload,
            signal: controller.signal,
        });
        const body = await response.text().catch(() => '');
        return { status: response.status, body: body.slice(0, 1000) };
    }
    finally {
        clearTimeout(timeout);
    }
}
// ---------------------------------------------------------------------------
// Single Webhook Delivery with Retries
// ---------------------------------------------------------------------------
/**
 * Deliver a webhook event to a single registered endpoint.
 * Retries up to MAX_ATTEMPTS times with exponential backoff.
 *
 * Idempotency (Issue #8): Before each attempt, checks a dedup key
 * composed of eventId + webhookId + attempt number. If the key exists,
 * the attempt is skipped (already delivered or attempted).
 */
async function deliverToWebhook(webhook, event) {
    const payload = JSON.stringify(event);
    const signature = computeSignature(payload, webhook.secret);
    const ttl = Math.floor(Date.now() / 1000) + DELIVERY_TTL_DAYS * 86400;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Idempotency check: skip if this exact attempt was already delivered
        const dedupKey = buildDedupKey(event.id, webhook.id, attempt);
        const isDuplicate = await isDeliveryDuplicate(dedupKey);
        if (isDuplicate) {
            log.info('webhook.delivery.deduplicated', {
                webhookId: webhook.id,
                eventId: event.id,
                attempt,
            });
            continue;
        }
        // Wait for retry delay (0 on first attempt)
        const delay = RETRY_DELAYS_MS[attempt - 1] || 0;
        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        const deliveredAt = new Date().toISOString();
        let delivery;
        try {
            const result = await deliverToUrl(webhook.url, payload, signature);
            const success = result.status >= 200 && result.status < 300;
            delivery = {
                pk: `${DB_PREFIXES.WHDELIVER}${webhook.id}`,
                sk: deliveredAt,
                webhookId: webhook.id,
                eventType: event.type,
                eventId: event.id,
                url: webhook.url,
                requestBody: payload.slice(0, 2000),
                responseStatus: result.status,
                responseBody: result.body.slice(0, 500),
                success,
                attempt,
                deliveredAt,
                ttl,
            };
            await recordDelivery(delivery);
            // Record dedup entry so retries skip this attempt
            await recordDedupKey(dedupKey);
            if (success) {
                log.info('webhook.delivered', {
                    webhookId: webhook.id,
                    eventType: event.type,
                    attempt,
                    status: result.status,
                });
                return;
            }
            log.warn('webhook.delivery.httpError', {
                webhookId: webhook.id,
                eventType: event.type,
                attempt,
                status: result.status,
            });
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            delivery = {
                pk: `${DB_PREFIXES.WHDELIVER}${webhook.id}`,
                sk: deliveredAt,
                webhookId: webhook.id,
                eventType: event.type,
                eventId: event.id,
                url: webhook.url,
                requestBody: payload.slice(0, 2000),
                success: false,
                attempt,
                error: errorMessage.slice(0, 500),
                deliveredAt,
                ttl,
            };
            await recordDelivery(delivery);
            // Record dedup entry even on error to prevent retry storms
            await recordDedupKey(dedupKey);
            log.warn('webhook.delivery.error', {
                webhookId: webhook.id,
                eventType: event.type,
                attempt,
                error: errorMessage,
            });
        }
    }
    log.error('webhook.delivery.exhausted', {
        webhookId: webhook.id,
        eventType: event.type,
        maxAttempts: MAX_ATTEMPTS,
    });
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Dispatch a webhook event to all registered endpoints that subscribe
 * to the given event type.
 *
 * @param eventType - The event type (e.g. 'lead.created')
 * @param data - The event payload data
 */
export async function dispatchWebhookEvent(eventType, data) {
    const webhooks = await findWebhooksForEvent(eventType);
    if (webhooks.length === 0) {
        return;
    }
    const event = {
        id: ulid(),
        type: eventType,
        timestamp: new Date().toISOString(),
        data,
    };
    log.info('webhook.dispatching', {
        eventType,
        webhookCount: webhooks.length,
        eventId: event.id,
    });
    // Deliver to all webhooks concurrently (fire-and-forget per webhook)
    const deliveries = webhooks.map((wh) => deliverToWebhook(wh, event).catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        log.error('webhook.dispatch.unhandled', { webhookId: wh.id, error: msg });
    }));
    await Promise.allSettled(deliveries);
}
/**
 * Send a test payload to a specific webhook.
 */
export async function sendTestWebhook(webhook) {
    const event = {
        id: ulid(),
        type: 'lead.created',
        timestamp: new Date().toISOString(),
        data: {
            test: true,
            message: 'This is a test webhook delivery from Kanjona.',
            leadId: 'test-lead-001',
            funnelId: 'test-funnel',
            name: 'Test Lead',
            email: 'test@example.com',
            status: 'new',
            createdAt: new Date().toISOString(),
        },
    };
    const payload = JSON.stringify(event);
    const signature = computeSignature(payload, webhook.secret);
    const deliveredAt = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + DELIVERY_TTL_DAYS * 86400;
    try {
        const result = await deliverToUrl(webhook.url, payload, signature);
        const success = result.status >= 200 && result.status < 300;
        const delivery = {
            pk: `${DB_PREFIXES.WHDELIVER}${webhook.id}`,
            sk: deliveredAt,
            webhookId: webhook.id,
            eventType: 'lead.created',
            eventId: event.id,
            url: webhook.url,
            requestBody: payload.slice(0, 2000),
            responseStatus: result.status,
            responseBody: result.body.slice(0, 500),
            success,
            attempt: 1,
            deliveredAt,
            ttl,
        };
        await recordDelivery(delivery);
        return delivery;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const delivery = {
            pk: `${DB_PREFIXES.WHDELIVER}${webhook.id}`,
            sk: deliveredAt,
            webhookId: webhook.id,
            eventType: 'lead.created',
            eventId: event.id,
            url: webhook.url,
            requestBody: payload.slice(0, 2000),
            success: false,
            attempt: 1,
            error: errorMessage.slice(0, 500),
            deliveredAt,
            ttl,
        };
        await recordDelivery(delivery);
        return delivery;
    }
}
//# sourceMappingURL=dispatcher.js.map