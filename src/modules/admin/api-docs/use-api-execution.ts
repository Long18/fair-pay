import { useState, useCallback, useRef } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import type {
  ApiCatalogEntry,
  ApiExecutionRequest,
  ApiExecutionResult,
  ApiExecutionHistoryEntry,
} from './types';

const MAX_HISTORY = 20;
const TIMEOUT_MS = 30_000;
const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

export function useApiExecution() {
  const [result, setResult] = useState<ApiExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ApiExecutionHistoryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (entry: ApiCatalogEntry, overrides: Partial<ApiExecutionRequest> = {}) => {
      // Cancel any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setResult(null);

      const start = performance.now();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const request: ApiExecutionRequest = {
        operation_id: entry.id,
        transport: entry.kind,
        target: entry.path ?? entry.function_name ?? '',
        method: entry.method,
        run_mode: entry.callability,
        ...overrides,
      };

      let res: ApiExecutionResult;
      try {
        if (entry.callability === 'direct_rpc') {
          res = await executeRpc(entry, request, controller.signal);
        } else if (entry.callability === 'direct_http') {
          res = await executeHttp(request, controller.signal);
        } else if (entry.callability === 'proxy_admin') {
          res = await executeProxy(request, controller.signal);
        } else {
          res = {
            success: false,
            status: 0,
            duration_ms: 0,
            error: 'Endpoint is disabled and cannot be executed from the console.',
          };
        }
      } catch (err) {
        const isAbort = (err as Error).name === 'AbortError';
        res = {
          success: false,
          status: 0,
          duration_ms: 0,
          error: isAbort ? `Request timed out after ${TIMEOUT_MS / 1000}s` : String((err as Error).message),
        };
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }

      res.duration_ms = Math.round(performance.now() - start);
      res.request_echo = request;

      // Truncate data if too large
      if (res.data !== undefined) {
        const approxSize = JSON.stringify(res.data).length;
        if (approxSize > MAX_PAYLOAD_BYTES) {
          res.data = { _truncated: true, _size_bytes: approxSize, _preview: JSON.stringify(res.data).slice(0, 500) };
        }
      }

      setResult(res);

      const histEntry: ApiExecutionHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation_id: entry.id,
        request,
        result: res,
      };
      setHistory((prev) => [histEntry, ...prev].slice(0, MAX_HISTORY));
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { execute, cancel, clearResult, result, isLoading, history };
}

// ─── Transport implementations ────────────────────────────────────────────────

async function executeRpc(
  entry: ApiCatalogEntry,
  request: ApiExecutionRequest,
  _signal: AbortSignal
): Promise<ApiExecutionResult> {
  const fnName = entry.function_name!;
  const args = request.rpc_args ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabaseClient.rpc(fnName as any, args);

  if (error) {
    return { success: false, status: 500, duration_ms: 0, error: error.message };
  }
  return { success: true, status: 200, duration_ms: 0, data };
}

async function executeHttp(
  request: ApiExecutionRequest,
  signal: AbortSignal
): Promise<ApiExecutionResult> {
  const url = new URL(request.target, window.location.origin);

  if (request.query) {
    Object.entries(request.query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
  Object.assign(fetchHeaders, request.headers);

  const resp = await fetch(url.toString(), {
    method: request.method ?? 'GET',
    headers: fetchHeaders,
    body: request.body != null ? JSON.stringify(request.body) : undefined,
    signal,
  });

  let data: unknown;
  const contentType = resp.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try { data = await resp.json(); } catch { data = null; }
  } else {
    data = await resp.text();
  }

  return { success: resp.ok, status: resp.status, duration_ms: 0, data };
}

async function executeProxy(
  request: ApiExecutionRequest,
  signal: AbortSignal
): Promise<ApiExecutionResult> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return { success: false, status: 401, duration_ms: 0, error: 'Not authenticated — cannot use proxy.' };
  }

  const resp = await fetch('/api/admin/api-console/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  try {
    const result = await resp.json() as ApiExecutionResult;
    return result;
  } catch {
    return { success: false, status: resp.status, duration_ms: 0, error: 'Invalid response from proxy.' };
  }
}
