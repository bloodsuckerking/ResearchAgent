export type Source = {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  content: string;
  read: boolean;
};

export type Claim = {
  claim: string;
  evidence: string;
  sourceIds: number[];
  status: "supported" | "conflict" | "insufficient";
};

export type Report = {
  title: string;
  summary: string;
  sections: {
    title: string;
    paragraphs: { text: string; sourceIds: number[] }[];
  }[];
  recommendations: string;
  limitations: string;
};

export type ResearchActivity =
  | "planning"
  | "planned"
  | "searching"
  | "search_complete"
  | "reading"
  | "sources_ready"
  | "extracting"
  | "extracted"
  | "verifying"
  | "verified"
  | "writing"
  | "complete";

export type ResearchEvent =
  | {
      type: "stage";
      stage?: number;
    }
  | {
      type: "plan";
      plan?: string[];
    }
  | {
      type: "sources";
      sources?: Source[];
    }
  | {
      type: "claims";
      claims?: Claim[];
    }
  | {
      type: "report";
      report?: Report;
    }
  | {
      type: "activity";
      stage?: number;
      activity: ResearchActivity;
      query?: string;
      source?: Source;
      count?: number;
      total?: number;
    }
  | {
      type: "error";
      code?: string;
    }
  | {
      type: "saved";
    }
  | {
      type: "warning";
      code?: string;
    };
