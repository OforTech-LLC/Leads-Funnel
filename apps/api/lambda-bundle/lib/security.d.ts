/**
 * Security utilities for spam detection and suspicious lead analysis
 *
 * Provides heuristic-based detection of potentially malicious or spam leads,
 * including disposable email detection, spam keyword analysis, and URL counting.
 *
 * Also includes GDPR-compliant IP anonymization and salted email hashing.
 *
 * Privacy Architecture:
 * - Full IPs are never stored in logs (GDPR compliance)
 * - Emails are hashed with salt for deduplication without storing plaintext
 * - Anonymized data still allows abuse detection and geographic analysis
 */
import type { NormalizedLead, SecurityAnalysis } from '../types.js';
/**
 * Anonymize an IPv4 address by zeroing the last octet
 *
 * GDPR Compliance: Full IP addresses are personal data under GDPR.
 * Zeroing the last octet (e.g., 192.168.1.123 -> 192.168.1.0) anonymizes
 * the address while preserving geographic and network information for
 * abuse detection and analytics.
 *
 * This technique is endorsed by data protection authorities including
 * the German DPA and is used by Google Analytics in anonymized mode.
 *
 * @param ip - The full IPv4 address
 * @returns Anonymized IP (e.g., "192.168.1.0")
 */
export declare function anonymizeIPv4(ip: string): string;
/**
 * Anonymize an IPv6 address by zeroing the last 80 bits
 *
 * GDPR Compliance: Reduces IPv6 to /48 prefix which typically represents
 * an organization or ISP block, not an individual. This matches the
 * anonymization level recommended for GDPR compliance.
 *
 * @param ip - The full IPv6 address
 * @returns Anonymized IP prefix (e.g., "2001:db8:85a3::")
 */
export declare function anonymizeIPv6(ip: string): string;
/**
 * Anonymize an IP address for GDPR-compliant logging
 *
 * Automatically detects IPv4 vs IPv6 and applies appropriate anonymization:
 * - IPv4: Zeros the last octet (/24 prefix)
 * - IPv6: Reduces to /48 prefix
 *
 * @param ip - The full IP address (IPv4 or IPv6)
 * @returns Anonymized IP address safe for logging
 */
export declare function anonymizeIp(ip: string): string;
/**
 * Extracts the real client IP address from request headers.
 *
 * Security Considerations:
 * - X-Forwarded-For can be spoofed by malicious clients
 * - Only trust it when infrastructure (CloudFront/ALB) validates/overwrites it
 * - Take the FIRST IP as it represents the original client
 *
 * @param headers - Request headers object with potential forwarding headers
 * @param sourceIp - Fallback source IP from the request context
 * @returns The extracted client IP address, or 'unknown' if unavailable
 */
export declare function extractClientIp(headers: Record<string, string | undefined>, sourceIp?: string): string;
/**
 * Performs comprehensive security analysis on a lead submission.
 *
 * Analysis Checks:
 * 1. Disposable email domain - indicates throwaway/fake leads
 * 2. Spam keywords in message - indicates promotional/scam content
 * 3. URL count in message - multiple URLs suggest spam/link farms
 *
 * Generated Security Artifacts:
 * - ipHash: For rate limiting without storing raw IP (privacy)
 * - emailHash: For deduplication without storing plaintext email
 * - idempotencyKey: For preventing duplicate submissions within time window
 *
 * @param lead - The normalized lead data to analyze
 * @param clientIp - The client's IP address
 * @param ipHashSalt - Salt for IP hashing (should be environment-specific)
 * @param windowMinutes - Time window for idempotency key generation
 * @returns Complete security analysis with suspicious flag, reasons, and hashes
 */
export declare function analyzeLeadSecurity(lead: NormalizedLead, clientIp: string, ipHashSalt: string, windowMinutes: number): SecurityAnalysis;
/**
 * Prepare log-safe lead data that complies with GDPR
 *
 * Privacy: Creates audit log data without storing any PII directly:
 * - IP is anonymized (last octet zeroed)
 * - IP hash allows correlation without storing full IP
 * - Email hash allows deduplication without storing plaintext
 *
 * @param leadId - The lead ID
 * @param clientIp - The client IP address
 * @param email - The email address
 * @param ipHashSalt - Salt for IP hashing
 * @returns Object safe for logging (no raw PII)
 */
export declare function prepareAuditLogData(leadId: string, clientIp: string, email: string, ipHashSalt: string): {
    leadId: string;
    anonymizedIp: string;
    ipHash: string;
    emailHash: string;
    timestamp: string;
};
