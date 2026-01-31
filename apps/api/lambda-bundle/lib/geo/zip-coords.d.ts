/**
 * ZIP Code to Latitude/Longitude Lookup
 *
 * Contains the top 1000 most-populated US ZIP codes with their
 * approximate centroid coordinates.  Used by the geographic radius
 * matching engine in the assignment matcher.
 *
 * Data source: US Census Bureau ZCTA centroids (public domain).
 *
 * NOTE: This is a static lookup table embedded in the Lambda bundle for
 * zero-latency access.  For full ZIP coverage, consider loading from
 * DynamoDB or S3 on cold start with caching.
 */
export interface ZipCoordinate {
    lat: number;
    lng: number;
}
/**
 * Calculate the great-circle distance between two points using the
 * Haversine formula.
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lng1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lng2 - Longitude of point 2 (degrees)
 * @returns Distance in miles
 */
export declare function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number;
/**
 * Check if two ZIP codes are within a given radius (miles).
 *
 * @param zip1 - First ZIP code
 * @param zip2 - Second ZIP code
 * @param radiusMiles - Maximum distance in miles
 * @returns true if both ZIPs are found and within the radius, false otherwise
 */
export declare function isWithinRadius(zip1: string, zip2: string, radiusMiles: number): boolean;
/**
 * Look up coordinates for a ZIP code.
 * Returns null if the ZIP is not in our lookup table.
 */
export declare function getZipCoordinate(zip: string): ZipCoordinate | null;
