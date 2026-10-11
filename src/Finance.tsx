import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Printer,
  Copy,
  ReceiptText,
  Check,
  Download,
  ExternalLink,
  Save,
} from "lucide-react";
import { CONFIG, money, dateText, today, uid } from "./config";
import { totals, invoiceStatus, projectTime } from "./domain";
import {
  useStudio,
  Heading,
  Button,
  Tag,
  Stat,
  Empty,
  SearchBox,
  Modal,
  Field,
  copyText,
  hours,
  Brand,
} from "./ui";
import type { Invoice, Payment, Settings as SettingsType } from "./types";
export function InvoiceDocument({
  invoice: i,
  payments,
  clientName,
  projectName,
}: {
  invoice: Invoice;
  payments: Payment[];
  clientName: string;
  projectName: string;
}) {
  const t = totals(i, payments),
    status = invoiceStatus(i, payments);
  return (
    <article className="invoice-document">
      <div className="invoice-document-top">
        <div className="invoice-agency">
          <span className="invoice-mark">A↗</span>
          <h2>{i.agency.name}</h2>
          <p>
            {i.agency.address}
            <br />
            {i.agency.email}
          </p>
        </div>
        <div>
          <div className="eyebrow">INVOICE</div>
          <h2>{i.number}</h2>
          <Tag>{status}</Tag>
        </div>
      </div>
      <div className="invoice-address">
        <div>
          <small>BILL TO</small>
          <strong>{clientName}</strong>
          <p>{projectName}</p>
        </div>
        <div>
          <small>ISSUED</small>
          <strong>{dateText(i.issue)}</strong>
        </div>
        <div>
          <small>DUE DATE</small>
          <strong>{dateText(i.due)}</strong>
        </div>
      </div>
      <table className="invoice-items">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {i.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td>{Number(item.quantity.toFixed(3))}</td>
              <td>{money(item.rate, i.currency)}</td>
              <td>
                {money(Math.round(item.rate * item.quantity), i.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-summary">
        <div>
          <span>Subtotal</span>
          <strong>{money(t.subtotal, i.currency)}</strong>
        </div>
        {t.discount > 0 && (
          <div>
            <span>Discount</span>
            <strong>− {money(t.discount, i.currency)}</strong>
          </div>
        )}
        {i.taxRate > 0 && (
          <div>
            <span>Tax ({i.taxRate}%)</span>
            <strong>{money(t.tax, i.currency)}</strong>
          </div>
        )}
        <div className="grand-total">
          <span>Total</span>
          <strong>{money(t.total, i.currency)}</strong>
        </div>
        <div>
          <span>Recorded payments</span>
          <strong>{money(t.paid, i.currency)}</strong>
        </div>
        <div className="balance">
          <span>Balance due</span>
          <strong>{money(t.outstanding, i.currency)}</strong>
        </div>
      </div>
      <div className="invoice-instructions">
        <small>PAYMENT INSTRUCTIONS</small>
        <p>{i.agency.paymentInstructions}</p>
        {i.notes && (
          <>
            <small>NOTES</small>
            <p>{i.notes}</p>
          </>
        )}
      </div>
      <footer>
        Thank you for creating with {i.agency.name}.{" "}
        <span>GOOD WORK. BETTER TOGETHER.</span>
      </footer>
    </article>
  );
}
export function InvoiceList({
  invoices,
  compact = false,
}: {
  invoices: Invoice[];
  compact?: boolean;
}) {
  const { d, act, open, toast, canAdmin } = useStudio();
  const [selected, setSelected] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const i = d.invoices.find((i) => i.id === selected);
  const status = async (status: string) => {
    if (!i || busy) return;
    setBusy(true);
    try {
      await act({
        type: "invoiceStatus",
        id: i.id,
        status,
        confirmed: confirm,
      });
      toast(
        status === "SENT"
          ? "Invoice issued. Share its link with your client."
          : "Invoice cancelled.",
      );
      setConfirm(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="table-wrap">
        <table className={compact ? "compact-table" : ""}>
          <thead>
            <tr>
              <th>Invoice & client</th>
              {!compact && <th>Project</th>}
              <th>Due date</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const t = totals(i, d.payments);
              return (
                <tr key={i.id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setSelected(i.id)}
                    >
                      {i.number}
                    </button>
                    <small>
                      {d.clients.find((c) => c.id === i.clientId)?.name}
                    </small>
                  </td>
                  {!compact && (
                    <td>
                      {d.projects.find((p) => p.id === i.projectId)?.name}
                    </td>
                  )}
                  <td>{dateText(i.due)}</td>
                  <td className="number">{money(t.total, i.currency)}</td>
                  <td className="number">{money(t.outstanding, i.currency)}</td>
                  <td>
                    <Tag>{invoiceStatus(i, d.payments)}</Tag>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Open invoice " + i.number}
                      onClick={() => setSelected(i.id)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!invoices.length && (
          <Empty
            title="A clean slate for your accounts."
            text="Create an invoice to begin."
          />
        )}
      </div>
      {i && (
        <Modal
          title={i.number + " · invoice"}
          onClose={() => {
            setSelected(null);
            setConfirm(false);
            setError("");
          }}
          wide
        >
          <div className="invoice-controls no-print">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={16} />
              Print invoice
            </Button>
            {i.status !== "DRAFT" && (
              <>
                <a
                  href={"/invoice/" + i.token}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button outline"
                >
                  Client invoice <ExternalLink size={16} />
                </a>
                <Button
                  variant="outline"
                  onClick={() =>
                    void copyText(
                      location.origin + "/invoice/" + i.token,
                      toast,
                    )
                  }
                >
                  <Copy size={16} />
                  Copy link
                </Button>
              </>
            )}
            {canAdmin && i.status === "DRAFT" && (
              <Button onClick={() => void status("SENT")} disabled={busy}>
                Issue invoice <ArrowUpRight size={16} />
              </Button>
            )}
            {canAdmin &&
              i.status === "SENT" &&
              totals(i, d.payments).outstanding > 0 && (
                <Button
                  onClick={() => {
                    setSelected(null);
                    open({ kind: "payment", record: i });
                  }}
                >
                  Record payment
                </Button>
              )}
          </div>
          <InvoiceDocument
            invoice={i}
            payments={d.payments}
            clientName={d.clients.find((c) => c.id === i.clientId)?.name || ""}
            projectName={
              d.projects.find((p) => p.id === i.projectId)?.name || ""
            }
          />
          <section className="payment-history no-print">
            <h3>Recorded payments</h3>
            {d.payments
              .filter((p) => p.invoiceId === i.id)
              .map((p) => (
                <div key={p.id} className="record-row">
                  <span>
                    <strong>{money(p.amount, i.currency)}</strong>
                    <small>
                      {p.method} · {p.reference || "No reference"}
                    </small>
                  </span>
                  <span>{dateText(p.date)}</span>
                </div>
              ))}
            {!d.payments.some((p) => p.invoiceId === i.id) && (
              <p>No funds have been recorded as received.</p>
            )}
            {canAdmin &&
              i.status !== "CANCELLED" &&
              totals(i, d.payments).paid === 0 && (
                <Button variant="text danger" onClick={() => setConfirm(true)}>
                  Cancel invoice
                </Button>
              )}
            {confirm && (
              <div className="confirmation">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={confirm}
                    onChange={(e) => setConfirm(e.target.checked)}
                  />
                  I confirm cancellation of {i.number}.
                </label>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Keep invoice
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => void status("CANCELLED")}
                >
                  Confirm cancellation
                </Button>
              </div>
            )}
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
          </section>
        </Modal>
      )}
    </>
  );
}
export function Invoices() {
  const { d, open, canAdmin } = useStudio();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("All statuses"),
    [client, setClient] = useState("");
  if (!canAdmin)
    return (
      <Empty
        title="Financial access is restricted."
        text="Invoices are available to studio owners and administrators."
      />
    );
  const invoices = d.invoices.filter(
    (i) =>
      (i.number + " " + d.clients.find((c) => c.id === i.clientId)?.name)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "All statuses" || invoiceStatus(i, d.payments) === status) &&
      (!client || i.clientId === client),
  );
  const issued = d.invoices.filter((i) => i.status === "SENT");
  return (
    <>
      <Heading
        eyebrow="A CLEARER VIEW OF YOUR BUSINESS"
        title="Good work deserves a clear invoice."
        description="From project milestones to the payments that follow."
      >
        <Button onClick={() => open({ kind: "invoice" })}>
          <Plus size={17} />
          New invoice
        </Button>
      </Heading>
      <div className="stats-grid">
        <Stat
          label="Issued invoice value"
          value={money(
            issued.reduce((s, i) => s + totals(i, d.payments).total, 0),
            d.settings.currency,
          )}
        />
        <Stat
          label="Collected payments"
          value={money(
            d.payments.reduce((s, p) => s + p.amount, 0),
            d.settings.currency,
          )}
          accent
        />
        <Stat
          label="Outstanding balance"
          value={money(
            issued.reduce((s, i) => s + totals(i, d.payments).outstanding, 0),
            d.settings.currency,
          )}
        />
        <Stat
          label="Overdue balance"
          value={money(
            issued
              .filter((i) => invoiceStatus(i, d.payments) === "OVERDUE")
              .reduce((s, i) => s + totals(i, d.payments).outstanding, 0),
            d.settings.currency,
          )}
        />
      </div>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search invoices"
        />
        <select
          aria-label="Invoice status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {[
            "All statuses",
            "DRAFT",
            "SENT",
            "PARTIALLY PAID",
            "PAID",
            "OVERDUE",
            "CANCELLED",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Invoice client filter"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">All clients</option>
          {d.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="result-count">{invoices.length} invoices</span>
      </div>
      <InvoiceList invoices={invoices} />
      <p className="quiet-note">
        Invoice value is not collected revenue. Payment status is calculated
        from recorded funds.
      </p>
    </>
  );
}
export function Reports() {
  const { d, canAdmin, toast } = useStudio();
  const [start, setStart] = useState(today().slice(0, 8) + "01"),
    [end, setEnd] = useState(today()),
    [range, setRange] = useState("This month");
  if (!canAdmin)
    return (
      <Empty
        title="Reports are reserved for studio administrators."
        text="Your project time remains available in Time tracking."
      />
    );
  const chosen = (kind: string) => {
    setRange(kind);
    const t = today(),
      n = new Date(t + "T12:00:00Z");
    if (kind === "All time") {
      setStart("2000-01-01");
      setEnd("2099-12-31");
    } else if (kind === "Today") {
      setStart(t);
      setEnd(t);
    } else if (kind === "This week") {
      n.setUTCDate(n.getUTCDate() - ((n.getUTCDay() + 6) % 7));
      setStart(n.toISOString().slice(0, 10));
      setEnd(t);
    } else if (kind === "This month") {
      setStart(t.slice(0, 8) + "01");
      setEnd(t);
    }
  };
  const invoices = d.invoices.filter(
      (i) => i.status === "SENT" && i.issue >= start && i.issue <= end,
    ),
    payments = d.payments.filter((p) => p.date >= start && p.date <= end),
    entries = d.timeEntries.filter((t) => t.date >= start && t.date <= end);
  const invoiced = invoices.reduce(
      (s, i) => s + totals(i, d.payments).total,
      0,
    ),
    collected = payments.reduce((s, p) => s + p.amount, 0),
    outstanding = invoices.reduce(
      (s, i) => s + totals(i, d.payments).outstanding,
      0,
    ),
    overdue = invoices
      .filter((i) => invoiceStatus(i, d.payments) === "OVERDUE")
      .reduce((s, i) => s + totals(i, d.payments).outstanding, 0);
  const billable = entries
      .filter((t) => t.billable)
      .reduce((s, t) => s + t.seconds / 3600, 0),
    value = entries
      .filter((t) => t.billable)
      .reduce(
        (s, t) =>
          s +
          (t.seconds / 3600) *
            (d.projects.find((p) => p.id === t.projectId)?.hourlyRate || 0),
        0,
      );
  const grouped = d.clients.map((c) => ({
    name: c.name,
    invoiced: invoices
      .filter((i) => i.clientId === c.id)
      .reduce((s, i) => s + totals(i, d.payments).total, 0),
    paid: payments
      .filter((p) =>
        d.invoices.some((i) => i.id === p.invoiceId && i.clientId === c.id),
      )
      .reduce((s, p) => s + p.amount, 0),
  }));
  const daily = [...new Set(payments.map((p) => p.date))]
    .sort()
    .slice(-14)
    .map((date) => ({
      date,
      value: payments
        .filter((p) => p.date === date)
        .reduce((s, p) => s + p.amount, 0),
    }));
  const max = Math.max(1, ...daily.map((x) => x.value));
  const exportCSV = () => {
    const rows = [
      ["Metric", "Value", "Currency"],
      ["Invoiced revenue", invoiced, d.settings.currency],
      ["Collected payments", collected, d.settings.currency],
      ["Outstanding", outstanding, d.settings.currency],
      ["Overdue balance", overdue, d.settings.currency],
      ["Billable hours", billable, "hours"],
      ["Billable value", Math.round(value), d.settings.currency],
    ];
    const blob = new Blob(
        [
          rows
            .map((row) =>
              row
                .map((x) => '"' + String(x).replace(/"/g, '""') + '"')
                .join(","),
            )
            .join("\r\n"),
        ],
        { type: "text/csv" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "studio-report-" + start + "-" + end + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Report prepared for download.");
  };
  return (
    <>
      <Heading
        eyebrow="MEANINGFUL NUMBERS, CLEARLY PRESENTED"
        title="See the business behind the work."
        description="A considered view of revenue, collections and creative time."
      >
        <Button variant="outline" onClick={exportCSV}>
          <Download size={16} />
          Export report
        </Button>
      </Heading>
      <div className="toolbar report-range">
        <select
          aria-label="Report date range"
          value={range}
          onChange={(e) => chosen(e.target.value)}
        >
          {["Today", "This week", "This month", "All time", "Custom range"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <Field label="From">
          <input
            type="date"
            value={start}
            max={end}
            onChange={(e) => {
              setStart(e.target.value);
              setRange("Custom range");
            }}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value);
              setRange("Custom range");
            }}
          />
        </Field>
      </div>
      {start > end && (
        <p role="alert" className="alert error">
          Start date must not exceed end date.
        </p>
      )}
      <div className="stats-grid">
        <Stat
          label="Invoiced revenue"
          value={money(invoiced, d.settings.currency)}
          note={`${invoices.length} issued invoices in period`}
        />
        <Stat
          label="Collected revenue"
          value={money(collected, d.settings.currency)}
          note="Payments received in the selected period"
          accent
        />
        <Stat
          label="Outstanding invoices"
          value={money(outstanding, d.settings.currency)}
          note="Current balance of invoices issued in period"
        />
        <Stat
          label="Overdue invoices"
          value={money(overdue, d.settings.currency)}
          note="Outstanding balance past the due date"
        />
      </div>
      <div className="report-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Payments, over time</h2>
            <span className="eyebrow">COLLECTED REVENUE</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label="Daily recorded payment chart"
          >
            {daily.length ? (
              daily.map((x) => (
                <div key={x.date}>
                  <strong>{money(x.value, d.settings.currency)}</strong>
                  <i
                    style={{
                      height: Math.max(5, (x.value / max) * 145) + "px",
                    }}
                  />
                  <small>{dateText(x.date)}</small>
                </div>
              ))
            ) : (
              <Empty
                title="No payments in this period."
                text="Recorded collections will appear here."
              />
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Creative time, accounted for</h2>
          <div className="report-key-value">
            <span>Tracked hours</span>
            <strong>
              {hours(entries.reduce((s, t) => s + t.seconds / 3600, 0))}
            </strong>
          </div>
          <div className="report-key-value">
            <span>Billable hours</span>
            <strong>{hours(billable)}</strong>
          </div>
          <div className="report-key-value">
            <span>Billable value</span>
            <strong>{money(Math.round(value), d.settings.currency)}</strong>
          </div>
          <div className="report-key-value">
            <span>Project portfolio value</span>
            <strong>
              {money(
                d.projects.reduce((s, p) => s + p.budget, 0),
                d.settings.currency,
              )}
            </strong>
          </div>
          <p className="quiet-note">
            Billable value is the estimated hourly value of work. It is separate
            from invoiced and collected revenue.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>By creative partnership</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Invoiced</th>
                <th>Collected in period</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((c) => (
                <tr key={c.name}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="number">
                    {money(c.invoiced, d.settings.currency)}
                  </td>
                  <td className="number">
                    {money(c.paid, d.settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="section-heading">
        <h2>Project time summaries</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Estimated</th>
              <th>Tracked</th>
              <th>Billable</th>
              <th>Non-billable</th>
              <th>Billable value</th>
            </tr>
          </thead>
          <tbody>
            {d.projects.map((p) => {
              const t = projectTime(d, p.id);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{hours(t.estimated)}</td>
                  <td>{hours(t.tracked)}</td>
                  <td>{hours(t.billable)}</td>
                  <td>{hours(t.nonbillable)}</td>
                  <td className="number">
                    {money(t.value, d.settings.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Settings() {
  const { d, act, canAdmin, toast } = useStudio();
  const [s, setS] = useState<SettingsType>({
      ...d.settings,
      workflow: [...d.settings.workflow],
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!canAdmin)
    return (
      <Empty
        title="Settings require administrator access."
        text="Use the workspace navigation to return to your projects."
      />
    );
  const field = (key: keyof SettingsType, label: string, type = "text") => (
    <Field label={label}>
      <input
        type={type}
        value={s[key] as string | number}
        onChange={(e) =>
          setS({
            ...s,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </Field>
  );
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOUR STUDIO"
        title="A considered setup. A better flow."
        description="Studio identity, workflow and billing preferences."
      />
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await act({ type: "settings", data: s });
            toast("Studio settings updated.");
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel">
          <h2>Studio identity</h2>
          <p>
            Application branding stays separate from the agency identity on
            invoices and client-facing pages.
          </p>
          <div className="form-grid">
            {field("agencyName", "Agency name")}
            {field("email", "Contact email", "email")}
            {field("address", "Agency address")}
          </div>
          <Field label="Agency profile">
            <textarea
              value={s.agencyDescription}
              onChange={(e) =>
                setS({ ...s, agencyDescription: e.target.value })
              }
            />
          </Field>
          <div className="config-lock">
            <Brand />
            <span>Application identity: {CONFIG.appName}</span>
          </div>
        </section>
        <section className="panel">
          <h2>The creative workflow</h2>
          <p>
            Five stages, from first thought to finished work. Renaming a stage
            updates existing projects and tasks.
          </p>
          <div className="workflow-settings">
            {s.workflow.map((w, i) => (
              <Field label={"Stage " + (i + 1)} key={i}>
                <input
                  value={w}
                  maxLength={60}
                  required
                  onChange={(e) =>
                    setS({
                      ...s,
                      workflow: s.workflow.map((x, j) =>
                        j === i ? e.target.value : x,
                      ),
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Billing, clearly defined</h2>
          <div className="form-grid">
            <Field
              label="Currency"
              hint="Locked while financial records exist so amounts are not accidentally relabeled."
            >
              <select
                value={s.currency}
                disabled={Boolean(d.projects.length || d.invoices.length)}
                onChange={(e) => setS({ ...s, currency: e.target.value })}
              >
                {["IDR", "USD", "EUR", "GBP", "SGD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {field("taxRate", "Default invoice tax (%)", "number")}
            {field("hourlyRate", "Default hourly rate", "number")}
          </div>
          <Field label="Payment instructions">
            <textarea
              value={s.paymentInstructions}
              onChange={(e) =>
                setS({ ...s, paymentInstructions: e.target.value })
              }
            />
          </Field>
          <p className="quiet-note">
            New invoices snapshot the agency identity and billing rules.
            Existing issued invoices retain their original details.
          </p>
        </section>
        <section className="panel">
          <h2>Team & access</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {d.people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>
                      <Tag>{p.role}</Tag>
                    </td>
                    <td>
                      {["OWNER", "ADMIN"].includes(p.role)
                        ? "Studio management & financials"
                        : p.role === "CLIENT"
                          ? "Own client portal only"
                          : "Assigned projects & production"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="quiet-note">
            Backend users are provisioned through Supabase Auth and profiles.
            Team members require project membership. Demo identity switching is
            for testing permissions only.
          </p>
        </section>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button disabled={busy}>
            <Save size={16} />
            {busy ? "Saving…" : "Save studio settings"}
          </Button>
        </div>
      </form>
    </>
  );
}
