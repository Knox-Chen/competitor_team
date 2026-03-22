import json
import os
import logging
import ast
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 从 main.py 所在目录加载 .env，不依赖当前工作目录
_env_file = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_file)

logger = logging.getLogger("local_backend")
logging.basicConfig(level=logging.INFO)


class AnalysisRequest(BaseModel):
  query: str


class AnalysisResponse(BaseModel):
  success: bool
  data: Optional[dict] = None
  error: Optional[str] = None


app = FastAPI(title="Local Coze Proxy Backend")


def _cors_origins() -> List[str]:
  """本地开发 + 可选生产前端（Render/Vercel 等通过 CORS_ORIGINS 传入，逗号分隔）。"""
  base = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
  extra = os.getenv("CORS_ORIGINS", "").strip()
  if not extra:
    return base
  for part in extra.split(","):
    # 浏览器 Origin 不带末尾 /，配置里若写了 https://xxx.app/ 会导致预检失败 → net::ERR_FAILED
    o = part.strip().rstrip("/")
    if o and o not in base:
      base.append(o)
  return base


# 匹配所有 Vercel 部署（生产 + Preview 随机子域），避免只配了主域名而预览环境 CORS 失败
_DEFAULT_VERCEL_ORIGIN_RE = r"https://.+\.vercel\.app$"
_CORS_VERCEL_REGEX = os.getenv("CORS_VERCEL_REGEX", _DEFAULT_VERCEL_ORIGIN_RE).strip() or None

app.add_middleware(
  CORSMiddleware,
  allow_origins=_cors_origins(),
  allow_origin_regex=_CORS_VERCEL_REGEX,
  # 前端 fetch 未带 Cookie；False 时预检与 * 头更不易被浏览器拦（与 allow_credentials=True 组合时部分浏览器对 * 头更严）
  allow_credentials=False,
  allow_methods=["*"],
  allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)


@app.get("/health")
def health() -> dict:
  """供 Render / 负载均衡健康检查使用。"""
  return {"status": "ok"}


@app.on_event("startup")
def _log_env():
  endpoint = os.getenv("COZE_REMOTE_ENDPOINT", "").strip()
  token_set = bool(os.getenv("COZE_REMOTE_TOKEN", "").strip())
  logger.info(" .env 路径: %s", _env_file)
  logger.info(" COZE_REMOTE_ENDPOINT: %s", endpoint or "(未设置)")
  logger.info(" COZE_REMOTE_TOKEN: %s", "已设置" if token_set else "(未设置)")
  logger.info(" CORS allow_origins: %s", _cors_origins())
  logger.info(" CORS allow_origin_regex: %s", _CORS_VERCEL_REGEX or "(未启用)")


@app.post("/api/competitor-analysis/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
  """
  本地轻量后端：
  - 接受前端 { query }
  - 转发到 Coze HTTP 接入地址
  - 将结果包装成统一的 AnalysisResponse 结构返回前端
  """
  endpoint = os.getenv("COZE_REMOTE_ENDPOINT", "").strip()
  token = os.getenv("COZE_REMOTE_TOKEN", "").strip()
  project_id = os.getenv("COZE_PROJECT_ID", "").strip()
  session_id = os.getenv("COZE_SESSION_ID", "").strip()

  query = (request.query or "").strip()
  logger.info("Incoming /analyze query: %s", query[:120])
  logger.info("Config COZE_REMOTE_ENDPOINT: %s", endpoint or "(未设置)")

  if not endpoint:
    return AnalysisResponse(success=False, error="COZE_REMOTE_ENDPOINT 未配置")
  if not project_id:
    return AnalysisResponse(success=False, error="COZE_PROJECT_ID 未配置（扣子 stream_run 必填）")

  headers = {"Content-Type": "application/json"}
  if token:
    # 允许传入已含 Bearer 前缀或纯 token
    headers["Authorization"] = token if token.startswith("Bearer ") else f"Bearer {token}"

  # 扣子给的 /stream_run 请求体格式（按官方 curl 示例）
  payload = {
    "content": {
      "query": {
        "prompt": [
          {
            "type": "text",
            "content": {"text": query},
          }
        ]
      }
    },
    "type": "query",
    "session_id": session_id or "competitor-analysis-session",
    "project_id": int(project_id),
  }

  try:
    logger.info("Calling Coze endpoint: %s with query: %s", endpoint, query[:50])
    async with httpx.AsyncClient(timeout=180) as client:
      logger.info("POST %s headers=%s payload=%s", endpoint, {k: ("***" if k.lower()=="authorization" else v) for k, v in headers.items()}, payload)
      resp = await client.post(endpoint, headers=headers, json=payload)
      logger.info("Remote response: status=%s content-type=%s", resp.status_code, resp.headers.get("content-type"))

    if resp.status_code != 200:
      logger.error("Coze error: %s %s", resp.status_code, resp.text)
      return AnalysisResponse(
        success=False,
        error=f"远端分析失败，HTTP {resp.status_code}",
      )

    content_type = (resp.headers.get("content-type") or "").lower()

    # /stream_run 走 SSE 文本流（例如 text/event-stream），按 SSE 解析
    text = resp.text
    logger.info("Coze raw response length: %s, content-type=%s", len(text), content_type or "(none)")

    def _parse_sse_events(raw: str) -> List[Dict[str, Any]]:
      events = []
      for line in raw.splitlines():
        line = line.strip()
        if line.startswith("data:"):
          candidate = line[len("data:"):].strip()
          if not candidate:
            continue
          try:
            events.append(json.loads(candidate))
          except json.JSONDecodeError:
            pass
      return events

    def _try_parse_json_like(s: str) -> Optional[Any]:
      """
      兼容 tool 输出的多种包裹形式：
      1) 直接 JSON 字符串：'{"agent": "..."}'
      2) Python dict 字符串："{'content': '{\"agent\": ... }'}"
      """
      if not s or not isinstance(s, str):
        return None
      ss = s.strip()
      # 先直接 JSON
      try:
        return json.loads(ss)
      except Exception:
        pass
      # 再尝试 python literal
      try:
        lit = ast.literal_eval(ss)
        # 形如 {'content': '...json...'}
        if isinstance(lit, dict) and isinstance(lit.get("content"), str):
          inner = lit["content"].strip()
          try:
            return json.loads(inner)
          except Exception:
            return inner
        return lit
      except Exception:
        return None

    def _collect_from_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
      """
      从 SSE 事件里收集：
      - team_process: tool 输出中标题为「竞品分析框架/竞品选择/竞品信息汇总」等的 AgentOutput
      - final_report: 标题为「完整竞品分析报告」的 AgentOutput
      - pdf_url: tool 输出中 success/pdf_url
      """
      team_process: List[Dict[str, Any]] = []
      final_report: Optional[Dict[str, Any]] = None
      pdf_url: str = ""

      def _maybe_add_agent_output(obj: Any):
        nonlocal final_report
        if not isinstance(obj, dict):
          return
        if "agent" in obj and "title" in obj and "timestamp" in obj and "data" in obj:
          # 报告单独放 final_report
          if obj.get("title") == "完整竞品分析报告" or obj.get("agent") == "竞品分析报告子智能体":
            final_report = obj
          else:
            team_process.append(obj)

      def _maybe_set_pdf(obj: Any):
        nonlocal pdf_url
        if not isinstance(obj, dict):
          return
        if obj.get("success") is True and isinstance(obj.get("pdf_url"), str):
          pdf_url = obj.get("pdf_url") or ""

      def _handle_tool_payload(val: Any):
        parsed = val
        # 常见：tool_response 为 {"content": "<json string>"} 或 {"content": {"...": ...}}
        if isinstance(val, dict):
          # stream_run 标准：tool_response.result 是 JSON 字符串
          if "result" in val and val.get("result") is not None:
            parsed = val.get("result")
          elif "content" in val:
            parsed = val.get("content")
        if isinstance(parsed, str):
          parsed = _try_parse_json_like(parsed)
        _maybe_set_pdf(parsed)
        _maybe_add_agent_output(parsed)

      # 递归遍历 event：
      # - 兼容 “messages(role=tool)” 形式
      # - 兼容你描述的 SSE 规范：data.type=tool_response，内容在 data.content.tool_response
      def _walk(x: Any):
        if isinstance(x, dict):
          # 1) SSE 标准：type=tool_response/tool_request
          t = x.get("type")
          if t == "tool_response":
            c = x.get("content")
            if isinstance(c, dict) and c.get("tool_response") is not None:
              _handle_tool_payload(c.get("tool_response"))
          # 2) messages 列表里的 role=tool
          role = x.get("role")
          if role == "tool":
            if x.get("content") is not None:
              _handle_tool_payload(x.get("content"))
          # 3) 兜底：content 里可能直接挂 tool_response
          c = x.get("content")
          if isinstance(c, dict) and c.get("tool_response") is not None:
            _handle_tool_payload(c.get("tool_response"))

          for v in x.values():
            _walk(v)
        elif isinstance(x, list):
          for v in x:
            _walk(v)

      for ev in events:
        _walk(ev)

      # 去重（按 agent+title+timestamp）
      seen = set()
      deduped: List[Dict[str, Any]] = []
      for item in team_process:
        key = (item.get("agent"), item.get("title"), item.get("timestamp"))
        if key in seen:
          continue
        seen.add(key)
        deduped.append(item)

      return {
        "team_process": deduped,
        "final_report": final_report or {},
        "pdf_url": pdf_url,
      }

    events = _parse_sse_events(text)
    collected = _collect_from_events(events)
    if collected.get("team_process") or collected.get("final_report") or collected.get("pdf_url"):
      return AnalysisResponse(success=True, data=collected)

    # 便于排查：返回事件类型列表和一条带 content 的 event 样本（截断）
    def _safe_sample(e: Dict[str, Any], max_len: int = 1200) -> Any:
      try:
        s = json.dumps(e, ensure_ascii=False)
        return s[:max_len] + ("..." if len(s) > max_len else "")
      except Exception:
        return str(e)[:max_len]

    sample = None
    tool_sample = None
    seen_types: List[str] = []
    for ev in events:
      if isinstance(ev, dict) and ev.get("type") not in seen_types:
        seen_types.append(ev.get("type"))

    # 优先给一条 tool_response 事件样本，便于定位 tool_response 的真实结构
    for ev in reversed(events):
      if isinstance(ev, dict) and ev.get("type") == "tool_response":
        tool_sample = _safe_sample(ev)
        break
    for ev in reversed(events):
      if isinstance(ev, dict) and ev.get("content"):
        sample = _safe_sample(ev)
        break

    return AnalysisResponse(
      success=False,
      error="远端 SSE 流中未包含竞品分析结果（team_process/final_report）。请确认 Coze 工作流是否有节点输出 research_process / analysis_report，或把工作流最终状态以 JSON 写入流。",
      data={
        "event_count": len(events),
        "event_types": seen_types,
        "sample_event": sample,
        "tool_response_sample": tool_sample,
        "remote": {
          "endpoint": endpoint,
          "status": resp.status_code,
          "content_type": content_type or None,
          "body_prefix": text[:400],
        },
      },
    )

  except Exception as e:
    logger.exception("Error calling Coze backend: %s", e)
    return AnalysisResponse(success=False, error=f"调用远端服务出错: {e}")


if __name__ == "__main__":
  import uvicorn

  # Render 等平台注入 PORT；本地默认 5050
  port = int(os.getenv("PORT", "5050"))
  reload = os.getenv("RENDER", "").lower() not in ("true", "1", "yes")
  uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)

