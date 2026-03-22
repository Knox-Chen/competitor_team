import React, { useState } from 'react';
import { analyzeCompetitors } from './api/competitor-analysis';
import { AgentOutput } from './types/competitor-analysis';
import TeamProcessView from './components/TeamProcessView';
import FinalReportView from './components/FinalReportView';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamProcess, setTeamProcess] = useState<AgentOutput[]>([]);
  const [finalReport, setFinalReport] = useState<AgentOutput | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!query.trim()) {
      setError('请输入要分析的产品，如：分析抖音的竞品');
      return;
    }

    setLoading(true);
    setError('');
    setTeamProcess([]);
    setFinalReport(null);
    setPdfUrl('');

    const result = await analyzeCompetitors(query);
    setLoading(false);

    if (result.success && result.data) {
      setTeamProcess(result.data.team_process || []);
      setFinalReport(result.data.final_report || null);
      setPdfUrl(result.data.pdf_url || '');
    } else {
      setError(result.error || '分析失败，请稍后重试');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-wrap">
          <h1 className="site-title">
            <span className="site-logo" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img" focusable="false">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="26" fill="rgba(255,255,255,0.08)" />
                <path
                  d="M18 41c8 6 20 6 28 0"
                  fill="none"
                  stroke="url(#g)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M22 26c4-10 16-10 20 0"
                  fill="none"
                  stroke="url(#g)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="25" cy="33" r="3.5" fill="#06b6d4" />
                <circle cx="39" cy="33" r="3.5" fill="#4f46e5" />
                <path
                  d="M32 34 L32 46"
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>专业竞品分析团队</span>
          </h1>
          {/* 右上角不再展示，把 Powered by 放到网站描述区域 */}
        </div>
        <p className="subtitle">
          多Agent竞品分析团队24h待命，为您生成全面的深度竞品分析报告和可视化团队工作历程。
          <span className="powered-by-inline">
            Powered by：
            <a
              href="https://www.coze.cn/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.coze.cn/
            </a>
          </span>
        </p>
      </header>

      <main className="app-main">
        <section className="arch-card" aria-label="专家团成员">
          <div className="arch-title">专家团成员</div>
          <div className="arch-grid">
            <div className="arch-item">
              <div className="arch-item-title">主智能体（Orchestrator）</div>
              <div className="arch-item-desc">解析用户意图，制定分析框架与维度，编排子智能体协同执行。</div>
            </div>
            <div className="arch-item">
              <div className="arch-item-title">竞品搜集筛选子智能体</div>
              <div className="arch-item-desc">检索并筛选核心竞品，输出竞品选择依据与候选集合。</div>
            </div>
            <div className="arch-item">
              <div className="arch-item-title">信息搜集子智能体</div>
              <div className="arch-item-desc">围绕维度汇总竞品信息，整理市场定位、用户群体、功能与商业化等。</div>
            </div>
            <div className="arch-item">
              <div className="arch-item-title">竞品分析报告子智能体</div>
              <div className="arch-item-desc">生成完整竞品分析报告：执行摘要、市场概览、SWOT、策略建议与结论。</div>
            </div>
            <div className="arch-item">
              <div className="arch-item-title">PDF生成模块</div>
              <div className="arch-item-desc">将报告结构化渲染为可下载 PDF，并返回 `pdf_url`。</div>
            </div>
          </div>
        </section>

        <section className="input-section">
          <div className="input-group">
            <div className="input-box">
              <textarea
                className="query-input"
                placeholder="描述您要调研的产品和要求，例如：帮我做一份trae的竞品分析报告，竞品需要包括Cloud code、Codex和Cursor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="analyze-button"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? '分析中...' : '开始分析'}
              </button>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
        </section>

        {loading && (
          <div className="loading-section">
            <LoadingSpinner />
            <p className="loading-text">多智能体协同分析中，请稍候...</p>
          </div>
        )}

        {!loading && (teamProcess.length > 0 || finalReport) && (
          <section className="results-section">
            <div className="results-grid">
              <div className="panel">
                <h2>团队工作历程</h2>
                {teamProcess.length > 0 ? (
                  <TeamProcessView processData={teamProcess} />
                ) : (
                  <div className="empty-hint">暂无团队工作历程输出</div>
                )}
              </div>

              {finalReport && (
                <div className="panel">
                  <h2>完整分析报告</h2>
                  <FinalReportView reportData={finalReport} />
                </div>
              )}
            </div>

            {pdfUrl && (
              <div className="pdf-section">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-button"
                >
                  下载PDF报告
                </a>
                <p className="pdf-tip">链接为临时地址，建议在24小时内完成下载。</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;

