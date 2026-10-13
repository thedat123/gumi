-- =====================================================================
-- BUCKET CÔNG KHAI 'cards' — ảnh card khoe thành tích để chia sẻ Facebook/Messenger.
-- Desktop không gửi được FILE ảnh lên FB (sharer.php chỉ đọc og:image của 1 URL),
-- nên ta upload ảnh card lên đây (public) rồi Edge Function 'share-card' trả HTML og:image.
-- Ảnh card chỉ là tổng kết thành tích (không nhạy cảm) → để public đọc được.
-- Idempotent: on conflict do nothing / create policy if not exists.
-- =====================================================================

insert into storage.buckets (id, name, public)
  values ('cards', 'cards', true)
  on conflict (id) do nothing;

-- Chủ sở hữu (đã đăng nhập) upload/ghi đè vào THƯ MỤC của chính mình: cards/<uid>/<file>.
drop policy if exists cards_insert on storage.objects;
create policy cards_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cards_update on storage.objects;
create policy cards_update on storage.objects for update to authenticated
  using (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ai cũng ĐỌC được (bucket public) — để crawler Facebook tải ảnh qua og:image.
drop policy if exists cards_read on storage.objects;
create policy cards_read on storage.objects for select
  using (bucket_id = 'cards');
