export interface ProspectAudit {
  id: string;
  domain: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  slug: string | null;
  pdf_url: string | null;
  pdf_filename: string | null;
  overall_score: number | null;
  created_at: string;
}

export interface BusinessInfo {
  equipment: string[];
  cities: string[];
  primary_city: string;
  state: string;
}

export interface DomainAudit {
  id: string;
  domain: string;
  overall_score: number | null;
  analyzed_at: string | null;
  business_info: BusinessInfo | null;
  created_at: string;
}

export interface DashboardStats {
  totalDomains: number;
  totalLeads: number;
  avgScore: number;
  pdfsGenerated: number;
}
