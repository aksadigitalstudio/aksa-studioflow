import { useRef, useState } from "react";
import { Plus, Trash2, Upload, ArrowUpRight } from "lucide-react";
import { CONFIG, uid, today, money } from "./config";
import { totals } from "./domain";
import { repo } from "./store";
import { Modal, Button, Field, useStudio, type Editor } from "./ui";
import type { Invoice, Attachment } from "./types";
export function EditDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { d, actor, act, nav, toast } = useStudio();
  const pid =
    editor.projectId || editor.record?.projectId || d.projects[0]?.id || "";
  const p = d.projects.find((p) => p.id === pid);
  const defaultData: Record<string, any> = {
    client: {
      name: "",
      contact: "",
      email: "",
      phone: "",
      companyInfo: "",
      notes: "",
      archived: false,
    },
    project: {
      name: "",
      clientId:
        editor.extra?.clientId || d.clients.find((c) => !c.archived)?.id || "",
      description: "",
      type: CONFIG.agency.services[0],
      start: today(),
      deadline: today(),
      status: d.settings.workflow[0],
      priority: "Medium",
      budget: 0,
      billing: "Fixed fee",
      hourlyRate: d.settings.hourlyRate,
      members: [actor.id],
      notes: "",
    },
    task: {
      title: "",
      projectId: pid,
      assignee: p?.members[0] || "",
      priority: "Medium",
      deadline: p?.deadline || today(),
      description: "",
      estimatedHours: 4,
      status: editor.extra?.status || d.settings.workflow[1],
      checklist: [],
      attachments: [],
    },
    time: {
      projectId: pid,
      taskId: "",
      date: today(),
      hours: 1,
      note: "",
      billable: true,
    },
    timer: { projectId: pid, taskId: "", note: "", billable: true },
    deliverable: { projectId: pid, title: "", kind: "Design" },
    version: {
      deliverableId: editor.extra?.deliverableId || "",
      label:
        "V" +
        (d.versions.filter(
          (v) => v.deliverableId === editor.extra?.deliverableId,
        ).length +
          1),
      url: "",
      reviewDeadline: today(),
      file: null,
    },
    payment: {
      invoiceId: editor.record?.id || "",
      amount: editor.record ? totals(editor.record, d.payments).outstanding : 0,
      date: today(),
      method: "Bank Transfer",
      reference: "",
    },
    invoice: {
      projectId: pid,
      clientId: p?.clientId || "",
      issue: today(),
      due: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      discount: 0,
      taxRate: d.settings.taxRate,
      notes: "",
      timeIds: [],
      items: [
        {
          id: uid(),
          description: p?.name || "Creative services",
          quantity: 1,
          rate: p?.budget || 0,
        },
      ],
      source: "Fixed project fee",
    },
  };
  const [v, setV] = useState<any>({
    ...defaultData[editor.kind],
    ...(editor.kind === "payment" ? {} : editor.record || {}),
  });
  const [file, setFile] = useState<File | null>(null),
    [attachments, setAttachments] = useState<File[]>([]),
    [checklist, setChecklist] = useState<string>(
      (v.checklist || []).map((x: any) => x.text).join("\n"),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [comment, setComment] = useState(""),
    [visibility, setVisibility] = useState("Internal");
  const lock = useRef(false);
  const set = (k: string, value: any) =>
    setV((x: any) => ({ ...x, [k]: value }));
  const input = (k: string, type = "text", props: any = {}) => (
    <input
      {...props}
      type={type}
      value={v[k] ?? ""}
      onChange={(e) =>
        set(k, type === "number" ? Number(e.target.value) : e.target.value)
      }
    />
  );
  const textarea = (k: string) => (
    <textarea value={v[k] || ""} onChange={(e) => set(k, e.target.value)} />
  );
  const select = (
    k: string,
    options: { id: string; name: string }[] | readonly string[],
    callback?: (value: string) => void,
  ) => (
    <select
      value={v[k] || ""}
      onChange={(e) => {
        set(k, e.target.value);
        callback?.(e.target.value);
      }}
    >
      {options.map((x) =>
        typeof x === "string" ? (
          <option key={x} value={x}>
            {x}
          </option>
        ) : (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ),
      )}
    </select>
  );
  const projectSelect = (
    <Field label="Project">
      {select(
        "projectId",
        d.projects.map((p) => ({ id: p.id, name: p.name })),
        (id) => {
          const p = d.projects.find((p) => p.id === id)!;
          setV((x: any) => ({
            ...x,
            taskId: "",
            assignee: p.members[0] || "",
            clientId: p.clientId,
            items:
              editor.kind === "invoice"
                ? [
                    {
                      id: uid(),
                      description: p.name,
                      quantity: 1,
                      rate: p.budget,
                    },
                  ]
                : x.items,
            timeIds: [],
          }));
        },
      )}
    </Field>
  );
  const taskSelect = (
    <Field label="Task (optional)">
      {select("taskId", [
        { id: "", name: "General project work" },
        ...d.tasks
          .filter((t) => t.projectId === v.projectId)
          .map((t) => ({ id: t.id, name: t.title })),
      ])}
    </Field>
  );
  const changeInvoiceSource = (source: string) => {
    const proj = d.projects.find((p) => p.id === v.projectId)!;
    const entries = d.timeEntries.filter(
      (t) =>
        t.projectId === proj.id && t.billable && t.approved && !t.invoicedId,
    );
    setV((x: any) => ({
      ...x,
      source,
      timeIds:
        source === "Approved billable hours" ? entries.map((t) => t.id) : [],
      items:
        source === "Approved billable hours"
          ? entries.map((t) => ({
              id: uid(),
              description: t.note + " · " + t.date,
              quantity: t.seconds / 3600,
              rate: proj.hourlyRate,
            }))
          : [
              {
                id: uid(),
                description:
                  source === "Fixed project fee"
                    ? proj.name
                    : "Creative services",
                quantity: 1,
                rate: source === "Fixed project fee" ? proj.budget : 0,
              },
            ],
    }));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let data = { ...v };
      if (editor.kind === "task") {
        data.checklist = checklist
          .split("\n")
          .filter((s) => s.trim())
          .map((s, i) => ({
            ...(v.checklist.find((c: any) => c.text === s) || {
              id: uid(),
              done: false,
            }),
            text: s.trim(),
          }));
        data.attachments = [
          ...v.attachments,
          ...(await Promise.all(
            attachments.map((f) => repo.upload(f, v.projectId)),
          )),
        ];
      }
      if (editor.kind === "version" && file) {
        const dl = d.deliverables.find((dl) => dl.id === v.deliverableId)!;
        data.file = await repo.upload(file, dl.projectId);
      }
      if (editor.kind === "time") {
        data.seconds = Math.round(v.hours * 3600);
        delete data.hours;
      }
      if (editor.kind === "invoice") {
        delete data.source;
        if (v.source === "Approved billable hours" && !data.items.length)
          throw Error("Approve billable time first.");
      }
      const type = editor.kind === "timer" ? "startTimer" : editor.kind;
      const result = await act({ type, data });
      toast(
        editor.kind === "timer"
          ? "Timer started."
          : editor.kind === "payment"
            ? "Payment recorded. Invoice status updated."
            : "Saved to your workspace.",
      );
      onClose();
      if (editor.kind === "project" && !editor.record && result)
        nav("/projects/" + result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const title =
    editor.kind === "payment"
      ? "Record a payment"
      : editor.kind === "timer"
        ? "Start a focused session"
        : editor.kind === "version"
          ? "Add a new version"
          : editor.kind === "time"
            ? "Add time entry"
            : `${editor.record ? "Edit" : "New"} ${editor.kind}`;
  return (
    <Modal
      title={title}
      onClose={() => !busy && onClose()}
      wide={["project", "task", "invoice"].includes(editor.kind)}
    >
      <form onSubmit={submit} className="editor-form">
        {editor.kind === "client" && (
          <>
            <Field label="Client / company name">
              {input("name", "text", { required: true, maxLength: 140 })}
            </Field>
            <div className="form-grid">
              <Field label="Contact person">{input("contact")}</Field>
              <Field label="Email">{input("email", "email")}</Field>
              <Field label="Phone / WhatsApp">{input("phone", "tel")}</Field>
            </div>
            <Field label="Company information">{textarea("companyInfo")}</Field>
            <Field
              label="Internal relationship notes"
              hint="Never shown in the client portal."
            >
              {textarea("notes")}
            </Field>
          </>
        )}
        {editor.kind === "project" && (
          <>
            <Field label="Project name">
              {input("name", "text", { required: true, maxLength: 160 })}
            </Field>
            <div className="form-grid">
              <Field label="Client">
                {select(
                  "clientId",
                  d.clients
                    .filter((c) => !c.archived)
                    .map((c) => ({ id: c.id, name: c.name })),
                )}
              </Field>
              <Field label="Project type">
                {select("type", CONFIG.agency.services)}
              </Field>
            </div>
            <Field label="Description (client-visible)">
              {textarea("description")}
            </Field>
            <div className="form-grid">
              <Field label="Start date">
                {input("start", "date", { required: true })}
              </Field>
              <Field label="Deadline">
                {input("deadline", "date", { required: true })}
              </Field>
              <Field label="Workflow stage">
                {select("status", d.settings.workflow)}
              </Field>
              <Field label="Priority">
                {select("priority", ["Low", "Medium", "High", "Urgent"])}
              </Field>
              <Field label="Billing model">
                {select("billing", ["Fixed fee", "Hourly"])}
              </Field>
              <Field label="Project budget (IDR)">
                {input("budget", "number", { min: 0, step: 1, required: true })}
              </Field>
              {v.billing === "Hourly" && (
                <Field label="Hourly rate (IDR)">
                  {input("hourlyRate", "number", { min: 0, step: 1 })}
                </Field>
              )}
            </div>
            <div className="field">
              <span>Assigned team members</span>
              <div className="checkboxes">
                {d.people
                  .filter((x) => x.role !== "CLIENT")
                  .map((person) => (
                    <label key={person.id}>
                      <input
                        type="checkbox"
                        checked={v.members.includes(person.id)}
                        onChange={(e) =>
                          set(
                            "members",
                            e.target.checked
                              ? [...v.members, person.id]
                              : v.members.filter(
                                  (id: string) => id !== person.id,
                                ),
                          )
                        }
                      />
                      {person.name}
                    </label>
                  ))}
              </div>
            </div>
            <Field
              label="Internal project notes"
              hint="Only the studio team can see these."
            >
              {textarea("notes")}
            </Field>
          </>
        )}
        {editor.kind === "task" && (
          <>
            <Field label="Task title">
              {input("title", "text", { required: true, maxLength: 160 })}
            </Field>
            {!editor.record && projectSelect}
            <div className="form-grid">
              <Field label="Assignee">
                {select(
                  "assignee",
                  (
                    d.projects.find((p) => p.id === v.projectId)?.members || []
                  ).map((id) => ({
                    id,
                    name:
                      d.people.find((p) => p.id === id)?.name || "Team member",
                  })),
                )}
              </Field>
              <Field label="Workflow stage">
                {select("status", d.settings.workflow)}
              </Field>
              <Field label="Priority">
                {select("priority", ["Low", "Medium", "High", "Urgent"])}
              </Field>
              <Field label="Deadline">{input("deadline", "date")}</Field>
              <Field label="Estimated hours">
                {input("estimatedHours", "number", { min: 0, step: 0.25 })}
              </Field>
            </div>
            <Field label="Task description">{textarea("description")}</Field>
            <Field
              label="Checklist"
              hint="One item per line. Existing completion checks are preserved."
            >
              <textarea
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
              />
            </Field>
            <Field
              label="Attachments"
              hint="PNG, JPEG, WebP or PDF; maximum 10 MB each."
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                multiple
                onChange={(e) => setAttachments([...(e.target.files || [])])}
              />
            </Field>
            {v.attachments?.map((a: Attachment) => (
              <div className="attachment-row" key={a.id}>
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.name}
                </a>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={"Remove attachment " + a.name}
                  onClick={() =>
                    set(
                      "attachments",
                      v.attachments.filter((x: Attachment) => x.id !== a.id),
                    )
                  }
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </>
        )}
        {["time", "timer"].includes(editor.kind) && (
          <>
            {projectSelect}
            {taskSelect}
            {editor.kind === "time" && (
              <div className="form-grid">
                <Field label="Work date">
                  {input("date", "date", { required: true })}
                </Field>
                <Field label="Duration (hours)">
                  {input("hours", "number", {
                    min: 0.01,
                    max: 744,
                    step: 0.01,
                    required: true,
                  })}
                </Field>
              </div>
            )}
            <Field label="Work description">{textarea("note")}</Field>
            <label className="check">
              <input
                type="checkbox"
                checked={v.billable}
                onChange={(e) => set("billable", e.target.checked)}
              />
              Billable work
            </label>
            <p className="form-note">
              Time is marked billable but needs admin approval before hourly
              invoicing.
            </p>
          </>
        )}
        {editor.kind === "deliverable" && (
          <>
            {projectSelect}
            <Field label="Deliverable title">
              {input("title", "text", { required: true })}
            </Field>
            <Field label="Deliverable type">
              {select("kind", [
                "Design",
                "Image",
                "PDF",
                "Video link",
                "Document",
                "Website preview",
                "Social content",
                "Other",
              ])}
            </Field>
            <p className="form-note">
              Create the deliverable, then add its first file or linked version.
            </p>
          </>
        )}
        {editor.kind === "version" && (
          <>
            <Field label="Deliverable">
              {select(
                "deliverableId",
                d.deliverables
                  .filter(
                    (dl) =>
                      !editor.projectId || dl.projectId === editor.projectId,
                  )
                  .map((dl) => ({ id: dl.id, name: dl.title })),
              )}
            </Field>
            <div className="form-grid">
              <Field label="Version label">
                {input("label", "text", { required: true })}
              </Field>
              <Field label="Client review deadline">
                {input("reviewDeadline", "date")}
              </Field>
            </div>
            <Field
              label="Upload file"
              hint="PNG, JPEG, WebP or PDF. Earlier versions are preserved."
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Field>
            {file && <p className="file-selection">Selected: {file.name}</p>}
            <Field
              label="Or preview URL"
              hint="Use a secure link for videos, documents or websites."
            >
              {input("url", "url", { placeholder: "https://…" })}
            </Field>
          </>
        )}
        {editor.kind === "invoice" && (
          <>
            {projectSelect}
            <Field label="Invoice source">
              {select(
                "source",
                [
                  "Fixed project fee",
                  "Manual line items",
                  "Approved billable hours",
                ],
                changeInvoiceSource,
              )}
            </Field>
            <div className="form-grid">
              <Field label="Issue date">
                {input("issue", "date", { required: true })}
              </Field>
              <Field label="Due date">
                {input("due", "date", { required: true })}
              </Field>
            </div>
            {v.source === "Approved billable hours" && (
              <p className="form-note">
                Only approved, billable and previously unbilled time is
                included. Entry references are locked when this invoice is
                created.
              </p>
            )}
            <div className="invoice-line-editor">
              <div className="line-head">
                <span>Description</span>
                <span>Qty / hours</span>
                <span>Rate (IDR)</span>
                <span />
              </div>
              {v.items.map((item: any, index: number) => (
                <div className="line-row" key={item.id}>
                  <input
                    required
                    aria-label={"Line " + (index + 1) + " description"}
                    value={item.description}
                    onChange={(e) =>
                      set(
                        "items",
                        v.items.map((x: any, j: number) =>
                          j === index
                            ? { ...x, description: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                  <input
                    required
                    aria-label={"Line " + (index + 1) + " quantity"}
                    type="number"
                    min="0.0001"
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      set(
                        "items",
                        v.items.map((x: any, j: number) =>
                          j === index
                            ? { ...x, quantity: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                  <input
                    required
                    aria-label={"Line " + (index + 1) + " rate"}
                    type="number"
                    min="0"
                    step="1"
                    value={item.rate}
                    onChange={(e) =>
                      set(
                        "items",
                        v.items.map((x: any, j: number) =>
                          j === index
                            ? { ...x, rate: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={"Remove line " + (index + 1)}
                    onClick={() =>
                      set(
                        "items",
                        v.items.filter((_: any, j: number) => j !== index),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {v.source !== "Approved billable hours" && (
                <Button
                  type="button"
                  variant="text"
                  onClick={() =>
                    set("items", [
                      ...v.items,
                      { id: uid(), description: "", quantity: 1, rate: 0 },
                    ])
                  }
                >
                  <Plus size={16} />
                  Add line item
                </Button>
              )}
            </div>
            <div className="form-grid">
              <Field label="Discount (IDR)">
                {input("discount", "number", { min: 0, step: 1 })}
              </Field>
              <Field label="Tax (%)">
                {input("taxRate", "number", { min: 0, max: 100, step: 0.01 })}
              </Field>
            </div>
            <div className="invoice-editor-total">
              <span>Total</span>
              <strong>
                {money(totals(v as Invoice).total, d.settings.currency)}
              </strong>
            </div>
            <Field label="Invoice notes (client-visible)">
              {textarea("notes")}
            </Field>
            <p className="form-note">
              Invoices are created as drafts. Send the invoice before recording
              payment.
            </p>
          </>
        )}
        {editor.kind === "payment" && (
          <>
            <div className="payment-summary">
              <small>{editor.record.number} · outstanding balance</small>
              <strong>
                {money(
                  totals(editor.record, d.payments).outstanding,
                  editor.record.currency,
                )}
              </strong>
            </div>
            <div className="form-grid">
              <Field label="Payment amount (IDR)">
                {input("amount", "number", {
                  min: 1,
                  max: totals(editor.record, d.payments).outstanding,
                  step: 1,
                  required: true,
                })}
              </Field>
              <Field label="Payment date">
                {input("date", "date", { required: true })}
              </Field>
            </div>
            <Field label="Payment method">
              {select("method", ["Bank Transfer", "Cash", "Card", "Other"])}
            </Field>
            <Field label="Payment reference">{input("reference")}</Field>
            <p className="form-note">
              Record funds already received. This action does not transfer
              money.
            </p>
          </>
        )}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button disabled={busy}>
            {busy
              ? "Saving…"
              : editor.kind === "payment"
                ? "Record payment"
                : editor.kind === "timer"
                  ? "Start timer"
                  : editor.kind === "invoice"
                    ? "Create invoice"
                    : "Save " + editor.kind}
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </form>
      {editor.kind === "task" && editor.record && (
        <section className="task-discussion">
          <h3>Task discussion · internal</h3>
          {d.comments
            .filter((c) => c.taskId === editor.record.id)
            .map((c) => (
              <article key={c.id}>
                <small>
                  {c.author} · {c.visibility}
                </small>
                <p>{c.text}</p>
              </article>
            ))}
          <Field label="Add task comment">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <Button
            variant="outline"
            disabled={!comment.trim() || busy}
            onClick={async () => {
              try {
                await act({
                  type: "comment",
                  data: {
                    projectId: v.projectId,
                    taskId: v.id,
                    deliverableId: "",
                    visibility: "Internal",
                    text: comment,
                  },
                });
                setComment("");
                toast("Internal task comment added.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Add internal comment
          </Button>
        </section>
      )}
    </Modal>
  );
}
const XIcon = () => <span>×</span>;
