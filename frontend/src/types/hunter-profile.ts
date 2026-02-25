export interface HunterProfile {
  stats: {
    totalMissions: number;
    avgScore: number;
    totalSpend: string;
    totalHires: number;
  };
  skills: Array<{
    taskType: string;
    count: number;
    avgScore: number;
  }>;
  preferredAgents: Array<{
    agentId: string;
    hires: number;
    avgScore: number;
  }>;
  insights: Array<{
    lesson: string;
    count: number;
  }>;
}
