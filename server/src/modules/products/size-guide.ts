type SizeGuideCellValue = string | number;

export type SizeGuideMeasureTip = {
  key: string;
  label: string;
  description: string;
};

export type SizeGuideTemplateDefinition = {
  key: string;
  name: string;
  category: 'tops' | 'dresses' | 'pants' | 'shoes' | 'accessories';
  fitType: string | null;
  unit: 'cm';
  columns: string[];
  rows: Array<Record<string, SizeGuideCellValue>>;
  howToMeasure: SizeGuideMeasureTip[];
};

export type ProductSizeGuide = {
  available: boolean;
  templateKey: string;
  templateName: string;
  category: SizeGuideTemplateDefinition['category'];
  fitType: string | null;
  fitNote: string | null;
  unit: 'cm';
  columns: string[];
  rows: Array<Record<string, SizeGuideCellValue>>;
  howToMeasure: SizeGuideMeasureTip[];
  modelInfo: {
    heightCm: number | null;
    weightKg: number | null;
    wearSize: string | null;
  };
  summary: string;
};

type ProductCategoryLike = {
  name?: string | null;
  slug?: string | null;
};

type ProductSizeGuideSource = {
  sizeGuideTemplateKey?: string | null;
  fitType?: string | null;
  fitNote?: string | null;
  modelHeightCm?: number | null;
  modelWeightKg?: number | null;
  modelWearSize?: string | null;
  category?: ProductCategoryLike | null;
};

const SIZE_GUIDE_TEMPLATES: SizeGuideTemplateDefinition[] = [
  {
    key: 'tops-regular',
    name: 'Áo / Blazer / Coat',
    category: 'tops',
    fitType: 'regular',
    unit: 'cm',
    columns: ['Size', 'Vai', 'Ngực', 'Dài áo', 'Tay áo'],
    rows: [
      { Size: 'S', Vai: 42, Ngực: 96, 'Dài áo': 66, 'Tay áo': 60 },
      { Size: 'M', Vai: 44, Ngực: 100, 'Dài áo': 68, 'Tay áo': 61 },
      { Size: 'L', Vai: 46, Ngực: 104, 'Dài áo': 70, 'Tay áo': 62 },
      { Size: 'XL', Vai: 48, Ngực: 108, 'Dài áo': 72, 'Tay áo': 63 },
    ],
    howToMeasure: [
      { key: 'shoulder', label: 'Đo vai', description: 'Đo từ đầu vai trái sang đầu vai phải trên mặt phẳng áo.' },
      { key: 'chest', label: 'Đo ngực', description: 'Đo ngang thân áo tại vị trí rộng nhất của ngực rồi nhân đôi.' },
      { key: 'length', label: 'Đo dài áo', description: 'Đo từ điểm cao nhất ở vai xuống hết gấu áo.' },
      { key: 'sleeve', label: 'Đo tay áo', description: 'Đo từ đường vai xuống hết cổ tay áo.' },
    ],
  },
  {
    key: 'tops-oversized',
    name: 'Áo / Blazer / Coat Oversized',
    category: 'tops',
    fitType: 'oversized',
    unit: 'cm',
    columns: ['Size', 'Vai', 'Ngực', 'Dài áo', 'Tay áo'],
    rows: [
      { Size: 'S', Vai: 46, Ngực: 106, 'Dài áo': 69, 'Tay áo': 61 },
      { Size: 'M', Vai: 48, Ngực: 112, 'Dài áo': 71, 'Tay áo': 62 },
      { Size: 'L', Vai: 50, Ngực: 118, 'Dài áo': 73, 'Tay áo': 63 },
      { Size: 'XL', Vai: 52, Ngực: 124, 'Dài áo': 75, 'Tay áo': 64 },
    ],
    howToMeasure: [
      { key: 'shoulder', label: 'Đo vai', description: 'Đặt áo phẳng và đo ngang phần vai trên cùng.' },
      { key: 'chest', label: 'Đo ngực', description: 'Đo ngang thân tại phần ngực rồi nhân đôi để ra chu vi.' },
      { key: 'length', label: 'Đo dài áo', description: 'Đo từ đỉnh vai xuống gấu áo để ước lượng độ phủ.' },
      { key: 'sleeve', label: 'Đo tay áo', description: 'Đo dọc tay từ vai xuống cổ tay.' },
    ],
  },
  {
    key: 'dresses-regular',
    name: 'Váy',
    category: 'dresses',
    fitType: 'regular',
    unit: 'cm',
    columns: ['Size', 'Ngực', 'Eo', 'Mông', 'Dài váy'],
    rows: [
      { Size: 'S', Ngực: 84, Eo: 66, Mông: 92, 'Dài váy': 118 },
      { Size: 'M', Ngực: 88, Eo: 70, Mông: 96, 'Dài váy': 120 },
      { Size: 'L', Ngực: 92, Eo: 74, Mông: 100, 'Dài váy': 122 },
      { Size: 'XL', Ngực: 96, Eo: 78, Mông: 104, 'Dài váy': 124 },
    ],
    howToMeasure: [
      { key: 'bust', label: 'Đo ngực', description: 'Đo ngang phần rộng nhất của ngực rồi nhân đôi.' },
      { key: 'waist', label: 'Đo eo', description: 'Đo tại vòng eo tự nhiên, vị trí nhỏ nhất của thân người.' },
      { key: 'hip', label: 'Đo mông', description: 'Đo tại phần rộng nhất của hông/mông rồi nhân đôi.' },
      { key: 'dress-length', label: 'Đo dài váy', description: 'Đo từ vai xuống tới gấu váy.' },
    ],
  },
  {
    key: 'pants-regular',
    name: 'Quần',
    category: 'pants',
    fitType: 'regular',
    unit: 'cm',
    columns: ['Size', 'Eo', 'Mông', 'Đùi', 'Dài quần'],
    rows: [
      { Size: 'S', Eo: 68, Mông: 92, Đùi: 56, 'Dài quần': 96 },
      { Size: 'M', Eo: 72, Mông: 96, Đùi: 58, 'Dài quần': 98 },
      { Size: 'L', Eo: 76, Mông: 100, Đùi: 60, 'Dài quần': 100 },
      { Size: 'XL', Eo: 80, Mông: 104, Đùi: 62, 'Dài quần': 102 },
    ],
    howToMeasure: [
      { key: 'waist', label: 'Đo eo', description: 'Đo ngang lưng quần ở trạng thái phẳng rồi nhân đôi.' },
      { key: 'hip', label: 'Đo mông', description: 'Đo ngang phần rộng nhất của quần ở mông rồi nhân đôi.' },
      { key: 'thigh', label: 'Đo đùi', description: 'Đo ngang ống quần ngay dưới đáy quần khoảng 2-3cm rồi nhân đôi.' },
      { key: 'pant-length', label: 'Đo dài quần', description: 'Đo từ mép lưng quần xuống hết gấu quần.' },
    ],
  },
  {
    key: 'shoes-standard',
    name: 'Giày',
    category: 'shoes',
    fitType: 'regular',
    unit: 'cm',
    columns: ['Size', 'Chiều dài bàn chân', 'EU', 'VN'],
    rows: [
      { Size: '36', 'Chiều dài bàn chân': 22.5, EU: 36, VN: 35 },
      { Size: '37', 'Chiều dài bàn chân': 23, EU: 37, VN: 36 },
      { Size: '38', 'Chiều dài bàn chân': 23.5, EU: 38, VN: 37 },
      { Size: '39', 'Chiều dài bàn chân': 24, EU: 39, VN: 38 },
      { Size: '40', 'Chiều dài bàn chân': 24.5, EU: 40, VN: 39 },
    ],
    howToMeasure: [
      { key: 'foot-length', label: 'Đo chiều dài bàn chân', description: 'Đặt chân trên giấy, đánh dấu gót và mũi chân dài nhất rồi đo khoảng cách.' },
      { key: 'compare', label: 'Đối chiếu bảng size', description: 'So sánh chiều dài bàn chân với cột tương ứng để chọn size.' },
      { key: 'socks', label: 'Tính tới tất', description: 'Nếu thường mang tất dày, cộng thêm khoảng 0.3-0.5cm khi chọn size.' },
      { key: 'wide-feet', label: 'Chân bè', description: 'Nếu chân bè hoặc mu cao, ưu tiên tăng 1 size để thoải mái hơn.' },
    ],
  },
  {
    key: 'accessories-standard',
    name: 'Phụ kiện',
    category: 'accessories',
    fitType: null,
    unit: 'cm',
    columns: ['Size', 'Dài', 'Rộng', 'Ghi chú'],
    rows: [
      { Size: 'One size', Dài: 20, Rộng: 8, 'Ghi chú': 'Tham khảo theo sản phẩm thực tế' },
    ],
    howToMeasure: [
      { key: 'length', label: 'Đo chiều dài', description: 'Đo cạnh dài nhất của sản phẩm.' },
      { key: 'width', label: 'Đo chiều rộng', description: 'Đo cạnh rộng nhất của sản phẩm.' },
      { key: 'opening', label: 'Đo chu vi', description: 'Với dây, vòng hoặc túi, đo thêm chu vi/miệng mở nếu cần.' },
      { key: 'notes', label: 'Đọc ghi chú', description: 'Kiểm tra mô tả sản phẩm để biết thêm chi tiết chất liệu hoặc độ co giãn.' },
    ],
  },
];

const TEMPLATE_BY_KEY = new Map(SIZE_GUIDE_TEMPLATES.map((template) => [template.key, template]));

const normalizeToken = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const inferTemplateKeyFromCategory = (category: ProductCategoryLike | null | undefined, fitType?: string | null) => {
  const categoryBlob = `${normalizeToken(category?.name)} ${normalizeToken(category?.slug)}`.trim();
  const normalizedFitType = normalizeToken(fitType);

  if (categoryBlob.includes('giay') || categoryBlob.includes('shoe')) return 'shoes-standard';
  if (categoryBlob.includes('phu kien') || categoryBlob.includes('accessor')) return 'accessories-standard';
  if (categoryBlob.includes('vay') || categoryBlob.includes('dam') || categoryBlob.includes('dress')) return 'dresses-regular';
  if (categoryBlob.includes('quan') || categoryBlob.includes('pant') || categoryBlob.includes('trouser') || categoryBlob.includes('jean')) return 'pants-regular';

  if (normalizedFitType.includes('oversized') || normalizedFitType.includes('rong')) return 'tops-oversized';

  return 'tops-regular';
};

const coercePositiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const buildModelSummary = (modelInfo: ProductSizeGuide['modelInfo']) => {
  const parts: string[] = [];
  if (modelInfo.heightCm) parts.push(`cao ${modelInfo.heightCm}cm`);
  if (modelInfo.weightKg) parts.push(`nặng ${modelInfo.weightKg}kg`);
  if (modelInfo.wearSize) parts.push(`mặc size ${modelInfo.wearSize}`);
  return parts.length > 0 ? `Model ${parts.join(', ')}` : null;
};

export const listSizeGuideTemplates = () =>
  SIZE_GUIDE_TEMPLATES.map((template) => ({
    key: template.key,
    name: template.name,
    category: template.category,
    fitType: template.fitType,
    unit: template.unit,
    columns: template.columns,
  }));

export const getSizeGuideTemplate = (key: string | null | undefined) => {
  if (!key) return null;
  return TEMPLATE_BY_KEY.get(key) ?? null;
};

export const resolveProductSizeGuide = (source: ProductSizeGuideSource): ProductSizeGuide | null => {
  const templateKey = source.sizeGuideTemplateKey || inferTemplateKeyFromCategory(source.category, source.fitType);
  const template = getSizeGuideTemplate(templateKey);

  if (!template) return null;

  const modelInfo = {
    heightCm: coercePositiveNumber(source.modelHeightCm),
    weightKg: coercePositiveNumber(source.modelWeightKg),
    wearSize: source.modelWearSize?.trim() || null,
  };

  const fitNote = source.fitNote?.trim() || null;
  const fitType = source.fitType?.trim() || template.fitType || null;
  const modelSummary = buildModelSummary(modelInfo);

  const summary = [
    `Bảng size ${template.name}.`,
    fitType ? `Fit ${fitType}.` : null,
    fitNote ? `Fit note: ${fitNote}.` : null,
    modelSummary ? `${modelSummary}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    available: true,
    templateKey,
    templateName: template.name,
    category: template.category,
    fitType,
    fitNote,
    unit: template.unit,
    columns: template.columns,
    rows: template.rows,
    howToMeasure: template.howToMeasure,
    modelInfo,
    summary,
  };
};
