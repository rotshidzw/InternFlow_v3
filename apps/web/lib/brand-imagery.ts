export type BrandImageSpec = {
  src: string;
  alt: string;
};

export const brandImagery = {
  heroOps: {
    src: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1600&q=80",
    alt: "Engineers managing enterprise systems infrastructure with data visualizations",
  },
  workflowIntelligence: {
    src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
    alt: "Cybersecurity operations screen with workflow and monitoring overlays",
  },
  complianceEvidence: {
    src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80",
    alt: "Technical workstation displaying compliance and workflow documentation systems",
  },
  modernTeam: {
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
    alt: "Professional operations team collaborating around enterprise dashboards",
  },
  studentJourney: {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    alt: "Learners collaborating in a digital-first training environment",
  },
  providerControlRoom: {
    src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
    alt: "Enterprise operations dashboard on multiple displays in a control room setup",
  },
  trustAndGovernance: {
    src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
    alt: "Global digital network visualizing governance, trust, and secure operations",
  },
} as const satisfies Record<string, BrandImageSpec>;