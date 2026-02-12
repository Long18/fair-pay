/**
 * Create payOS Payment Link
 *
 * Supabase Edge Function that creates a payOS payment link.
 * Requires PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY env vars.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentLinkRequest {
  amount: number;
  description: string;
  orderCode?: number;
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
}

/**
 * Generate HMAC_SHA256 signature for payOS
 * Data format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
 */
async function createSignature(data: Record<string, string | number>, checksumKey: string): Promise<string> {
  const sortedKeys = Object.keys(data).sort();
  const signData = sortedKeys.map(key => `${key}=${data[key]}`).join('&');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signData));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('PAYOS_CLIENT_ID');
    const apiKey = Deno.env.get('PAYOS_API_KEY');
    const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      return new Response(JSON.stringify({ error: 'payOS not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreatePaymentLinkRequest = await req.json();
    const { amount, description, returnUrl, cancelUrl, buyerName, buyerEmail } = body;

    if (!amount || !description || !returnUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderCode = body.orderCode || Number(String(Date.now()).slice(-6));

    // Create signature
    const signatureData = {
      amount,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    };
    const signature = await createSignature(signatureData, checksumKey);

    // Call payOS API
    const payosBody = {
      orderCode,
      amount: Math.round(amount),
      description: description.slice(0, 9), // payOS limit for non-linked accounts
      cancelUrl,
      returnUrl,
      signature,
      ...(buyerName && { buyerName }),
      ...(buyerEmail && { buyerEmail }),
    };

    const payosResponse = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payosBody),
    });

    const payosData = await payosResponse.json();

    if (payosData.code !== '00') {
      return new Response(JSON.stringify({ error: payosData.desc || 'payOS error', details: payosData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      checkoutUrl: payosData.data.checkoutUrl,
      paymentLinkId: payosData.data.paymentLinkId,
      qrCode: payosData.data.qrCode,
      orderCode: payosData.data.orderCode,
      amount: payosData.data.amount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
