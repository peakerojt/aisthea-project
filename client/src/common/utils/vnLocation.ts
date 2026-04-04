export interface VNLocationOption {
  code: string;
  name: string;
}

const normalizeLocationOptions = (items?: Array<{ code: string | number; name: string }> | null): VNLocationOption[] =>
  (items ?? []).map((item) => ({
    code: String(item.code),
    name: item.name,
  }));

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch VN location data from ${url}`);
  }

  return response.json() as Promise<T>;
};

export const normalizeVNLocationName = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,-]/g, ' ')
    .replace(/\b(tp|t p|tinh|thanh pho|thanh pho trung uong|thi xa|tx|quan|q|huyen|h|phuong|p|xa|x|thi tran|tt)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveWardCodeFromText = (wards: VNLocationOption[], text?: string | null) => {
  const normalizedText = normalizeVNLocationName(text);
  if (!normalizedText) {
    return '';
  }

  const matchedWard = wards.find((ward) => {
    const normalizedWard = normalizeVNLocationName(ward.name);
    return normalizedWard && normalizedText.includes(normalizedWard);
  });

  return matchedWard?.code ?? '';
};

export const fetchVNProvinces = () =>
  fetchJson<Array<{ code: string | number; name: string }>>('https://provinces.open-api.vn/api/p/')
    .then((items) => normalizeLocationOptions(items));

export const fetchVNDistricts = async (provinceCode: string) => {
  const data = await fetchJson<{ districts?: Array<{ code: string | number; name: string }> }>(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
  return normalizeLocationOptions(data.districts);
};

export const fetchVNWards = async (districtCode: string) => {
  const data = await fetchJson<{ wards?: Array<{ code: string | number; name: string }> }>(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
  return normalizeLocationOptions(data.wards);
};

export const resolveVNLocationSelection = async (
  location: {
    city?: string | null;
    district?: string | null;
    ward?: string | null;
    addressLine?: string | null;
    displayName?: string | null;
  },
  provinces: VNLocationOption[]
) => {
  const matchedProvince = provinces.find(
    (province) => normalizeVNLocationName(province.name) === normalizeVNLocationName(location.city)
  );

  if (!matchedProvince) {
    return {
      provinceCode: '',
      districts: [] as VNLocationOption[],
      districtCode: '',
      wards: [] as VNLocationOption[],
      wardCode: '',
    };
  }

  const districts = await fetchVNDistricts(matchedProvince.code);
  let matchedDistrict = districts.find(
    (district) => normalizeVNLocationName(district.name) === normalizeVNLocationName(location.district)
  );

  if (!matchedDistrict && location.ward) {
    matchedDistrict = districts.find(
      (district) => normalizeVNLocationName(district.name) === normalizeVNLocationName(location.ward)
    );
  }

  if (!matchedDistrict && location.ward) {
    for (const district of districts) {
      const wards = await fetchVNWards(district.code);
      const matchedWard = wards.find(
        (ward) => normalizeVNLocationName(ward.name) === normalizeVNLocationName(location.ward)
      );

      if (matchedWard) {
        return {
          provinceCode: matchedProvince.code,
          districts,
          districtCode: district.code,
          wards,
          wardCode: matchedWard.code,
        };
      }
    }
  }

  if (!matchedDistrict) {
    return {
      provinceCode: matchedProvince.code,
      districts,
      districtCode: '',
      wards: [] as VNLocationOption[],
      wardCode: '',
    };
  }

  const wards = await fetchVNWards(matchedDistrict.code);
  const matchedWard = wards.find(
    (ward) => normalizeVNLocationName(ward.name) === normalizeVNLocationName(location.ward)
  );
  const inferredWardCode =
    matchedWard?.code ||
    resolveWardCodeFromText(wards, location.addressLine) ||
    resolveWardCodeFromText(wards, location.displayName) ||
    '';

  return {
    provinceCode: matchedProvince.code,
    districts,
    districtCode: matchedDistrict.code,
    wards,
    wardCode: inferredWardCode,
  };
};
