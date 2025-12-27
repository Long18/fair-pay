-- Migration: Update user full names to proper Vietnamese names
-- This migration updates the full_name field in the profiles table based on email addresses

-- Update full names for users
UPDATE profiles
SET full_name = CASE email
  WHEN 'thang.nguyen@amanotes.com' THEN 'Nguyễn Việt Thắng'
  WHEN 'sy.do@amanotes.com' THEN 'Đỗ Tiến Sỹ'
  WHEN 'tuan.dinh@amanotes.com' THEN 'Đinh Quốc Tuấn'
  WHEN 'vu.hoang@amanotes.com' THEN 'Hoàng Trần Anh Vũ'
  WHEN 'loi.ddd@amanotes.com' THEN 'Dương Đặng Đức Lợi'
  WHEN 'minh.hn@amanotes.com' THEN 'Hồ Ngọc Minh'
  WHEN 'anh.pham@amanotes.com' THEN 'Phạm Nguyễn Phương Anh'
  WHEN 'long.nh@amanotes.com' THEN 'Ngô Hoàng Long'
  WHEN 'luan.nn@amanotes.com' THEN 'Nguyễn Ngọc Luân'
  WHEN 'minh.htb@amanotes.com' THEN 'Huỳnh Trần Bảo Minh'
  WHEN 'son.nm@amanotes.com' THEN 'Nguyễn Minh Sơn'
  WHEN 'nhon.tm@amanotes.com' THEN 'Triệu Minh Nhơn'
  WHEN 'quoc.th@amanotes.com' THEN 'Tăng Hải Quốc'
  WHEN 'tha.hv@amanotes.com' THEN 'Hồ Văn Thả'
  WHEN 'hai.nd@amanotes.com' THEN 'Nguyễn Đăng Hải'
  WHEN 'truc.pdt@amanotes.com' THEN 'Phan Đình Thanh Trúc'
  WHEN 'nghi.ct@amanotes.com' THEN 'Châu Thục Nghi'
  WHEN 'tuyen.ttk@amanotes.com' THEN 'Trần Thị Kim Tuyến'
  WHEN 'nam.nh@amanotes.com' THEN 'Nguyễn Hoàng Nam'
  WHEN 'nhi.htt@amanotes.com' THEN 'Huỳnh Thị Thảo Nhi'
  WHEN 'thuan.dlc@amanotes.com' THEN 'Dương Lê Công Thuần'
  WHEN 'duc.nh@amanotes.com' THEN 'Nguyễn Hữu Đức'
  WHEN 'thai.nb@amanotes.com' THEN 'Nguyễn Bửu Thái'
  WHEN 'dang.lh@amanotes.com' THEN 'Lê Hải Đăng'
  WHEN 'long.lnt@amanotes.com' THEN 'Lê Nguyễn Thành Long'
  WHEN 'anh.th@amanotes.com' THEN 'Tăng Hoàng Anh'
  WHEN 'ngan.nk@amanotes.com' THEN 'Nguyễn Kim Ngân'
  WHEN 'anh.dn@amanotes.com' THEN 'Đặng Nhật Anh'
  WHEN 'ngan.dtt@amanotes.com' THEN 'Đỗ Thị Tuyết Ngân'
  WHEN 'tam.nt2@amanotes.com' THEN 'Nguyễn Tiến Tâm'
  WHEN 'mai.vu@amanotes.com' THEN 'Vũ Hoàng Mai'
  WHEN 'thinh.pp@amanotes.com' THEN 'Phạm Phúc Thịnh'
  WHEN 'ha.ntn@amanotes.com' THEN 'Nguyễn Trần Như Hạ'
  WHEN 'phuc.ph@amanotes.com' THEN 'Phạm Hoàng Phúc'
  ELSE full_name
END
WHERE email IN (
  'thang.nguyen@amanotes.com',
  'sy.do@amanotes.com',
  'tuan.dinh@amanotes.com',
  'vu.hoang@amanotes.com',
  'loi.ddd@amanotes.com',
  'minh.hn@amanotes.com',
  'anh.pham@amanotes.com',
  'long.nh@amanotes.com',
  'luan.nn@amanotes.com',
  'minh.htb@amanotes.com',
  'son.nm@amanotes.com',
  'nhon.tm@amanotes.com',
  'quoc.th@amanotes.com',
  'tha.hv@amanotes.com',
  'hai.nd@amanotes.com',
  'truc.pdt@amanotes.com',
  'nghi.ct@amanotes.com',
  'tuyen.ttk@amanotes.com',
  'nam.nh@amanotes.com',
  'nhi.htt@amanotes.com',
  'thuan.dlc@amanotes.com',
  'duc.nh@amanotes.com',
  'thai.nb@amanotes.com',
  'dang.lh@amanotes.com',
  'long.lnt@amanotes.com',
  'anh.th@amanotes.com',
  'ngan.nk@amanotes.com',
  'anh.dn@amanotes.com',
  'ngan.dtt@amanotes.com',
  'tam.nt2@amanotes.com',
  'mai.vu@amanotes.com',
  'thinh.pp@amanotes.com',
  'ha.ntn@amanotes.com',
  'phuc.ph@amanotes.com'
);

-- Log the number of updated profiles
DO $$
DECLARE
  updated_count INT;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % profile(s) with Vietnamese names', updated_count;
END $$;

COMMENT ON TABLE profiles IS 'User profiles with full Vietnamese names';
