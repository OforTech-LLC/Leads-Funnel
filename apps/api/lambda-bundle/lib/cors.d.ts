export declare function getCorsOrigin(requestOrigin?: string): string | null;
export interface BuildCorsOptions {
    allowMethods?: string;
    allowHeaders?: string;
    allowCredentials?: boolean;
    allowFallbackOrigin?: boolean;
    contentType?: string;
    extraHeaders?: Record<string, string>;
}
export declare function buildCorsHeaders(requestOrigin?: string, options?: BuildCorsOptions): Record<string, string>;
