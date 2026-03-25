# i18n docs

## Cau truc

- `client/src/i18n/config.ts`
  - Cau hinh i18n runtime.
- `client/src/i18n/locales/`
  - Locale dang duoc app su dung.
- `docs/i18n/`
  - Tai lieu van hanh, audit va merge.
- `docs/i18n/reference/`
  - Tai lieu tham chieu va refined package khong duoc load vao runtime.

## Quy uoc

- Chi sua `locales/` khi thay doi text hien thi that su trong app.
- Dung `docs/i18n/reference/` de doi chieu, khong copy de nguyen package tham khao vao `locales/`.
- Neu co guide hoac package tam thoi moi, uu tien dat vao `docs/i18n/reference/` de giu runtime `client/src/i18n` gon.
