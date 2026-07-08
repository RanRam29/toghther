/** PostgREST inserts into `geography(Point,4326)` columns via WKT, not GeoJSON. */
export function toGeoPoint(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
