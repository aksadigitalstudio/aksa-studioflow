import { CONFIG, uid, now, today } from "./config.ts";
import type {
  Data,
  Person,
  Operation,
  Invoice,
  PortalData,
  Project,
  Timer,
  Attachment,
} from "./types";
export function totals(i: Invoice, payments: Data["payments"] = []) {
  const subtotal = i.items.reduce(
    (s, x) => s + Math.round(x.quantity * x.rate),
    0,
  );
  const discount = Math.min(subtotal, Math.max(0, i.discount));
  const tax = Math.round(((subtotal - discount) * i.taxRate) / 100);
  const total = subtotal - discount + tax;
  const paid = payments
    .filter((x) => x.invoiceId === i.id)
    .reduce((s, x) => s + x.amount, 0);
  return {
    subtotal,
    discount,
    tax,
    total,
    paid,
    outstanding: Math.max(0, total - paid),
  };
}
export function invoiceStatus(i: Invoice, payments: Data["payments"]) {
  if (i.status === "CANCELLED" || i.status === "DRAFT") return i.status;
  const t = totals(i, payments);
  if (t.paid >= t.total) return "PAID";
  if (i.due < today()) return "OVERDUE";
  return t.paid > 0 ? "PARTIALLY PAID" : "SENT";
}
export const elapsed = (t: Timer) =>
  t.seconds +
  (t.startedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(t.startedAt)) / 1000))
    : 0);
export const latest = (d: Data, deliverableId: string) =>
  d.versions
    .filter((x) => x.deliverableId === deliverableId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
export const allowedURL = (url: string) => {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol);
  } catch {
    return false;
  }
};
function text(v: unknown, name: string, max = 3000, min = 0) {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    throw Error(`Enter a valid ${name}.`);
  return v.trim();
}
function number(v: unknown, name: string, max = 1e12) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
    throw Error(`Enter a valid ${name}.`);
  return v;
}
function date(v: unknown, name: string, required = false) {
  if (!v && !required) return "";
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    throw Error(`Choose a valid ${name}.`);
  return v;
}
function entity<T extends { id: string }>(array: T[], id: unknown): T {
  const x = array.find((x) => x.id === id);
  if (!x) throw Error("The record is unavailable. Refresh and try again.");
  return x;
}
function admin(actor: Person) {
  if (!["OWNER", "ADMIN"].includes(actor.role))
    throw Error("This action requires an owner or admin.");
}
function projectAccess(d: Data, p: Project, actor: Person) {
  if (
    actor.role === "CLIENT"
      ? actor.clientId !== p.clientId
      : actor.role === "TEAM MEMBER" && !p.members.includes(actor.id)
  )
    throw Error("You do not have access to this project.");
}
function audit(d: Data, pid: string, msg: string, actor: Person) {
  d.activity.unshift({
    id: uid(),
    projectId: pid,
    message: msg,
    actor: actor.name,
    createdAt: now(),
  });
}
function history(
  d: Data,
  versionId: string,
  action: string,
  feedback: string,
  actor: Person,
) {
  const v = entity(d.versions, versionId),
    deliverable = entity(d.deliverables, v.deliverableId),
    p = entity(d.projects, deliverable.projectId);
  d.approvals.push({
    id: uid(),
    versionId,
    projectId: p.id,
    clientId: p.clientId,
    action,
    feedback,
    actor: actor.name,
    createdAt: now(),
  });
  audit(d, p.id, `${deliverable.title} · ${v.label}: ${action}`, actor);
}
function approved(d: Data, pid: string) {
  const ds = d.deliverables.filter((x) => x.projectId === pid);
  return (
    ds.length > 0 && ds.every((x) => latest(d, x.id)?.status === "Approved")
  );
}
function sync(d: Data, pid: string) {
  const p = entity(d.projects, pid),
    ts = d.tasks.filter((x) => x.projectId === pid);
  if (
    ts.length &&
    ts.every((x) => x.status === d.settings.workflow[4]) &&
    approved(d, pid)
  )
    p.status = d.settings.workflow[4];
  else if (
    d.deliverables
      .filter((x) => x.projectId === pid)
      .some((x) => latest(d, x.id)?.status === "Client Review") ||
    ts.some((x) => x.status === d.settings.workflow[3])
  )
    p.status = d.settings.workflow[3];
  else if (
    ts.some((x) =>
      [d.settings.workflow[2], d.settings.workflow[4]].includes(x.status),
    )
  )
    p.status = d.settings.workflow[2];
  else if (ts.some((x) => x.status === d.settings.workflow[1]))
    p.status = d.settings.workflow[1];
  else if (ts.length) p.status = d.settings.workflow[0];
}
function attachment(a: Attachment) {
  text(a.name, "filename", 180, 1);
  number(a.size, "file size", 10 * 1024 * 1024);
  if (
    !a.url ||
    !(
      allowedURL(a.url) ||
      /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/.test(a.url)
    )
  )
    throw Error("Choose a safe image, PDF or file link.");
}
export function apply(d: Data, op: Operation, actor: Person) {
  const input = op.data as any;
  const stamp = now();
  if (!actor) throw Error("Sign in to continue.");
  if (
    actor.role === "CLIENT" &&
    !["review", "view", "comment"].includes(op.type)
  )
    throw Error("Client accounts cannot modify internal records.");
  switch (op.type) {
    case "client": {
      admin(actor);
      text(input.name, "client name", 140, 2);
      text(input.contact, "contact", 100);
      text(input.email, "email", 200);
      if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
        throw Error("Enter a valid email address.");
      text(input.phone, "phone", 40);
      text(input.notes, "notes");
      text(input.companyInfo, "company information");
      const existing = input.id ? entity(d.clients, input.id) : null;
      const value = {
        ...input,
        id: existing?.id || uid(),
        token: existing?.token || uid(),
        createdAt: existing?.createdAt || stamp,
        archived: existing?.archived || false,
      };
      if (existing) Object.assign(existing, value);
      else d.clients.push(value);
      audit(
        d,
        "",
        `${existing ? "Updated" : "Created"} client ${value.name}`,
        actor,
      );
      return value.id;
    }
    case "archiveClient": {
      admin(actor);
      const c = entity(d.clients, op.id);
      if (
        !c.archived &&
        d.projects.some(
          (p) => p.clientId === c.id && p.status !== d.settings.workflow[4],
        )
      )
        throw Error("Complete the client’s active projects before archiving.");
      c.archived = !c.archived;
      audit(
        d,
        "",
        `${c.archived ? "Archived" : "Restored"} client ${c.name}`,
        actor,
      );
      break;
    }
    case "project": {
      admin(actor);
      const c = entity(d.clients, input.clientId);
      if (c.archived)
        throw Error("Restore this client before creating projects.");
      text(input.name, "project name", 160, 2);
      text(input.description, "description");
      text(input.notes, "notes");
      date(input.start, "start date", true);
      date(input.deadline, "deadline", true);
      if (input.deadline < input.start)
        throw Error("Deadline cannot precede start date.");
      number(input.budget, "budget");
      number(input.hourlyRate, "hourly rate");
      if (
        !d.settings.workflow.includes(input.status) ||
        !["Low", "Medium", "High", "Urgent"].includes(input.priority) ||
        !["Fixed fee", "Hourly"].includes(input.billing) ||
        !CONFIG.agency.services.includes(input.type)
      )
        throw Error("Choose valid project settings.");
      if (
        !Array.isArray(input.members) ||
        input.members.some(
          (id: string) =>
            !d.people.some((x) => x.id === id && x.role !== "CLIENT"),
        )
      )
        throw Error("Choose valid team members.");
      const p = input.id ? entity(d.projects, input.id) : null;
      if(p && p.clientId !== input.clientId) throw Error("Project client is immutable; create a new project instead.");
      if (
        input.status === d.settings.workflow[4] &&
        (!p ||
          !approved(d, p.id) ||
          d.tasks.some(
            (t) => t.projectId === p.id && t.status !== d.settings.workflow[4],
          ))
      )
        throw Error(
          "Complete tasks and approve the latest deliverables first.",
        );
      const value = {
        ...input,
        id: p?.id || uid(),
        createdAt: p?.createdAt || stamp,
        art: p?.art ?? d.projects.length % 4,
      };
      const changed = p && p.deadline !== input.deadline;
      if (p) Object.assign(p, value);
      else d.projects.push(value);
      audit(
        d,
        value.id,
        changed
          ? "Project deadline changed"
          : `${p ? "Updated" : "Created"} project ${value.name}`,
        actor,
      );
      return value.id;
    }
    case "task": {
      const p = entity(d.projects, input.projectId);
      projectAccess(d, p, actor);
      text(input.title, "task title", 160, 2);
      date(input.deadline, "task deadline");
      number(input.estimatedHours, "estimated hours", 10000);
      text(input.description, "description");
      if (
        !d.settings.workflow.includes(input.status) ||
        !["Low", "Medium", "High", "Urgent"].includes(input.priority) ||
        !p.members.includes(input.assignee)
      )
        throw Error("Choose a valid stage, priority and project assignee.");
      if (!Array.isArray(input.checklist) || input.checklist.length > 40)
        throw Error("Use at most 40 checklist items.");
      input.checklist.forEach((c: any) =>
        text(c.text, "checklist item", 250, 1),
      );
      input.attachments.forEach(attachment);
      const t = input.id ? entity(d.tasks, input.id) : null;
      if (t && t.projectId !== p.id)
        throw Error("Tasks cannot be reassigned to another project.");
      const value = {
        ...input,
        id: t?.id || uid(),
        createdAt: t?.createdAt || stamp,
      };
      if (t) Object.assign(t, value);
      else d.tasks.push(value);
      sync(d, p.id);
      audit(d, p.id, `${t ? "Updated" : "Added"} task: ${value.title}`, actor);
      return value.id;
    }
    case "moveTask": {
      const t = entity(d.tasks, op.id),
        p = entity(d.projects, t.projectId);
      projectAccess(d, p, actor);
      if (!d.settings.workflow.includes(String(op.status)))
        throw Error("Choose a valid workflow stage.");
      t.status = String(op.status);
      sync(d, p.id);
      audit(d, p.id, `Task ${t.title} → ${t.status}`, actor);
      break;
    }
    case "checklist": {
      const t = entity(d.tasks, op.id);
      projectAccess(d, entity(d.projects, t.projectId), actor);
      const c = entity(t.checklist, op.itemId);
      c.done = !c.done;
      break;
    }
    case "time": {
      const p = entity(d.projects, input.projectId);
      projectAccess(d, p, actor);
      if (input.taskId && entity(d.tasks, input.taskId).projectId !== p.id)
        throw Error("Choose a task in this project.");
      number(input.seconds, "duration", 86400 * 31);
      if (input.seconds < 1) throw Error("Duration must be positive.");
      date(input.date, "work date", true);
      text(input.note, "work description", 2000, 2);
      d.timeEntries.push({
        ...input,
        id: uid(),
        userId: actor.id,
        approved: false,
        invoicedId: undefined,
        createdAt: stamp,
      });
      audit(d, p.id, "Time entry recorded", actor);
      break;
    }
    case "approveTime": {
      admin(actor);
      const t = entity(d.timeEntries, op.id);
      if (t.invoicedId) throw Error("Billed time is locked.");
      t.approved = !t.approved;
      break;
    }
    case "startTimer": {
      const p = entity(d.projects, input.projectId);
      projectAccess(d, p, actor);
      if (input.taskId && entity(d.tasks, input.taskId).projectId !== p.id)
        throw Error("Choose a task in this project.");
      if (d.timers.some((t) => t.userId === actor.id))
        throw Error("Finish the existing timer before starting another.");
      text(input.note, "work description", 2000, 2);
      d.timers.push({
        ...input,
        id: uid(),
        userId: actor.id,
        seconds: 0,
        startedAt: stamp,
      });
      break;
    }
    case "pauseTimer":
    case "resumeTimer":
    case "stopTimer": {
      const t = entity(d.timers, op.id);
      if (t.userId !== actor.id)
        throw Error("Only the timer owner can control it.");
      if (op.type === "pauseTimer") {
        t.seconds = elapsed(t);
        t.startedAt = null;
      } else if (op.type === "resumeTimer") {
        if (t.startedAt) throw Error("Timer is already running.");
        t.startedAt = stamp;
      } else {
        const seconds = elapsed(t);
        if (seconds < 1)
          throw Error("Track at least one second before stopping.");
        d.timeEntries.push({
          id: uid(),
          projectId: t.projectId,
          taskId: t.taskId,
          userId: actor.id,
          seconds,
          date: today(),
          note: t.note,
          billable: t.billable,
          approved: false,
          createdAt: stamp,
        });
        d.timers = d.timers.filter((x) => x.id !== t.id);
        audit(d, t.projectId, "Timer stopped and time saved", actor);
      }
      break;
    }
    case "deliverable": {
      const p = entity(d.projects, input.projectId);
      projectAccess(d, p, actor);
      text(input.title, "deliverable title", 160, 2);
      text(input.kind, "deliverable type", 70, 1);
      const v = { ...input, id: uid(), createdAt: stamp };
      d.deliverables.push(v);
      audit(d, p.id, `Created deliverable ${v.title}`, actor);
      return v.id;
    }
    case "version": {
      const dl = entity(d.deliverables, input.deliverableId),
        p = entity(d.projects, dl.projectId);
      projectAccess(d, p, actor);
      text(input.label, "version label", 50, 1);
      if (
        d.versions.some(
          (v) =>
            v.deliverableId === dl.id &&
            v.label.toLowerCase() === input.label.toLowerCase(),
        )
      )
        throw Error(
          "Use a unique version label; existing work is never overwritten.",
        );
      if (!input.file && !input.url)
        throw Error("Upload a file or provide a preview link.");
      if (input.file) attachment(input.file);
      if (input.url && !allowedURL(input.url))
        throw Error("Use an http or https preview link.");
      date(input.reviewDeadline, "review deadline");
      const v = {
        ...input,
        id: uid(),
        status: "Draft",
        submittedAt: null,
        createdAt: stamp,
      };
      d.versions.push(v);
      history(
        d,
        v.id,
        d.versions.filter((x) => x.deliverableId === dl.id).length > 1
          ? "New Version Submitted"
          : "Version Created",
        "",
        actor,
      );
      if (p.status === d.settings.workflow[4])
        p.status = d.settings.workflow[2];
      return v.id;
    }
    case "submit":
    case "internalReview": {
      const v = entity(d.versions, op.id),
        dl = entity(d.deliverables, v.deliverableId),
        p = entity(d.projects, dl.projectId);
      projectAccess(d, p, actor);
      if (latest(d, dl.id)?.id !== v.id)
        throw Error("Only the latest version can be submitted.");
      if (v.status === "Approved")
        throw Error("Approved versions are immutable. Add a new version.");
      v.status = op.type === "submit" ? "Client Review" : "Internal Review";
      if (op.type === "submit") {
        v.submittedAt = stamp;
        p.status = d.settings.workflow[3];
        history(d, v.id, "Submitted for Review", "", actor);
      }
      break;
    }
    case "view":
    case "review": {
      const v = entity(d.versions, op.id),
        dl = entity(d.deliverables, v.deliverableId),
        p = entity(d.projects, dl.projectId);
      projectAccess(d, p, actor);
      if (actor.role !== "CLIENT")
        throw Error("Use the client portal to record the client’s decision.");
      if (!v.submittedAt)
        throw Error("This version is not available for client review.");
      if (op.type === "view") {
        if (
          !d.approvals.some(
            (x) => x.versionId === v.id && x.action === "Client Viewed",
          )
        )
          history(d, v.id, "Client Viewed", "", actor);
        break;
      }
      if (latest(d, dl.id)?.id !== v.id || v.status !== "Client Review")
        throw Error("Only the latest pending version can receive a decision.");
      if (op.decision === "approve") {
        if (op.confirmed !== true)
          throw Error("Confirm approval of this exact version.");
        v.status = "Approved";
        history(d, v.id, "Approved", "", actor);
        sync(d, p.id);
      } else if (op.decision === "revision") {
        const feedback = text(op.feedback, "revision feedback", 3000, 5);
        v.status = "Revision Requested";
        p.status = d.settings.workflow[2];
        history(d, v.id, "Revision Requested", feedback, actor);
      } else throw Error("Choose approval or revision.");
      break;
    }
    case "comment": {
      const p = entity(d.projects, input.projectId);
      projectAccess(d, p, actor);
      if (
        input.deliverableId &&
        entity(d.deliverables, input.deliverableId).projectId !== p.id
      )
        throw Error("Choose the project deliverable.");
      if (input.taskId && entity(d.tasks, input.taskId).projectId !== p.id)
        throw Error("Choose the project task.");
      text(input.text, "comment", 3000, 1);
      if (
        !["Internal", "Client-visible"].includes(input.visibility) ||
        (actor.role === "CLIENT" && input.visibility !== "Client-visible")
      )
        throw Error("Client comments must be client-visible.");
      d.comments.push({
        ...input,
        id: uid(),
        author: actor.name,
        createdAt: stamp,
      });
      audit(d, p.id, `Added ${input.visibility.toLowerCase()} comment`, actor);
      break;
    }
    case "invoice": {
      admin(actor);
      const p = entity(d.projects, input.projectId);
      if (p.clientId !== input.clientId)
        throw Error("Invoice client must match the project.");
      date(input.issue, "issue date", true);
      date(input.due, "due date", true);
      if (input.due < input.issue)
        throw Error("Due date cannot precede issue date.");
      if (
        !Array.isArray(input.items) ||
        !input.items.length ||
        input.items.length > 50
      )
        throw Error("Add 1–50 invoice line items.");
      input.items.forEach((x: any) => {
        text(x.description, "line description", 250, 1);
        number(x.quantity, "quantity", 10000);
        number(x.rate, "rate");
        if (x.quantity <= 0) throw Error("Quantity must be positive.");
      });
      number(input.discount, "discount");
      number(input.taxRate, "tax rate", 100);
      text(input.notes, "invoice notes");
      const year = input.issue.slice(0, 4),
        n =
          Math.max(
            0,
            ...d.invoices
              .filter((i) => i.number.startsWith("INV-" + year + "-"))
              .map((i) => Number(i.number.split("-").pop())),
          ) + 1;
      const i: Invoice = {
        ...input,
        id: uid(),
        token: uid(),
        number: `INV-${year}-${String(n).padStart(4, "0")}`,
        status: "DRAFT",
        createdAt: stamp,
        agency: {
          name: d.settings.agencyName,
          email: d.settings.email,
          address: d.settings.address,
          paymentInstructions: d.settings.paymentInstructions,
        },
        currency: d.settings.currency,
      };
      if (input.discount > totals(i).subtotal || totals(i).total <= 0)
        throw Error("Discount cannot exceed subtotal; total must be positive.");
      const ids: string[] = input.timeIds || [];
      if (new Set(ids).size !== ids.length)
        throw Error("Time entries cannot be duplicated.");
      ids.forEach((id) => {
        const t = entity(d.timeEntries, id);
        if (t.projectId !== p.id || !t.billable || !t.approved || t.invoicedId)
          throw Error("Only approved, unbilled project time can be invoiced.");
      });
      if (ids.length && totals(i).subtotal !== ids.reduce((sum,id)=>sum+Math.round(entity(d.timeEntries,id).seconds/3600*p.hourlyRate),0)) throw Error("Invoice subtotal must match approved hours at the project rate.");
      d.invoices.push(i);
      ids.forEach((id) => (entity(d.timeEntries, id).invoicedId = i.id));
      audit(d, p.id, `Created invoice ${i.number}`, actor);
      return i.id;
    }
    case "invoiceStatus": {
      admin(actor);
      const i = entity(d.invoices, op.id);
      if (op.status === "SENT" && i.status === "DRAFT") {
        i.status = "SENT";
        audit(d, i.projectId, `Invoice ${i.number} sent`, actor);
      } else if (op.status === "CANCELLED" && i.status !== "CANCELLED") {
        if (totals(i, d.payments).paid > 0)
          throw Error("Invoices with payments cannot be cancelled.");
        if (op.confirmed !== true) throw Error("Confirm cancellation.");
        i.status = "CANCELLED";
        d.timeEntries
          .filter((t) => t.invoicedId === i.id)
          .forEach((t) => delete t.invoicedId);
        audit(d, i.projectId, `Invoice ${i.number} cancelled`, actor);
      } else
        throw Error(
          "Only drafts can be sent. Payment status comes from recorded payments.",
        );
      break;
    }
    case "payment": {
      admin(actor);
      const i = entity(d.invoices, input.invoiceId);
      if (i.status !== "SENT")
        throw Error("Send the invoice before recording payment.");
      number(input.amount, "payment amount");
      if (input.amount <= 0 || input.amount > totals(i, d.payments).outstanding)
        throw Error("Payment must be positive and cannot exceed the balance.");
      date(input.date, "payment date", true);
      text(input.method, "payment method", 80, 1);
      text(input.reference, "payment reference", 180);
      d.payments.push({ ...input, id: uid(), createdAt: stamp });
      audit(d, i.projectId, `Payment recorded for ${i.number}`, actor);
      break;
    }
    case "settings": {
      admin(actor);
      text(input.agencyName, "agency name", 140, 2);
      text(input.email, "agency email", 200);
      text(input.agencyDescription, "agency profile");
      text(input.address, "address");
      text(input.paymentInstructions, "payment instructions");
      number(input.taxRate, "tax rate", 100);
      number(input.hourlyRate, "hourly rate");
      if (!["IDR", "USD", "EUR", "GBP", "SGD"].includes(input.currency))
        throw Error("Select a supported currency.");
      if (
        input.currency !== d.settings.currency &&
        (d.invoices.length || d.projects.length || d.timeEntries.length)
      )
        throw Error(
          "Currency is locked while financial records exist; existing amounts must not be relabeled.",
        );
      if (
        !Array.isArray(input.workflow) ||
        input.workflow.length !== 5 ||
        new Set(input.workflow).size !== 5
      )
        throw Error("Keep five unique workflow stages.");
      input.workflow.forEach((s: string) => text(s, "stage name", 60, 1));
      const previous = d.settings.workflow;
      d.tasks.forEach(
        (t) =>
          (t.status = input.workflow[previous.indexOf(t.status)] || t.status),
      );
      d.projects.forEach(
        (p) =>
          (p.status = input.workflow[previous.indexOf(p.status)] || p.status),
      );
      d.settings = { ...input };
      audit(d, "", "Updated studio settings", actor);
      break;
    }
    case "dismiss": {
      text(op.id, "notification", 200, 1);
      if (!d.dismissed.includes(String(op.id))) d.dismissed.push(String(op.id));
      break;
    }
    default:
      throw Error("Unsupported action.");
  }
  return null;
}
export function portal(d: Data, token: string): PortalData {
  const c = entity(
    d.clients,
    d.clients.find((x) => x.token === token && !x.archived)?.id,
  );
  const projects = d.projects.filter((p) => p.clientId === c.id);
  const ids = new Set(projects.map((p) => p.id));
  const deliverables = d.deliverables.filter((x) => ids.has(x.projectId));
  const dlids = new Set(deliverables.map((x) => x.id));
  const versions = d.versions.filter(
    (x) => dlids.has(x.deliverableId) && x.submittedAt,
  );
  return {
    agency: {
      agencyName: d.settings.agencyName,
      agencyDescription: d.settings.agencyDescription,
      email: d.settings.email,
      currency: d.settings.currency,
    },
    client: { id: c.id, name: c.name, contact: c.contact, token: c.token },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      deadline: p.deadline,
      status: p.status,
      priority: p.priority,
      art: p.art,
    })),
    deliverables: deliverables.filter((x) =>
      versions.some((v) => v.deliverableId === x.id),
    ),
    versions,
    comments: d.comments.filter(
      (x) =>
        ids.has(x.projectId) && x.visibility === "Client-visible" && !x.taskId,
    ),
    approvals: d.approvals.filter(
      (x) => ids.has(x.projectId) && versions.some((v) => v.id === x.versionId),
    ),
    invoices: d.invoices.filter(
      (i) => i.clientId === c.id && i.status === "SENT",
    ),
    payments: d.payments.filter((p) =>
      d.invoices.some(
        (i) =>
          i.id === p.invoiceId && i.clientId === c.id && i.status === "SENT",
      ),
    ),
  };
}
export function teamData(d: Data, actor: Person): Data {
  if (["OWNER", "ADMIN"].includes(actor.role)) return d;
  if (actor.role === "CLIENT") throw Error("Use your client portal.");
  const projects = d.projects.filter((p) => p.members.includes(actor.id)),
    ids = new Set(projects.map((p) => p.id));
  const deliverables = d.deliverables.filter((v) => ids.has(v.projectId));
  return {
    ...d,
    projects,
    clients: d.clients.filter((c) => projects.some((p) => p.clientId === c.id)),
    tasks: d.tasks.filter((t) => ids.has(t.projectId)),
    timeEntries: d.timeEntries.filter((t) => ids.has(t.projectId)),
    timers: d.timers.filter((t) => t.userId === actor.id),
    deliverables,
    versions: d.versions.filter((v) =>
      deliverables.some((dl) => dl.id === v.deliverableId),
    ),
    comments: d.comments.filter((c) => ids.has(c.projectId)),
    approvals: d.approvals.filter((a) => ids.has(a.projectId)),
    invoices: [],
    payments: [],
    activity: d.activity.filter((a) => ids.has(a.projectId)),
  };
}
export const projectTime = (d: Data, id: string) => {
  const entries = d.timeEntries.filter((t) => t.projectId === id);
  const estimated = d.tasks
    .filter((t) => t.projectId === id)
    .reduce((s, t) => s + t.estimatedHours, 0);
  const billable = entries
      .filter((t) => t.billable)
      .reduce((s, t) => s + t.seconds / 3600, 0),
    nonbillable = entries
      .filter((t) => !t.billable)
      .reduce((s, t) => s + t.seconds / 3600, 0);
  return {
    estimated,
    billable,
    nonbillable,
    tracked: billable + nonbillable,
    value: Math.round(
      billable * (d.projects.find((p) => p.id === id)?.hourlyRate || 0),
    ),
  };
};
