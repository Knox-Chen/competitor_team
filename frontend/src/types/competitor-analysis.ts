export interface AgentOutput {
  agent: string;
  title: string;
  timestamp: string;
  data: any;
}

export interface AnalysisResponseData {
  team_process: AgentOutput[];
  final_report: AgentOutput;
  pdf_url: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: AnalysisResponseData;
  error?: string;
}

export interface AnalysisRequest {
  query: string;
}

