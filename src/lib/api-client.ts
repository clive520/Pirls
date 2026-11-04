/**
 * PIRLS 統一型別安全 API 客戶端 (API Client)
 * 提供超時防護、自動 JSON 序列化、標準錯誤封裝與快取控制
 */

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * 核心 fetch 封裝器
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeoutMs = 30000, headers, body, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string>),
  };

  const serializedBody =
    body !== undefined
      ? isFormData
        ? body
        : typeof body === 'string'
        ? body
        : JSON.stringify(body)
      : undefined;

  try {
    const res = await fetch(endpoint, {
      ...rest,
      headers: requestHeaders,
      body: serializedBody,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        (typeof data === 'object' && (data?.error || data?.message)) ||
        (typeof data === 'string' && data) ||
        res.statusText ||
        `API 請求失敗 (${res.status})`;

      throw new ApiError(errorMsg, res.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(`網路請求逾時 (${timeoutMs / 1000}秒)，請稍後再試。`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || '連線異常，請檢查網路連線狀態。', 500);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 便捷 RESTful 方法集
 */
export const api = {
  get: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, { method: 'GET', ...options }),

  post: <T = any>(url: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, { method: 'POST', body, ...options }),

  put: <T = any>(url: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, { method: 'PUT', body, ...options }),

  patch: <T = any>(url: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, { method: 'PATCH', body, ...options }),

  delete: <T = any>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(url, { method: 'DELETE', ...options }),
};
