import { AnalysisRequest, AnalysisResponse } from '../types/competitor-analysis';

const RAW_ENDPOINT = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_TOKEN = (import.meta as any).env?.VITE_API_TOKEN || '';

const ANALYZE_PATH = '/api/competitor-analysis/analyze';
// 只有明确是完整接口路径（含 /api/ 或 /stream_run）时才直接使用，否则当 base 拼上 ANALYZE_PATH
const ANALYZE_ENDPOINT =
  RAW_ENDPOINT.includes('/api/') || RAW_ENDPOINT.includes('/stream_run')
    ? RAW_ENDPOINT
    : `${RAW_ENDPOINT}${ANALYZE_PATH}`;

export async function analyzeCompetitors(query: string): Promise<AnalysisResponse> {
  // 生产环境若未配置 VITE_API_BASE_URL，会请求当前站点同源 /api/...（需配合 Vercel rewrites 代理到 Render）
  if (import.meta.env.PROD && !RAW_ENDPOINT.trim()) {
    console.warn(
      '[API] VITE_API_BASE_URL 为空，将请求同源 /api/...；请配置 Vercel 或设置 VITE_API_BASE_URL 指向 Render。'
    );
  }

  try {
    const body: AnalysisRequest = { query };

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (API_TOKEN) {
      (headers as any).Authorization = API_TOKEN.startsWith('Bearer ')
        ? API_TOKEN
        : `Bearer ${API_TOKEN}`;
    }

    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: AnalysisResponse = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误，请检查后端服务'
    };
  }
}

