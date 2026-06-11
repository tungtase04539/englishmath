-- Cổng duyệt tài khoản: giáo viên đăng ký mới phải được admin duyệt mới vào app

-- Thêm cột approved (mặc định false = chờ duyệt)
alter table public.mathenglish_profiles
  add column if not exists approved boolean not null default false;

-- Grandfather: tất cả tài khoản hiện có giữ nguyên quyền truy cập (đã duyệt)
update public.mathenglish_profiles set approved = true;

-- Cập nhật trigger tạo profile: admin tự động duyệt, giáo viên (và role khác) chờ duyệt
create or replace function public.handle_new_user_mathenglish()
returns trigger as $$
begin
  insert into public.mathenglish_profiles (id, role, full_name, email, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student') = 'admin'
  );
  return new;
end;
$$ language plpgsql security definer;
