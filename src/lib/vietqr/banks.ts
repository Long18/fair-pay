/**
 * Vietnamese Banks Configuration
 *
 * List of supported Vietnamese banks for VietQR.
 * Bank codes and BIN numbers from VietQR specification.
 */

import { VietQRBank } from './types';

export const VIETNAMESE_BANKS: VietQRBank[] = [
  { code: 'VCB', bin: '970436', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank' },
  { code: 'TCB', bin: '970407', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank' },
  { code: 'MB', bin: '970422', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MB Bank' },
  { code: 'ACB', bin: '970416', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
  { code: 'VPB', bin: '970432', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
  { code: 'TPB', bin: '970423', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
  { code: 'STB', bin: '970403', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank' },
  { code: 'HDB', bin: '970437', name: 'Ngân hàng TMCP Phát Triển TP.HCM', shortName: 'HDBank' },
  { code: 'VIB', bin: '970441', name: 'Ngân hàng TMCP Quốc Tế Việt Nam', shortName: 'VIB' },
  { code: 'SHB', bin: '970443', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB' },
  { code: 'EIB', bin: '970431', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', shortName: 'Eximbank' },
  { code: 'MSB', bin: '970426', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB' },
  { code: 'OCB', bin: '970448', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB' },
  { code: 'BIDV', bin: '970418', name: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam', shortName: 'BIDV' },
  { code: 'VBA', bin: '970405', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', shortName: 'Agribank' },
  { code: 'CTG', bin: '970415', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank' },
  { code: 'SCB', bin: '970429', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB' },
  { code: 'ABB', bin: '970425', name: 'Ngân hàng TMCP An Bình', shortName: 'ABBank' },
  { code: 'BAB', bin: '970409', name: 'Ngân hàng TMCP Bắc Á', shortName: 'BacABank' },
  { code: 'CAKE', bin: '546034', name: 'Ngân hàng số CAKE by VPBank', shortName: 'CAKE' },
  { code: 'CBB', bin: '970444', name: 'Ngân hàng Xây Dựng', shortName: 'CB Bank' },
  { code: 'CIMB', bin: '422589', name: 'CIMB Bank Vietnam', shortName: 'CIMB' },
  { code: 'DAB', bin: '970406', name: 'Ngân hàng TMCP Đông Á', shortName: 'DongA Bank' },
  { code: 'GPB', bin: '970408', name: 'Ngân hàng Dầu Khí Toàn Cầu', shortName: 'GPBank' },
  { code: 'IVB', bin: '970434', name: 'Ngân hàng TNHH Indovina', shortName: 'Indovina' },
  { code: 'KLB', bin: '970452', name: 'Ngân hàng TMCP Kiên Long', shortName: 'KienLongBank' },
  { code: 'LPB', bin: '970449', name: 'Ngân hàng TMCP Bưu Điện Liên Việt', shortName: 'LienVietPostBank' },
  { code: 'NAB', bin: '970428', name: 'Ngân hàng TMCP Nam Á', shortName: 'Nam A Bank' },
  { code: 'NCB', bin: '970419', name: 'Ngân hàng TMCP Quốc Dân', shortName: 'NCB' },
  { code: 'NVB', bin: '970446', name: 'Ngân hàng TMCP Quốc Việt', shortName: 'Viet Capital Bank' },
  { code: 'PBVN', bin: '970439', name: 'Ngân hàng Public Bank Việt Nam', shortName: 'Public Bank' },
  { code: 'PGB', bin: '970430', name: 'Ngân hàng TMCP Xăng Dầu Petrolimex', shortName: 'PGBank' },
  { code: 'PVCB', bin: '970412', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', shortName: 'PVcomBank' },
  { code: 'SEAB', bin: '970440', name: 'Ngân hàng TMCP Đông Nam Á', shortName: 'SeABank' },
  { code: 'SGICB', bin: '970400', name: 'Ngân hàng TNHH MTV Sài Gòn Công Thương', shortName: 'SaigonBank' },
  { code: 'SHBVN', bin: '970424', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', shortName: 'Shinhan Bank' },
  { code: 'Ubank', bin: '546035', name: 'Ngân hàng số Ubank by VPBank', shortName: 'Ubank' },
  { code: 'VAB', bin: '970427', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank' },
  { code: 'VCCB', bin: '970454', name: 'Ngân hàng TMCP Bản Việt', shortName: 'Viet Capital Bank' },
  { code: 'VIETBANK', bin: '970433', name: 'Ngân hàng TMCP Việt Nam Thương Tín', shortName: 'VietBank' },
  { code: 'VNPTMONEY', bin: '971011', name: 'VNPT Money', shortName: 'VNPT Money' },
  { code: 'WOO', bin: '970457', name: 'Ngân hàng Woori Việt Nam', shortName: 'Woori Bank' },
];

/**
 * Get bank by code
 */
export function getBankByCode(code: string): VietQRBank | undefined {
  return VIETNAMESE_BANKS.find(bank => bank.code === code);
}

/**
 * Get bank by BIN
 */
export function getBankByBin(bin: string): VietQRBank | undefined {
  return VIETNAMESE_BANKS.find(bank => bank.bin === bin);
}

/**
 * Get all banks sorted by popularity (common banks first)
 */
export function getPopularBanks(): VietQRBank[] {
  const popularCodes = ['VCB', 'TCB', 'MB', 'ACB', 'VPB', 'TPB', 'BIDV', 'CTG', 'VBA'];
  const popular = popularCodes
    .map(code => VIETNAMESE_BANKS.find(b => b.code === code))
    .filter((b): b is VietQRBank => b !== undefined);
  const others = VIETNAMESE_BANKS
    .filter(b => !popularCodes.includes(b.code))
    .sort((a, b) => a.shortName.localeCompare(b.shortName));
  return [...popular, ...others];
}

/**
 * Search banks by name or code
 */
export function searchBanks(query: string): VietQRBank[] {
  const q = query.toLowerCase();
  return VIETNAMESE_BANKS.filter(bank =>
    bank.code.toLowerCase().includes(q) ||
    bank.shortName.toLowerCase().includes(q) ||
    bank.name.toLowerCase().includes(q)
  );
}
