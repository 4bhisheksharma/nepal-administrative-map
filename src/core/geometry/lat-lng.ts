/** A geographic point in degrees (WGS84). */
export class LatLng {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {
    if (latitude < -90 || latitude > 90) {
      throw new RangeError(`latitude out of range: ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new RangeError(`longitude out of range: ${longitude}`);
    }
  }

  equals(other: LatLng): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }

  toString(): string {
    return `LatLng(${this.latitude}, ${this.longitude})`;
  }
}
