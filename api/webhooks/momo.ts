import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client with service role key
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

interface MomoWebhookPayload {
    signature: string;
    phone: string;
    tranId: number | string;
    ackTime: string;
    partnerId?: string;
    partnerName?: string;
    amount: number;
    comment?: string;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body as MomoWebhookPayload;

        // Verify webhook signature (MANDATORY - fail closed)
        const expectedSignature = process.env.MOMO_WEBHOOK_SIGNATURE;
        if (!expectedSignature) {
            console.error('MOMO_WEBHOOK_SIGNATURE not configured - rejecting webhook');
            return res.status(500).json({ error: 'Webhook not configured' });
        }
        if (payload.signature !== expectedSignature) {
            console.error('Invalid webhook signature', {
                timestamp: new Date().toISOString(),
                ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
                payloadHash: typeof payload === 'object' ? Object.keys(payload).join(',') : 'invalid',
            });
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Log the webhook event
        const { error: logError } = await supabaseAdmin
            .from('momo_webhook_logs')
            .insert({
                event_type: 'payment_received',
                phone: payload.phone,
                tran_id: String(payload.tranId),
                amount: payload.amount,
                comment: payload.comment,
                partner_id: payload.partnerId,
                partner_name: payload.partnerName,
                raw_payload: payload,
                processed: false,
            });

        if (logError) {
            console.error('Failed to log webhook:', logError);
            // Continue processing even if logging fails
        }

        // Extract reference code from comment
        const referenceCode = extractReferenceCode(payload.comment);
        if (!referenceCode) {
            console.log('No reference code found in comment:', payload.comment);
            return res.status(200).json({
                message: 'Webhook received but no reference code found'
            });
        }

        // Find the payment request by reference code
        const { data: paymentRequest, error: requestError } = await supabaseAdmin
            .from('momo_payment_requests')
            .select('*')
            .eq('reference_code', referenceCode)
            .eq('status', 'pending')
            .single();

        if (requestError || !paymentRequest) {
            console.log('Payment request not found for reference:', referenceCode);
            return res.status(200).json({
                message: 'Payment request not found or already processed'
            });
        }

        // Verify amount matches
        if (Number(paymentRequest.amount) !== payload.amount) {
            console.error('Amount mismatch:', {
                expected: paymentRequest.amount,
                received: payload.amount,
            });

            // Mark payment request as failed
            await supabaseAdmin
                .from('momo_payment_requests')
                .update({
                    status: 'failed',
                    momo_tran_id: String(payload.tranId),
                    raw_webhook_data: payload,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', paymentRequest.id);

            return res.status(200).json({
                message: 'Amount mismatch'
            });
        }

        // Call the verify_momo_payment function
        const { data: verifyResult, error: verifyError } = await supabaseAdmin
            .rpc('verify_momo_payment', {
                p_reference_code: referenceCode,
                p_tran_id: String(payload.tranId),
                p_amount: payload.amount,
                p_webhook_data: payload,
            });

        if (verifyError) {
            console.error('Failed to verify payment:', verifyError);
            return res.status(500).json({
                error: 'Failed to verify payment'
            });
        }

        // Update webhook log as processed
        if (verifyResult?.success) {
            await supabaseAdmin
                .from('momo_webhook_logs')
                .update({
                    processed: true,
                    matched_request_id: verifyResult.payment_request_id,
                })
                .eq('tran_id', String(payload.tranId));

            console.log('Payment verified successfully:', {
                paymentRequestId: verifyResult.payment_request_id,
                expenseSplitId: verifyResult.expense_split_id,
                settledAmount: verifyResult.settled_amount,
            });
        }

        // Return success to MoMo
        return res.status(200).json({
            success: true,
            message: 'Payment processed successfully'
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
}

/**
 * Extract reference code from comment
 * Expected format: FP-XXXXXXXX-XXXX
 */
function extractReferenceCode(comment?: string): string | null {
    if (!comment) return null;

    // Look for FP- pattern
    const match = comment.match(/FP-[A-Za-z0-9]+-[A-Za-z0-9]+/);
    return match ? match[0] : null;
}
