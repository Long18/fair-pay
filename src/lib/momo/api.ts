import {
    MomoTransactionHistory,
    MomoCheckTransactionResponse,
} from './types';
import { supabaseClient } from '@/utility/supabaseClient';

class MomoAPIService {
    private receiverPhone: string;

    constructor() {
        this.receiverPhone = import.meta.env.VITE_MOMO_RECEIVER_PHONE || '';
    }

    /**
     * Check if MoMo API is configured (server-side token is opaque to client)
     */
    isConfigured(): boolean {
        return !!this.receiverPhone;
    }

    private async getAuthToken(): Promise<string> {
        const { data: { session } } = await supabaseClient.auth.getSession()
        return session?.access_token || ''
    }

    /**
     * Generate QR code URL for payment via proxy endpoint
     */
    async generatePaymentQR(amount: number, referenceCode: string): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('MoMo API is not configured');
        }

        const token = await this.getAuthToken()
        const params = new URLSearchParams({
            amount: amount.toString(),
            referenceCode,
        })

        const response = await fetch(`/api/momo/qr?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
            throw new Error(`Failed to generate QR: ${response.status}`)
        }

        const data = await response.json()
        return data.qrUrl as string
    }

    /**
     * Check transaction by content/reference code
     */
    async checkTransactionByContent(
        referenceCode: string,
        phone?: string
    ): Promise<MomoCheckTransactionResponse> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'MoMo API is not configured',
            };
        }

        try {
            const token = await this.getAuthToken()
            const response = await fetch('/api/momo/check-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ referenceCode, phone }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.error === false && data.data) {
                return {
                    success: true,
                    exists: true,
                    transaction: data.data,
                };
            } else if (data.error === true || data.message) {
                return {
                    success: true,
                    exists: false,
                };
            }

            return {
                success: false,
                error: 'Unexpected response format',
            };
        } catch (error) {
            console.error('Error checking transaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(
        limit: number = 10,
        offset: number = 0,
        phone?: string
    ): Promise<MomoTransactionHistory> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'MoMo API is not configured',
            };
        }

        try {
            const token = await this.getAuthToken()
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            })
            if (phone) params.set('phone', phone)

            const response = await fetch(`/api/momo/history?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.error === false && Array.isArray(data.data)) {
                return {
                    success: true,
                    data: data.data,
                };
            }

            return {
                success: false,
                error: data.message || 'Failed to fetch transaction history',
            };
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Check transaction by transaction ID
     */
    async checkTransactionById(tranId: string): Promise<MomoCheckTransactionResponse> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'MoMo API is not configured',
            };
        }

        try {
            const token = await this.getAuthToken()
            const response = await fetch('/api/momo/check-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ tranId }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.error === false && data.data) {
                return {
                    success: true,
                    exists: true,
                    transaction: data.data,
                };
            } else if (data.error === true || data.message) {
                return {
                    success: true,
                    exists: false,
                };
            }

            return {
                success: false,
                error: 'Unexpected response format',
            };
        } catch (error) {
            console.error('Error checking transaction by ID:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Scan transaction history for a specific reference code
     */
    async scanForPayment(
        referenceCode: string,
        maxPages: number = 3
    ): Promise<MomoCheckTransactionResponse> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'MoMo API is not configured',
            };
        }

        try {
            const pageSize = 30;

            for (let page = 0; page < maxPages; page++) {
                const history = await this.getTransactionHistory(pageSize, page * pageSize);

                if (!history.success || !history.data) {
                    continue;
                }

                // Look for the reference code in comment field
                const matchingTransaction = history.data.find(
                    tx => tx.comment && tx.comment.includes(referenceCode)
                );

                if (matchingTransaction) {
                    return {
                        success: true,
                        exists: true,
                        transaction: matchingTransaction,
                    };
                }

                // If we got less than pageSize results, we've reached the end
                if (history.data.length < pageSize) {
                    break;
                }
            }

            return {
                success: true,
                exists: false,
            };
        } catch (error) {
            console.error('Error scanning for payment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    }

    /**
     * Validate webhook signature
     */
    validateWebhookSignature(signature: string, expectedSignature?: string): boolean {
        // If no expected signature is configured, skip validation (development mode)
        if (!expectedSignature) {
            console.warn('No webhook signature configured, skipping validation');
            return true;
        }

        return signature === expectedSignature;
    }
}

// Export a singleton instance
export const momoAPI = new MomoAPIService();

// Export the class for testing purposes
export { MomoAPIService };
