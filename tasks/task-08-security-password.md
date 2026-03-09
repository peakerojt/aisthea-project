# Task 08 - Security: Password Hashing

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo password được hash bằng bcrypt với salt đủ mạnh trước khi lưu vào database. Không bao giờ lưu plain text password.

## Vấn đề hiện tại

```typescript
// ❌ Lưu plain password - CỰC KỲ NGUY HIỂM
await prisma.user.create({
  data: { email, password: req.body.password }
});
```

## Giải pháp

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10; // Tối thiểu 10

// Đăng ký
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
await prisma.user.create({
  data: { email, password: hashedPassword }
});

// Đăng nhập
const isMatch = await bcrypt.compare(inputPassword, user.password);
if (!isMatch) {
  return res.status(401).json({ success: false, message: 'Sai mật khẩu' });
}
```

## Checklist

- [ ] Kiểm tra `auth.controller.ts` — có dùng bcrypt khi register không?
- [ ] Kiểm tra `auth.controller.ts` — có dùng bcrypt.compare khi login không?
- [ ] Salt rounds >= 10
- [ ] Không có chỗ nào log hoặc return raw password
- [ ] Khi update password cũng phải hash lại
- [ ] Kiểm tra `user.service.ts` — không expose password trong response

## Anti-patterns cần tránh

```typescript
// ❌ Return password trong response
res.json({ user: { id, email, password } }); // XÓA password ra

// ❌ Log password
console.log('Password:', password);

// ❌ Salt quá yếu
bcrypt.hash(password, 1); // Phải >= 10
```
