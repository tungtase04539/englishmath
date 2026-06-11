-- Đóng lỗ hổng: policy cũ cho phép user tự update profile của mình → có thể
-- tự đặt approved=true (tự duyệt) hoặc tự đổi role. App không dùng tính năng
-- user tự sửa profile (chỉ admin sửa), nên siết lại: CHỈ admin được update.

drop policy if exists "Users can update their own profile, admins can update all" on public.mathenglish_profiles;

create policy "Only admins can update profiles"
  on public.mathenglish_profiles for update
  using (public.get_my_role_mathenglish() = 'admin')
  with check (public.get_my_role_mathenglish() = 'admin');
