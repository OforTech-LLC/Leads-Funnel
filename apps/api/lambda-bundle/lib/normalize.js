/**
 * Normalization utilities for lead data
 */
/**
 * Normalize whitespace in a string
 * Trims and collapses multiple spaces to single space
 */
function normalizeWhitespace(str) {
    return str.trim().replace(/\s+/g, ' ');
}
/**
 * Normalize email address
 * Lowercase and trim
 */
function normalizeEmail(email) {
    return email.toLowerCase().trim();
}
/**
 * Normalize phone number
 * Simple trim - don't overcomplicate E.164 conversion
 */
function normalizePhone(phone) {
    if (!phone)
        return undefined;
    const trimmed = phone.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
/**
 * Normalize message/notes
 * Trim whitespace
 */
function normalizeMessage(message) {
    if (!message)
        return undefined;
    const trimmed = message.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
/**
 * Normalize UTM parameters
 */
function normalizeUtm(utm) {
    if (!utm)
        return undefined;
    const normalized = {};
    if (utm.utm_source)
        normalized.utm_source = utm.utm_source.trim();
    if (utm.utm_medium)
        normalized.utm_medium = utm.utm_medium.trim();
    if (utm.utm_campaign)
        normalized.utm_campaign = utm.utm_campaign.trim();
    if (utm.utm_term)
        normalized.utm_term = utm.utm_term.trim();
    if (utm.utm_content)
        normalized.utm_content = utm.utm_content.trim();
    // Return undefined if all fields are empty
    return Object.keys(normalized).length > 0 ? normalized : undefined;
}
/**
 * Normalize the entire lead payload
 * Supports all extended fields for comprehensive funnel coverage
 */
export function normalizeLead(payload) {
    const normalized = {
        // Core fields
        funnelId: payload.funnelId?.trim().toLowerCase() || '',
        name: normalizeWhitespace(payload.name || ''),
        email: normalizeEmail(payload.email),
        phone: normalizePhone(payload.phone),
        message: normalizeMessage(payload.notes),
        firstName: payload.firstName?.trim(),
        lastName: payload.lastName?.trim(),
        // Tracking
        pageUrl: payload.metadata?.pageUrl?.trim(),
        referrer: payload.metadata?.referrer?.trim(),
        utm: normalizeUtm(payload.utm),
        metadata: payload.metadata,
        consent: payload.consent,
        // Extended fields - pass through as-is (validated at form level)
        address: payload.address,
        property: payload.property,
        vehicle: payload.vehicle,
        business: payload.business,
        healthcare: payload.healthcare,
        legal: payload.legal,
        financial: payload.financial,
        project: payload.project,
        contactPreferences: payload.contactPreferences,
        scheduling: payload.scheduling,
        customFields: payload.customFields,
        tags: payload.tags,
    };
    // Remove undefined fields to keep the object clean
    return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v !== undefined));
}
//# sourceMappingURL=normalize.js.map