export type Role = "OWNER" | "ADMIN" | "TEAM MEMBER" | "CLIENT";
export type Entity =
  | "clients"
  | "projects"
  | "tasks"
  | "timeEntries"
  | "deliverables"
  | "versions"
  | "comments"
  | "approvals"
  | "invoices"
  | "payments";
export type Person = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  clientId?: string;
};
export type Client = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  companyInfo: string;
  notes: string;
  archived: boolean;
  token: string;
  createdAt: string;
};
export type Project = {
  id: string;
  name: string;
  clientId: string;
  description: string;
  type: string;
  start: string;
  deadline: string;
  status: string;
  priority: string;
  budget: number;
  billing: "Fixed fee" | "Hourly";
  hourlyRate: number;
  members: string[];
  notes: string;
  art: number;
  createdAt: string;
};
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  path?: string;
};
export type Task = {
  id: string;
  title: string;
  projectId: string;
  assignee: string;
  priority: string;
  deadline: string;
  description: string;
  checklist: { id: string; text: string; done: boolean }[];
  attachments: Attachment[];
  estimatedHours: number;
  status: string;
  createdAt: string;
};
export type TimeEntry = {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  date: string;
  seconds: number;
  note: string;
  billable: boolean;
  approved: boolean;
  invoicedId?: string;
  createdAt: string;
};
export type Timer = {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  note: string;
  billable: boolean;
  seconds: number;
  startedAt: string | null;
};
export type Deliverable = {
  id: string;
  projectId: string;
  title: string;
  kind: string;
  createdAt: string;
};
export type Version = {
  id: string;
  deliverableId: string;
  label: string;
  file: Attachment | null;
  url: string;
  status:
    | "Draft"
    | "Internal Review"
    | "Client Review"
    | "Revision Requested"
    | "Approved";
  submittedAt: string | null;
  reviewDeadline: string;
  createdAt: string;
};
export type Comment = {
  id: string;
  projectId: string;
  deliverableId: string;
  taskId: string;
  visibility: "Internal" | "Client-visible";
  text: string;
  author: string;
  createdAt: string;
};
export type Approval = {
  id: string;
  projectId: string;
  versionId: string;
  clientId: string;
  action: string;
  feedback: string;
  actor: string;
  createdAt: string;
};
export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};
export type Invoice = {
  id: string;
  token: string;
  number: string;
  clientId: string;
  projectId: string;
  issue: string;
  due: string;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  status: "DRAFT" | "SENT" | "CANCELLED";
  notes: string;
  timeIds: string[];
  createdAt: string;
  agency: {
    name: string;
    email: string;
    address: string;
    paymentInstructions: string;
  };
  currency: string;
};
export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  createdAt: string;
};
export type Activity = {
  id: string;
  projectId: string;
  message: string;
  actor: string;
  createdAt: string;
};
export type Settings = {
  agencyName: string;
  agencyDescription: string;
  email: string;
  address: string;
  currency: string;
  taxRate: number;
  hourlyRate: number;
  paymentInstructions: string;
  workflow: string[];
};
export type Data = {
  settings: Settings;
  people: Person[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  timers: Timer[];
  deliverables: Deliverable[];
  versions: Version[];
  comments: Comment[];
  approvals: Approval[];
  invoices: Invoice[];
  payments: Payment[];
  activity: Activity[];
  dismissed: string[];
  revision: number;
};
export type PortalData = {
  agency: Pick<
    Settings,
    "agencyName" | "agencyDescription" | "email" | "currency"
  >;
  client: Pick<Client, "id" | "name" | "contact" | "token">;
  projects: Pick<
    Project,
    | "id"
    | "name"
    | "description"
    | "type"
    | "deadline"
    | "status"
    | "priority"
    | "art"
  >[];
  deliverables: Deliverable[];
  versions: Version[];
  comments: Comment[];
  approvals: Approval[];
  invoices: Invoice[];
  payments: Payment[];
};
export type Operation = { type: string; [key: string]: unknown };
