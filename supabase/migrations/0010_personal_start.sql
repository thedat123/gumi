-- =====================================================================
-- Level Down Challenge — Hành trình CÁ NHÂN HOÁ
-- Trước đây: mọi người chung một mốc app_config.start_date (chiến dịch chung).
-- Bây giờ:   "Ngày 1" của mỗi người = ngày họ tạo tài khoản (profiles.created_at),
--            tính theo lịch giờ Việt Nam. Ai tham gia ngày nào thì đó là Ngày 1
--            của riêng họ; các ngày 2..21 đếm tiếp theo lịch từ mốc đó.
--
-- Chỉ cần đổi _campaign_day() (mọi RPC đều gọi hàm này) + get_campaign_state().
-- app_config.start_date từ nay không còn được dùng (giữ bảng để không phá seed cũ).
-- =====================================================================

-- Ngày hiện tại của NGƯỜI DÙNG hiện hành: (hôm nay − ngày tạo hồ sơ) + 1.
-- <1 sẽ không xảy ra (tạo hồ sơ hôm nay = Ngày 1); >21 = đã kết thúc.
-- Trả NULL nếu chưa có hồ sơ (khách chưa đăng nhập) — các RPC gọi nó đều đã
-- chặn uid null trước đó nên an toàn.
create or replace function public._campaign_day() returns int
language sql stable set search_path = public, pg_temp as $$
  select (public._today_vn() - (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date) + 1
  from public.profiles p where p.id = auth.uid();
$$;

-- Trạng thái hành trình cho trang landing/dashboard. Cá nhân hoá theo hồ sơ.
-- Khách chưa đăng nhập (không có hồ sơ): luôn 'running', day 0 — hành trình
-- sẵn sàng để bắt đầu, Ngày 1 sẽ tính từ lúc họ tạo tài khoản.
create or replace function public.get_campaign_state() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare sd date; d int;
begin
  select (p.created_at at time zone 'Asia/Ho_Chi_Minh')::date into sd
  from public.profiles p where p.id = auth.uid();

  if sd is null then
    return json_build_object(
      'phase', 'running', 'day', 0,
      'startDate', to_char(public._today_vn(), 'YYYY-MM-DD')
    );
  end if;

  d := (public._today_vn() - sd) + 1;
  return json_build_object(
    'phase', case when d > 21 then 'ended' else 'running' end,
    'day', least(greatest(d, 1), 21),
    'startDate', to_char(sd, 'YYYY-MM-DD')
  );
end; $$;

-- Landing gọi trước khi đăng nhập.
grant execute on function public.get_campaign_state() to anon;
