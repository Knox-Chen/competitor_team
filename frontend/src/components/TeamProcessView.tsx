import React from 'react';
import { AgentOutput } from '../types/competitor-analysis';

interface Props {
  processData: AgentOutput[];
}

const TeamProcessView: React.FC<Props> = ({ processData }) => {
  const getAgentIcon = (agent: string): string => {
    const icons: Record<string, string> = {
      主智能体: '🎯',
      竞品搜集筛选子智能体: '🔍',
      信息搜集子智能体: '📊'
    };
    return icons[agent] || '🤖';
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString('zh-CN');
    } catch {
      return timestamp;
    }
  };

  const formatCompetitorInfoParagraph = (info: any): string => {
    const toJoined = (v: any): string => {
      if (!v) return '';
      if (Array.isArray(v)) return v.join('、');
      return String(v);
    };

    const market = toJoined(info.market_positioning || info.market_position);
    const users = toJoined(info.user_groups);
    const core = toJoined(info.core_functions);
    const strengths = toJoined(info.strengths);
    const weaknesses = toJoined(info.weaknesses);
    const ecosystem = toJoined(info.ecosystem);
    const commercial = toJoined(info.commercialization_models || info.commercialization_model);

    const parts: string[] = [];
    if (market) parts.push(`市场定位：${market}`);
    if (users) parts.push(`用户群体：${users}`);
    if (core) parts.push(`核心功能：${core}`);
    if (strengths) parts.push(`优势：${strengths}`);
    if (weaknesses) parts.push(`劣势：${weaknesses}`);
    if (ecosystem) parts.push(`生态：${ecosystem}`);
    if (commercial) parts.push(`商业化：${commercial}`);

    return parts.length ? parts.join('；') : '暂无数据';
  };

  return (
    <div className="team-process-view">
      {processData.map((item, index) => (
        <div key={index} className="process-item">
          <div className="process-header">
            <span className="agent-icon">{getAgentIcon(item.agent)}</span>
            <div className="agent-meta">
              <div className="agent-name">{item.agent}</div>
              <div className="process-title">{item.title}</div>
            </div>
            <div className="process-time">{formatTimestamp(item.timestamp)}</div>
          </div>

          <div className="process-content">
            {item.agent === '主智能体' && (
              <div className="master-agent-output">
                <div className="info-row">
                  <span className="label">产品类别：</span>
                  <span>{item.data?.product_category || '暂无数据'}</span>
                </div>
                <div className="info-row">
                  <span className="label">目标产品：</span>
                  <span>{item.data?.target_product || '暂无数据'}</span>
                </div>
                <div className="info-row">
                  <span className="label">分析维度：</span>
                  <ul className="list-inline">
                    {(item.data?.analysis_dimensions || []).map((dim: string, i: number) => (
                      <li key={i}>{dim}</li>
                    ))}
                  </ul>
                </div>
                <div className="info-row">
                  <span className="label">关注重点：</span>
                  <span>{(item.data?.focus_areas || []).join('、') || '暂无'}</span>
                </div>
              </div>
            )}

            {item.agent === '竞品搜集筛选子智能体' && (
              <div className="search-agent-output">
                <div className="info-row">
                  <span className="label">搜索摘要：</span>
                  <span>{item.data?.search_summary || '暂无数据'}</span>
                </div>
                <div className="info-row">
                  <span className="label">发现数量：</span>
                  <span>{item.data?.total_found ?? '-'}</span>
                  <span className="divider">/</span>
                  <span className="label">筛选数量：</span>
                  <span>{item.data?.selected_count ?? '-'}</span>
                </div>
                <div className="competitors-list">
                  {(item.data?.competitors || []).map((comp: any, i: number) => (
                    <div key={i} className="competitor-card">
                      <div className="competitor-header">
                        <h4>{comp.name}</h4>
                        {comp.website && (
                          <a
                            href={comp.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link"
                          >
                            官网
                          </a>
                        )}
                      </div>
                      <p className="desc">{comp.description}</p>
                      <div className="meta">
                        <span>{comp.market_position}</span>
                      </div>
                      {comp.selection_reason && (
                        <div className="reason">
                          <span className="label">选择理由：</span>
                          <span>{comp.selection_reason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.agent === '信息搜集子智能体' && (
              <div className="info-agent-output">
                <div className="info-row">
                  <span className="label">汇总说明：</span>
                  <span>{item.data?.collection_summary || '暂无数据'}</span>
                </div>
                <div className="competitors-info">
                  {Object.entries(item.data?.competitors_info || {}).map(
                    ([name, info]: [string, any]) => (
                      <div key={name} className="competitor-info-card">
                        <h4>{name}</h4>
                        <p className="competitor-summary">
                          {formatCompetitorInfoParagraph(info)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamProcessView;

