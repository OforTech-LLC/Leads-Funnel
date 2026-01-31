/**
 * ID Generation Utility
 *
 * Uses a ULID-like monotonic ID: timestamp prefix + random suffix.
 * Sortable by creation time. No external dependency.
 */
/**
 * Generate a ULID (26 chars): 10 char timestamp + 16 char random.
 * Monotonically sortable, collision resistant.
 */
export declare function ulid(): string;
