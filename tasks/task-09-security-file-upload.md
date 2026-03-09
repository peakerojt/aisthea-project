# Task 09 - Security: File Upload Security

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Giới hạn file upload về size và type để ngăn chặn upload malware hoặc file độc hại.

## Vấn đề hiện tại

```typescript
// ❌ Không kiểm tra gì - nguy hiểm
upload.single('image')
// Attacker có thể upload:
// - File .exe, .sh (malware)
// - File quá lớn → DoS server
```

## Giải pháp với Multer

```typescript
import multer from 'multer';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh: JPG, PNG, WebP'), false);
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(), // dùng memory trước khi upload lên cloud
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});
```

## Checklist

- [ ] Kiểm tra `upload.middleware.ts` hoặc nơi cấu hình multer
- [ ] Giới hạn `fileSize` <= 2MB
- [ ] Giới hạn MIME type: chỉ `image/jpeg`, `image/png`, `image/webp`
- [ ] Không lưu file trực tiếp vào server disk → upload lên Cloudinary/S3
- [ ] Thêm error handling khi upload thất bại
- [ ] Test: upload file .exe → phải bị reject
- [ ] Test: upload file > 2MB → phải bị reject

## Tham khảo

- multer docs: https://github.com/expressjs/multer
