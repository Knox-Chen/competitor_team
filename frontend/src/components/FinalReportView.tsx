import React from 'react';

interface Props {
  // 后端可能返回两种形态：
  // 1) AgentOutput：{ agent, title, timestamp, data: {...} }
  // 2) final_report 直接是“字符串化 JSON”："{\"executive_summary\": ... }"
  reportData: any;
}

function tryParseJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function normalizeReportData(reportData: any): any {
  if (typeof reportData === 'string') {
    return tryParseJson(reportData) || {};
  }

  if (reportData && typeof reportData === 'object') {
    // 常见：AgentOutput.data 是对象，或者是 JSON 字符串
    if ('data' in reportData) {
      const inner = reportData.data;
      if (typeof inner === 'string') {
        return tryParseJson(inner) || {};
      }
      if (inner && typeof inner === 'object') {
        return inner;
      }
    }

    // 兜底：final_report 可能直接就是 {executive_summary: ...}
    if ('executive_summary' in reportData || 'market_overview' in reportData) {
      return reportData;
    }
  }

  return {};
}

const FinalReportView: React.FC<Props> = ({ reportData }) => {
  const data = normalizeReportData(reportData);
  const hasAnySection =
    data &&
    (data.executive_summary ||
      data.market_overview ||
      data.swot_analysis ||
      data.strategic_recommendations ||
      data.conclusion);

  return (
    <div className="final-report-view">
      {!hasAnySection && (
        <section className="report-section">
          <h3>完整分析报告</h3>
          <p className="muted">检测到报告数据结构异常或解析失败，下面展示解析后的原始内容：</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </section>
      )}
      {data.executive_summary && (
        <section className="report-section">
          <h3>执行摘要</h3>
          <p className="overview">{data.executive_summary.overview}</p>
          <div className="sub-block">
            <div className="label">关键发现</div>
            <ul className="bullet-list">
              {(data.executive_summary.key_findings || []).map((f: string, i: number) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="sub-block">
            <div className="label">建议摘要</div>
            <p>{data.executive_summary.recommendations_summary}</p>
          </div>
        </section>
      )}

      {data.market_overview && (
        <section className="report-section">
          <h3>市场概览</h3>
          <div className="info-row">
            <span className="label">市场规模：</span>
            <span>{data.market_overview.market_size}</span>
          </div>
          <div className="info-row">
            <span className="label">增长趋势：</span>
            <span>{data.market_overview.growth_trend}</span>
          </div>
          <div className="info-row">
            <span className="label">主要玩家：</span>
            <div className="tag-list">
              {(data.market_overview.key_players || []).map((p: string, i: number) => (
                <span key={i} className="tag">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.swot_analysis && (
        <section className="report-section">
          <h3>SWOT 分析</h3>
          <div className="swot-grid">
            <div className="swot-item strengths">
              <h4>优势</h4>
              <ul className="bullet-list">
                {(data.swot_analysis.strengths || []).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="swot-item weaknesses">
              <h4>劣势</h4>
              <ul className="bullet-list">
                {(data.swot_analysis.weaknesses || []).map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="swot-item opportunities">
              <h4>机会</h4>
              <ul className="bullet-list">
                {(data.swot_analysis.opportunities || []).map((o: string, i: number) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
            <div className="swot-item threats">
              <h4>威胁</h4>
              <ul className="bullet-list">
                {(data.swot_analysis.threats || []).map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {data.strategic_recommendations && (
        <section className="report-section">
          <h3>战略建议</h3>
          <div className="recommendations-list">
            {data.strategic_recommendations.map((rec: any, i: number) => (
              <div key={i} className="recommendation-card">
                <div className="recommendation-header">
                  <span className="priority">{rec.priority}</span>
                  <h4>{rec.recommendation}</h4>
                </div>
                <p className="rationale">{rec.rationale}</p>
                <ul className="bullet-list">
                  {(rec.action_items || []).map((a: string, j: number) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.conclusion && (
        <section className="report-section">
          <h3>结论</h3>
          <p>{data.conclusion.summary}</p>
          <p className="muted">
            <span className="label">未来展望：</span>
            {data.conclusion.future_outlook}
          </p>
        </section>
      )}
    </div>
  );
};

export default FinalReportView;

