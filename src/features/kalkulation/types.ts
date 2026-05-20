export type Position = {
  id: string;
  oz: string;
  shortText: string;
  longText: string;
  hinweisText: string;
  quantity: number;
  unit: string;
  materialCost: number;
  timeMinutes: number;
  nuCost: number;
  isHeader: boolean;
  sortOrder: number;
  sectionPath: string;
  epLohn: number;
  epMaterial: number;
  epGeraet: number;
  epNu: number;
  ep: number;
  gp: number;
  classification?: string | null;
  visibleToCustomer: boolean;
  internalNote?: string;
};

export type CalcParams = {
  mittellohn: number;
  verrechnungslohn: number;
  materialZuschlag: number;
  nuZuschlag: number;
  geraeteZuschlagPct: number;
  geraeteStundensatz: number;
  zeitabzug: number;
  tagesstunden: number;
  personaleinsatz: number;
  mwst: number;
};

export type ProjectData = {
  name: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  service: string;
  tenderNumber: string;
  deadline: string;
  bidder: string;
  calcParams: CalcParams;
  positions: Position[];
  notes?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  client: string;
  service: string;
  positionCount: number;
  createdAt: string;
  updatedAt: string;
  versionNumber: number;
};

export type ProjectDetail = {
  id: string;
  data: ProjectData;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
  shares: ShareSummary[];
};

export type ShareSettings = {
  brandHeader: 'own' | 'co-branded' | 'minimal';
  customerName?: string;
  customerEmail?: string;
  message?: string;
  allowApproval: boolean;
  allowChangeRequests: boolean;
  showTotals: boolean;
  showMwst: boolean;
};

export type ShareSummary = {
  id: string;
  token: string;
  visiblePositionIds: string[];
  settings: ShareSettings;
  createdAt: string;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
};

export type ShareResponse = {
  id: string;
  shareId: string;
  responseType: 'approve' | 'changes' | 'reject';
  customerName: string | null;
  customerEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  payload: {
    message?: string;
    changes?: Array<{
      positionId: string;
      type: 'modify' | 'remove' | 'comment';
      text: string;
    }>;
    signature?: { name: string; timestamp: number; ip: string };
  };
  respondedAt: string;
};

export type CustomerViewPayload = {
  shareId: string;
  token: string;
  settings: ShareSettings;
  project: {
    name: string;
    client: string;
    service: string;
    tenderNumber: string;
    deadline: string;
    versionNumber: number;
    notes?: string;
    mwst: number;
  };
  owner: {
    name: string;
    companyName: string;
    companyLogoUrl: string;
    email: string;
  };
  positions: Array<{
    id: string;
    oz: string;
    shortText: string;
    longText: string;
    quantity: number;
    unit: string;
    isHeader: boolean;
    sortOrder: number;
    ep: number;
    gp: number;
  }>;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  mustChangePassword: boolean;
};
