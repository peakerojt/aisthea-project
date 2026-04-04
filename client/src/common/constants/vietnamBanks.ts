export type VietnamBankOption = {
  code: string;
  shortName: string;
  name: string;
  kind: 'BANK' | 'WALLET';
};

let vietnamBankOptionsCache: VietnamBankOption[] | null = null;
let vietnamBankOptionsPromise: Promise<VietnamBankOption[]> | null = null;

const normalizeVietnamBankValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const getVietnamBankDisplayName = (bank: VietnamBankOption) => bank.shortName.trim() || bank.name.trim();

export const getVietnamBankDisplayLabel = (bank: VietnamBankOption) => getVietnamBankDisplayName(bank);

export const loadVietnamBankOptions = async () => {
  if (vietnamBankOptionsCache) {
    return vietnamBankOptionsCache;
  }

  if (!vietnamBankOptionsPromise) {
    vietnamBankOptionsPromise = import('./vietnamBanks.data').then((module) => {
      vietnamBankOptionsCache = module.vietnamBankOptions
        .filter((bank) => bank.kind === 'BANK')
        .map((bank) => ({ ...bank }));
      return vietnamBankOptionsCache;
    });
  }

  return vietnamBankOptionsPromise;
};

export const findVietnamBankOptionInList = (banks: VietnamBankOption[], query: string) => {
  const normalizedQuery = normalizeVietnamBankValue(query);
  if (!normalizedQuery) {
    return null;
  }

  return banks.find((bank) => {
    const candidates = [
      bank.code,
      bank.shortName,
      bank.name,
      getVietnamBankDisplayName(bank),
    ];

    return candidates.some((candidate) => normalizeVietnamBankValue(candidate) === normalizedQuery);
  }) ?? null;
};

export const findVietnamBankOptionByCodeInList = (banks: VietnamBankOption[], code?: string | null) => {
  const normalizedCode = normalizeVietnamBankValue(code ?? '');
  if (!normalizedCode) {
    return null;
  }

  return banks.find((bank) => normalizeVietnamBankValue(bank.code) === normalizedCode) ?? null;
};

export const filterVietnamBankOptionsInList = (banks: VietnamBankOption[], query: string) => {
  const normalizedQuery = normalizeVietnamBankValue(query);

  if (!normalizedQuery) {
    return banks;
  }

  return banks.filter((bank) => {
    const candidates = [
      bank.code,
      bank.shortName,
      bank.name,
      getVietnamBankDisplayName(bank),
    ];

    return candidates.some((candidate) => normalizeVietnamBankValue(candidate).includes(normalizedQuery));
  });
};

export const findVietnamBankOption = async (query: string) => {
  const banks = await loadVietnamBankOptions();
  return findVietnamBankOptionInList(banks, query);
};
