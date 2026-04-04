import { normalizeVNLocationName } from '@/common/utils/vnLocation';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000,
};

const REVERSE_GEOCODE_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

export type GeolocationPermissionState = PermissionState | 'unsupported';

export type CurrentDetectedAddress = {
  addressLine: string;
  city: string;
  district: string;
  ward: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

type ReverseGeocodeAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  borough?: string;
  residential?: string;
  city_block?: string;
  quarter?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  district?: string;
  city_district?: string;
  state_district?: string;
  province?: string;
  state?: string;
  region?: string;
  amenity?: string;
  building?: string;
  retail?: string;
};

type ReverseGeocodeResponse = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: ReverseGeocodeAddress;
};

const compactUnique = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();

  return values
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .filter((value) => {
      const normalized = normalizeVNLocationName(value);
      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
};

const pickFirst = (...values: Array<string | null | undefined>) => compactUnique(values)[0] ?? '';

const pickMostSpecificWard = ({
  city,
  district,
  candidates,
}: {
  city: string;
  district: string;
  candidates: Array<string | null | undefined>;
}) => {
  const normalizedCity = normalizeVNLocationName(city);
  const normalizedDistrict = normalizeVNLocationName(district);
  const wardCandidates = compactUnique(candidates);

  return (
    wardCandidates.find((candidate) => {
      const normalizedCandidate = normalizeVNLocationName(candidate);
      return normalizedCandidate && normalizedCandidate !== normalizedDistrict && normalizedCandidate !== normalizedCity;
    }) ??
    wardCandidates[0] ??
    ''
  );
};

const buildAddressLine = (address: ReverseGeocodeAddress | undefined, displayName: string) => {
  const detailedParts = compactUnique([
    address?.house_number,
    address?.road,
    address?.amenity,
    address?.building,
    address?.retail,
    address?.neighbourhood,
    address?.suburb,
    address?.quarter,
    address?.hamlet,
  ]);

  if (detailedParts.length > 0) {
    return detailedParts.join(', ');
  }

  const displayParts = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return compactUnique(displayParts).join(', ');
};

export const extractDetectedAddress = (payload: ReverseGeocodeResponse): CurrentDetectedAddress => {
  const address = payload.address;
  const displayName = payload.display_name?.trim() ?? '';

  const city = pickFirst(address?.city, address?.province, address?.state, address?.municipality, address?.region);
  const district = pickFirst(address?.city_district, address?.district, address?.county, address?.state_district);
  const ward = pickMostSpecificWard({
    city,
    district,
    candidates: [
      address?.borough,
      address?.quarter,
      address?.neighbourhood,
      address?.residential,
      address?.city_block,
      address?.suburb,
      address?.village,
      address?.town,
      address?.hamlet,
    ],
  });

  const rawCity = city.trim().toLowerCase();
  const rawDistrict = district.trim().toLowerCase();
  const rawWard = ward.trim().toLowerCase();

  return {
    addressLine: buildAddressLine(address, displayName),
    city,
    district: rawDistrict && rawDistrict === rawCity ? '' : district,
    ward: rawWard && (rawWard === rawDistrict || rawWard === rawCity) ? '' : ward,
    displayName,
    latitude: Number(payload.lat ?? 0),
    longitude: Number(payload.lon ?? 0),
  };
};

export const getGeolocationPermissionState = async (): Promise<GeolocationPermissionState> => {
  if (!('permissions' in navigator) || !navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unsupported';
  }
};

export const getCurrentGeolocationPosition = (options: PositionOptions = GEOLOCATION_OPTIONS) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

export const reverseGeocodeCurrentPosition = async (lat: number, lon: number): Promise<CurrentDetectedAddress> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'vi',
    });

    const response = await fetch(`${REVERSE_GEOCODE_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode API error: ${response.status}`);
    }

    const payload = (await response.json()) as ReverseGeocodeResponse;
    return extractDetectedAddress(payload);
  } finally {
    clearTimeout(timeout);
  }
};
