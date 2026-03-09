# Task 17 - Image Storage (Cloud)

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Chuyển image storage từ local disk / database BLOB sang cloud storage (Cloudinary). Lưu ảnh trong DB rất nặng và không scalable.

## Vấn đề hiện tại

```typescript
// ❌ Lưu ảnh trực tiếp vào server hoặc DB
// → Server đầy disk, chậm, không scale được
```

## Giải pháp: Cloudinary

```bash
npm install cloudinary multer-storage-cloudinary
```

```typescript
// server/src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'aisthea/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  }),
});

export const uploadToCloud = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
```

```typescript
// Dùng trong route
router.post('/products/:id/images', authMiddleware, adminMiddleware,
  uploadToCloud.array('images', 5),
  productController.uploadImages
);

// Trong controller - URL đã là Cloudinary URL
const imageUrls = req.files.map(f => f.path);
```

## Checklist

- [ ] Tạo tài khoản Cloudinary (miễn phí)
- [ ] Thêm credentials vào `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Tạo `cloudinary.config.ts`
- [ ] Thay thế multer local storage bằng CloudinaryStorage
- [ ] Lưu URL (string) vào database thay vì binary data
- [ ] Test upload ảnh và verify URL hoạt động
