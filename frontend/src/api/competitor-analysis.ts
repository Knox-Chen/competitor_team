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
  // 线上构建若未配置 VITE_API_BASE_URL，会变成请求当前站点 /api/...，导致 net::ERR_FAILED / 404
  if (import.meta.env.PROD && !RAW_ENDPOINT.trim()) {
    return {
      success: false,
      error:
        '未配置后端地址：请在 Vercel 环境变量中设置 VITE_API_BASE_URL 为 Render 后端 https 地址并重新部署。'
    };
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

