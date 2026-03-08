export type MoonshotUser = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  seatsUsed: number;
  invitedEmail?: string;
};

export type Seat = {
  id: string;
  name: string;
  department: string;
  reportsToSeatId?: string;
};

export type OneOnOneActionItem = {
  id: string;
  text: string;
  ownerId: string;
  dueDate: string;
  completed: boolean;
};

export type OneOnOneTemplate = {
  id: string;
  title: string;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly";
  participantIds: string[];
  agendaNotes: string;
  actionItems: OneOnOneActionItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SeatFitStatus = "Great fit" | "Good fit" | "Stretch" | "Misaligned";

export type SeatFitReview = {
  id: string;
  userId: string;
  seatId: string;
  valuesMatch: number;
  roleCompetency: number;
  performanceConfidence: number;
  fitStatus: SeatFitStatus;
  notes: string;
  reviewDate: string;
  updatedAt: string;
};

export type OrgChartSeat = {
  id: string;
  title: string;
  department: string;
  parentId: string | null;
  childIds: string[];
  assignedUserIds: string[];
};

export type OrgChart = {
  seats: OrgChartSeat[];
};

export type AgendaSection = {
  id: string;
  title: string;
  minutes: number;
};

export type MetricFrequency = "daily" | "weekly" | "monthly" | "quarterly";

export type MetricPoint = {
  date: string;
  value: number;
};

export type Meeting = {
  id: string;
  title: string;
  owner: string;
  date: string;
  status: "Scheduled" | "Completed" | "Draft" | "In Progress";
  notes: string;
  frequency: "weekly" | "biweekly" | "monthly";
  duration: number;
  attendeeIds: string[];
  agenda: AgendaSection[];
  checkInPrompt: string;
  checkInResponse: string;
  summary: string;
};

export type Metric = {
  id: string;
  name: string;
  owner: string;
  target: number;
  actual: number;
  trend: "up" | "down" | "flat";
  week: string;
  frequency: MetricFrequency;
  unit: "number" | "percent" | "currency";
  points: MetricPoint[];
};

export type Rock = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "On Track" | "At Risk" | "Off Track" | "Completed";
  percentComplete?: number;
  notes?: string;
  meetingId?: string;
};

export type Todo = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  completed: boolean;
  meetingId?: string;
};

export type Issue = {
  id: string;
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  identified?: string;
  discussed?: string;
  solved?: string;
  meetingId?: string;
};

export type BusinessPlan = {
  futureFocus: {
    coreValues: string[];
    bhag: string;
    threeYearVision: {
      revenue: string;
      mrr: string;
      nrr: string;
      grossMargin: string;
      customers: string;
    };
    marketingStrategy: {
      targetMarket: string;
      differentiators: string;
      guarantee: string;
      process: string;
    };
    coreFocus: string;
    coachesAndAdvisors: string;
    richNotes: string;
  };
  shortTermFocus: {
    oneYearPlan: string;
    quarterlyGoals: string;
    keyInitiatives: string;
    obstacles: string;
    rocksSummary: string;
    notes: string;
  };
};

export type WorkspaceTileType = "metrics" | "rocks" | "todos" | "issues" | "headlines" | "core-values" | "notes" | "quick-links";

export type WorkspaceTile = {
  id: string;
  type: WorkspaceTileType;
  title: string;
  colSpan: 1 | 2 | 3 | 4;
};

export type PermissionLevel = "none" | "view" | "edit" | "admin";

export type MoonshotSettings = {
  organizationName: string;
  enableZapier: boolean;
  editOrgChartPermission: PermissionLevel;
  addUpgradeUsersPermission: PermissionLevel;
  editDeleteUsersPermission: PermissionLevel;
  managersAreAdmins: boolean;
  managerSeeOwnRocksAndKpisOnly: boolean;
  supervisorsEditAccountabilities: boolean;
  employeesEditAccountabilities: boolean;
  supervisorsRemoveUsers: boolean;
  supervisorsEditPositions: boolean;
  allowRapidFireAcrossMeetings: boolean;
  allowGoodNewsAcrossMeetings: boolean;
  allowAddingClientsAsUsers: boolean;
  sendEmailInvitationsByDefault: boolean;
  currentQuarter: string;
  timeZone: string;
  weekStart: "Sunday" | "Monday";
  dateFormat: "dd-mm-yyyy" | "mm-dd-yyyy" | "yyyy-mm-dd";
  numberFormat: "1,234,567.90" | "1.234.567,90";
  defaultActionEmailTime: string;
  scorecardPeriod: "Daily" | "Weekly" | "Monthly" | "Quarterly";
};
