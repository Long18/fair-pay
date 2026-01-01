// Common Vietnamese banks for VietQR integration
// Based on VietQR API: https://api.vietqr.io/v2/android-app-deeplinks

export interface VietQRBank {
    id: string;
    name: string;
    code: string;
    shortName: string;
}

export const VIETQR_BANKS: VietQRBank[] = [
    { id: 'vcb', code: 'VCB', name: 'Vietcombank', shortName: 'Vietcombank' },
    { id: 'bidv', code: 'BIDV', name: 'BIDV', shortName: 'BIDV' },
    { id: 'vietinbank', code: 'ICB', name: 'VietinBank', shortName: 'VietinBank' },
    { id: 'agribank', code: 'AGR', name: 'Agribank', shortName: 'Agribank' },
    { id: 'acb', code: 'ACB', name: 'ACB', shortName: 'ACB' },
    { id: 'tcb', code: 'TCB', name: 'Techcombank', shortName: 'Techcombank' },
    { id: 'mb', code: 'MB', name: 'MB Bank', shortName: 'MB Bank' },
    { id: 'vpbank', code: 'VPB', name: 'VPBank', shortName: 'VPBank' },
    { id: 'tpb', code: 'TPB', name: 'TPBank', shortName: 'TPBank' },
    { id: 'shb', code: 'SHB', name: 'SHB', shortName: 'SHB' },
    { id: 'vib', code: 'VIB', name: 'VIB', shortName: 'VIB' },
    { id: 'msb', code: 'MSB', name: 'MSB', shortName: 'MSB' },
    { id: 'cake', code: 'CAKE', name: 'Cake by VPBank', shortName: 'Cake' },
    { id: 'ubank', code: 'UBANK', name: 'Ubank by VPBank', shortName: 'Ubank' },
    { id: 'scb', code: 'SCB', name: 'SCB', shortName: 'SCB' },
    { id: 'abbank', code: 'ABB', name: 'ABBank', shortName: 'ABBank' },
    { id: 'oceanbank', code: 'OCB', name: 'OCB', shortName: 'OCB' },
    { id: 'ncb', code: 'NCB', name: 'NCB', shortName: 'NCB' },
    { id: 'sacombank', code: 'STB', name: 'Sacombank', shortName: 'Sacombank' },
    { id: 'eximbank', code: 'EIB', name: 'Eximbank', shortName: 'Eximbank' },
    { id: 'hdbank', code: 'HDB', name: 'HDBank', shortName: 'HDBank' },
    { id: 'vietcapitalbank', code: 'VCCB', name: 'VietCapital Bank', shortName: 'VietCapital' },
    { id: 'bacabank', code: 'BAB', name: 'BacABank', shortName: 'BacABank' },
    { id: 'pvcombank', code: 'PVCB', name: 'PVcomBank', shortName: 'PVcomBank' },
    { id: 'seabank', code: 'SEAB', name: 'SeABank', shortName: 'SeABank' },
];

/**
 * Generate VietQR deeplink for opening bank app
 * @param bankApp - Bank app ID (e.g., 'vcb', 'mb')
 * @param account - Account number
 * @param bankCode - Bank code (e.g., 'VCB', 'MB')
 * @param amount - Optional amount
 * @param description - Optional transaction description
 * @returns VietQR deeplink URL
 */
export function generateVietQRDeeplink(
    bankApp: string,
    account: string,
    bankCode: string,
    amount?: string,
    description?: string
): string {
    const baseUrl = 'https://dl.vietqr.io/pay';
    const params = new URLSearchParams({
        app: bankApp,
        ba: `${account}@${bankCode}`,
    });

    if (amount) {
        params.append('am', amount);
    }

    if (description) {
        params.append('tn', description);
    }

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Find bank by ID
 */
export function findBankById(id: string): VietQRBank | undefined {
    return VIETQR_BANKS.find(bank => bank.id === id);
}

/**
 * Find bank by code
 */
export function findBankByCode(code: string): VietQRBank | undefined {
    return VIETQR_BANKS.find(bank => bank.code === code);
}


