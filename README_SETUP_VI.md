# THTTEX Ready Stock Fabric Program – ONLINE FINAL

Bản này được tạo trực tiếp từ backup offline đã chỉnh sửa.

## Đã chuẩn hóa trước khi đóng gói
- `Cần bổ sung` → `Đang cập nhật`.
- `Polyeste` → `Polyester`.
- Giữ nguyên toàn bộ text EN / VI / 中文, 2.106 lô, Sales contact, Fabric Mapping và 17 hình ảnh đã có.
- Không có Lot Image.
- Chỉ sử dụng:
  - Logo / Hero / Contact.
  - 4 Application Images.
  - 10 Representative Fabric Images.

## Kiến trúc
- GitHub Pages: giao diện website.
- Supabase Database: products, text, Sales, mapping.
- Supabase Storage: 17 hình ảnh hiện tại và các ảnh thay thế sau này.
- Supabase Auth: đăng nhập Admin.
- RLS: khách chỉ đọc; Admin được chỉnh.

## A. Tạo Supabase
1. Tạo project Supabase.
2. SQL Editor → chạy toàn bộ `supabase/schema.sql`.
3. Authentication → Users → Add user → tạo email/password cho Admin.
4. Copy UUID của Admin.
5. SQL Editor chạy:

```sql
insert into public.admin_users(user_id)
values ('UUID_CUA_BAN')
on conflict do nothing;
```

6. Trong Supabase Dashboard, lấy:
   - Project URL
   - Publishable key (khuyến nghị) hoặc legacy anon key.

7. Sửa `config.js`:

```js
window.THT_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseKey: "sb_publishable_YOUR_KEY",
  storageBucket: "thttex-stock-images"
};
```

Không sử dụng secret key hoặc service_role key trong frontend.

## B. Đưa lên GitHub Pages
1. Tạo repository, ví dụ `thttex-ready-stock`.
2. Upload TOÀN BỘ nội dung package này vào root repository.
3. Commit lên branch `main`.
4. GitHub → Repository → Settings → Pages.
5. Source → Deploy from a branch.
6. Branch `main`, folder `/ (root)` → Save.
7. Chờ GitHub cấp URL.

## C. Khởi tạo dữ liệu online lần đầu
1. Mở URL GitHub Pages.
2. Bấm `Admin Login`.
3. Đăng nhập bằng tài khoản đã tạo trong Supabase Auth.
4. Bấm Edit Mode → Admin.
5. Bấm `Initialize Supabase with current version`.
6. Hệ thống sẽ:
   - Upsert 2.106 lô.
   - Lưu toàn bộ text 3 ngôn ngữ.
   - Lưu Fabric Mapping.
   - Lưu Sales contact.
   - Upload 17 ảnh hiện tại từ package lên Supabase Storage.
7. Sau khi hoàn tất, website chuyển sang dùng dữ liệu Supabase làm nguồn chính.

## D. Sau khi online
Không cần sửa code cho các cập nhật thường xuyên:
- Text → Edit Marketing Text.
- Ảnh → Manage Images.
- Mapping mã vải → Representative Image Mapping.
- Sales → Sales Contacts.
- Giá / số lượng / Featured / Active → Product Manager.

## Lưu ý
- Website vẫn hiển thị bản packaged seed trước lần Initialize đầu tiên.
- Sau khi Initialize thành công, mọi cập nhật sẽ lấy từ Supabase.
- Nếu xóa một ảnh sau khi Initialize, ảnh sẽ thực sự để trống cho đến khi Admin upload ảnh mới.
