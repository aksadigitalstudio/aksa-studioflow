import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Eye,
  Download,
  Printer,
  MessageSquare,
  FileText,
  CalendarDays,
  LockKeyhole,
  LogOut,
} from "lucide-react";
import { CONFIG, dateText, timeText, money, artwork } from "./config";
import { repo, cloud, supabase } from "./store";
import { totals, invoiceStatus } from "./domain";
import {
  useStudio,
  Heading,
  Button,
  Tag,
  Empty,
  Modal,
  Field,
  copyText,
  Brand,
  Loading,
  Stat,
} from "./ui";
import { Preview } from "./Production";
import { InvoiceDocument } from "./Finance";
import type { PortalData, Version, Invoice, Payment } from "./types";
export function ClientPortals() {
  const { d, canAdmin, toast } = useStudio();
  if (!canAdmin)
    return (
      <Empty
        title="Client portals are managed by studio admins."
        text="Production remains available in your assigned projects."
      />
    );
  return (
    <>
      <Heading
        eyebrow="A BETTER WAY TO WORK TOGETHER"
        title="Give your clients a considered space."
        description="The work, the feedback and the next steps. Nothing they don’t need."
      />
      <div className="portal-explainer">
        <LockKeyhole size={26} />
        <div>
          <h3>Made for clients. Separate from the studio.</h3>
          <p>
            Only client-visible projects, submitted versions, shared comments
            and issued invoices appear. Internal notes, tasks, rates and team
            discussions stay private.
          </p>
          <small>
            {cloud
              ? "Client sign-in and client membership are required."
              : "Demo portal links read and update this browser’s demo data. Different browsers have independent demo workspaces."}
          </small>
        </div>
      </div>
      <div className="client-grid">
        {d.clients
          .filter((c) => !c.archived)
          .map((c, i) => (
            <article className="portal-card" key={c.id}>
              <div className={"client-monogram art-" + (i % 4)}>
                {c.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
                <ArrowUpRight size={22} />
              </div>
              <div>
                <small>CLIENT WORKSPACE</small>
                <h2>{c.name}</h2>
                <p>
                  {c.contact} ·{" "}
                  {d.projects.filter((p) => p.clientId === c.id).length}{" "}
                  projects
                </p>
                <div className="portal-actions">
                  <a
                    className="button"
                    href={"/portal/" + c.token}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open portal <ExternalLink size={16} />
                  </a>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void copyText(
                        location.origin + "/portal/" + c.token,
                        toast,
                      )
                    }
                    aria-label={"Copy portal link " + c.name}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <input
                  className="share-link"
                  readOnly
                  aria-label={"Portal link " + c.name}
                  value={location.origin + "/portal/" + c.token}
                />
              </div>
            </article>
          ))}
      </div>
    </>
  );
}
export function Portal({ token }: { token: string }) {
  const [d, setData] = useState<PortalData | null>(null),
    [error, setError] = useState(""),
    [project, setProject] = useState(""),
    [section, setSection] = useState("Projects"),
    [version, setVersion] = useState<string | null>(null),
    [decision, setDecision] = useState<"approve" | "revision" | null>(null),
    [confirm, setConfirm] = useState(false),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [text, setText] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const refresh = async () => {
    try {
      setData(await repo.portal(token));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 10000);
    return () => clearInterval(id);
  }, [token]);
  const current = d?.versions.find((v) => v.id === version),
    dl = d?.deliverables.find((dl) => dl.id === current?.deliverableId);
  const projects =
    d?.projects.filter((p) => !project || p.id === project) || [];
  const ids = new Set(projects.map((p) => p.id));
  const versions =
    d?.versions.filter((v) =>
      d.deliverables.some(
        (dl) => dl.id === v.deliverableId && ids.has(dl.projectId),
      ),
    ) || [];
  const newest = (id: string) =>
    d?.versions
      .filter((v) => v.deliverableId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const openVersion = async (v: Version) => {
    setVersion(v.id);
    setDecision(null);
    setMessage("");
    try {
      await repo.clientAction(token, { type: "view", id: v.id });
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const review = async () => {
    if (lock.current || !current) return;
    lock.current = true;
    setBusy(true);
    try {
      await repo.clientAction(token, {
        type: "review",
        id: current.id,
        decision,
        confirmed: confirm,
        feedback,
      });
      await refresh();
      setDecision(null);
      setFeedback("");
      setConfirm(false);
      setMessage(
        decision === "approve"
          ? "Approval recorded. Thank you for the clear direction."
          : "Revision request shared with the studio.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  if (!d) {
    if (error)
      return (
        <div className="portal-gate">
          <Brand />
          <LockKeyhole size={38} />
          <h1>This workspace is private.</h1>
          <p role="alert">{error}</p>
          {cloud && <PortalLogin onSuccess={refresh} />}
          <a href="/" className="button outline">
            Back to sign in
          </a>
        </div>
      );
    return <Loading text="Opening your client workspace…" />;
  }
  return (
    <div className="client-portal">
      <header className="portal-header">
        <div>
          <span className="portal-agency">
            {d.agency.agencyName}
            <i>↗</i>
          </span>
          <small>YOUR CREATIVE PARTNERSHIP</small>
        </div>
        <div>
          <span className="portal-private">
            <LockKeyhole size={13} />
            {cloud ? "Private client workspace" : "Demo · this browser"}
          </span>
          {cloud && (
            <button
              className="icon-button"
              aria-label="Client sign out"
              onClick={() =>
                void supabase!.auth.signOut().then(() => {
                  setData(null);
                  setError("Sign in to open your portal.");
                })
              }
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>
      <main className="portal-main">
        <div className="portal-welcome">
          <div>
            <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>
            <h1>
              Good things are
              <br />
              <em>taking shape.</em>
            </h1>
            <p>
              {d.client.name} · A clear view of the work we’re making together.
            </p>
          </div>
          <div className="portal-welcome-art">
            <span>
              GOOD WORK.
              <br />
              BETTER
              <br />
              <em>TOGETHER.</em>
            </span>
            <ArrowUpRight size={80} />
          </div>
        </div>
        <div className="portal-stats">
          <Stat label="Projects together" value={d.projects.length} />
          <Stat
            label="Awaiting your thoughts"
            value={
              d.versions.filter(
                (v) =>
                  v.status === "Client Review" &&
                  newest(v.deliverableId)?.id === v.id,
              ).length
            }
            accent
          />
          <Stat
            label="Approved versions"
            value={d.versions.filter((v) => v.status === "Approved").length}
          />
        </div>
        <div className="portal-navigation">
          <div className="tabs">
            {["Projects", "Deliverables", "Conversations", "Invoices"].map(
              (s) => (
                <button
                  key={s}
                  className={s === section ? "active" : ""}
                  onClick={() => setSection(s)}
                >
                  {s}
                </button>
              ),
            )}
          </div>
          <select
            aria-label="Client project filter"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">All your projects</option>
            {d.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {section === "Projects" && (
          <div className="portal-projects">
            {projects.map((p) => (
              <article key={p.id}>
                <img
                  src={artwork(d.client.name, p.art)}
                  alt={p.type + " creative identity"}
                />
                <div>
                  <small>{p.type}</small>
                  <h2>{p.name}</h2>
                  <p>{p.description}</p>
                  <div>
                    <Tag>{p.status}</Tag>
                    <span>
                      <CalendarDays size={15} />
                      {dateText(p.deadline)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProject(p.id);
                      setSection("Deliverables");
                    }}
                  >
                    Explore the work <ArrowUpRight size={17} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {section === "Deliverables" && (
          <>
            <div className="section-heading">
              <div>
                <h2>Your next creative chapter.</h2>
                <p>Review the work and leave a little direction.</p>
              </div>
            </div>
            <div className="deliverable-grid">
              {d.deliverables
                .filter((dl) => ids.has(dl.projectId))
                .map((dl) => {
                  const v = newest(dl.id)!;
                  return (
                    <article className="deliverable-card" key={dl.id}>
                      <button
                        className="deliverable-thumb"
                        aria-label={"Review " + dl.title}
                        onClick={() => void openVersion(v)}
                      >
                        {v.file?.type.startsWith("image/") && v.file.url ? (
                          <img
                            src={v.file.url}
                            alt={dl.title}
                            onError={(e) => {
                              e.currentTarget.src = artwork(
                                dl.title,
                                d.projects.find((p) => p.id === dl.projectId)
                                  ?.art || 0,
                              );
                            }}
                          />
                        ) : (
                          <img
                            src={artwork(
                              dl.title,
                              d.projects.find((p) => p.id === dl.projectId)
                                ?.art || 0,
                            )}
                            alt="Creative preview"
                          />
                        )}
                        <span>
                          <Tag>{v.status}</Tag>
                        </span>
                        <div className="thumb-icon">
                          <Eye size={18} />
                        </div>
                      </button>
                      <div className="deliverable-card-body">
                        <small>
                          {d.projects.find((p) => p.id === dl.projectId)?.name}
                        </small>
                        <button
                          className="link-heading"
                          onClick={() => void openVersion(v)}
                        >
                          {dl.title}
                        </button>
                        <footer>
                          <span>
                            {v.label} · {dl.kind}
                          </span>
                          <Button
                            variant="text"
                            onClick={() => void openVersion(v)}
                          >
                            View & review <ArrowUpRight size={15} />
                          </Button>
                        </footer>
                      </div>
                    </article>
                  );
                })}
            </div>
            {!versions.length && (
              <Empty
                title="Something good is in the making."
                text="Submitted creative work will appear here for your review."
              />
            )}
          </>
        )}
        {section === "Conversations" && (
          <section className="panel portal-conversations">
            <h2>A little conversation goes a long way.</h2>
            {d.comments
              .filter((c) => ids.has(c.projectId))
              .map((c) => (
                <article className="client-comment" key={c.id}>
                  <header>
                    <strong>{c.author}</strong>
                    <small>{timeText(c.createdAt)}</small>
                  </header>
                  <span>
                    {d.projects.find((p) => p.id === c.projectId)?.name}
                  </span>
                  <p>{c.text}</p>
                </article>
              ))}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy(true);
                try {
                  await repo.clientAction(token, {
                    type: "comment",
                    data: {
                      projectId: project || d.projects[0]?.id,
                      deliverableId: "",
                      taskId: "",
                      visibility: "Client-visible",
                      text,
                    },
                  });
                  setText("");
                  await refresh();
                  setMessage("Comment shared with your studio.");
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {!project && (
                <Field label="Comment on project">
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  >
                    <option value="">Choose a project</option>
                    {d.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Your message">
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="A thought, a question, a little feedback…"
                />
              </Field>
              <Button disabled={busy || !text.trim() || !d.projects.length}>
                Share comment <ArrowUpRight size={16} />
              </Button>
            </form>
            {message && (
              <p className="alert" role="status">
                {message}
              </p>
            )}
          </section>
        )}
        {section === "Invoices" && (
          <>
            <div className="section-heading">
              <h2>The business side, clearly laid out.</h2>
            </div>
            <div className="portal-invoices">
              {d.invoices
                .filter((i) => ids.has(i.projectId))
                .map((i) => (
                  <a
                    className="portal-invoice"
                    href={"/invoice/" + i.token}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={i.id}
                  >
                    <span className="invoice-icon">
                      <FileText size={25} />
                    </span>
                    <span>
                      <strong>{i.number}</strong>
                      <small>
                        {d.projects.find((p) => p.id === i.projectId)?.name} ·
                        Due {dateText(i.due)}
                      </small>
                    </span>
                    <Tag>{invoiceStatus(i, d.payments)}</Tag>
                    <strong>
                      {money(totals(i, d.payments).total, i.currency)}
                    </strong>
                    <ArrowUpRight size={19} />
                  </a>
                ))}
            </div>
            {!d.invoices.length && (
              <Empty
                title="Everything in good order."
                text="Issued invoices will appear here."
              />
            )}
          </>
        )}
      </main>
      <footer className="portal-footer">
        <span>
          {d.agency.agencyName} · Made with care, shared with clarity.
        </span>
        <small>Powered by {CONFIG.appName}</small>
      </footer>
      {current && dl && (
        <Modal
          title={dl.title + " · " + current.label}
          onClose={() => {
            if (!busy) {
              setVersion(null);
              setDecision(null);
              setMessage("");
            }
          }}
          wide
        >
          <div className="version-switch">
            <select
              aria-label="Client deliverable version"
              value={current.id}
              onChange={(e) =>
                void openVersion(
                  d.versions.find((v) => v.id === e.target.value)!,
                )
              }
            >
              {d.versions
                .filter((v) => v.deliverableId === dl.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.label} · {v.status}
                  </option>
                ))}
            </select>
            <Tag>{current.status}</Tag>
          </div>
          <Preview v={current} title={dl.title} />
          <div className="version-actions">
            {current.file?.url && (
              <a
                className="button outline"
                href={current.file.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                Open / download
              </a>
            )}
            {current.status === "Client Review" &&
              newest(dl.id)?.id === current.id && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDecision("revision");
                      setConfirm(false);
                      setMessage("");
                    }}
                  >
                    <RotateCcw size={16} />
                    Request revision
                  </Button>
                  <Button
                    onClick={() => {
                      setDecision("approve");
                      setConfirm(false);
                      setMessage("");
                    }}
                  >
                    <Check size={17} />
                    Approve version
                  </Button>
                </>
              )}
          </div>
          {decision && (
            <section className="review-confirmation">
              <h3>
                {decision === "approve"
                  ? "A clear yes. A meaningful milestone."
                  : "A little direction for the next version."}
              </h3>
              {decision === "approve" ? (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={confirm}
                    onChange={(e) => setConfirm(e.target.checked)}
                  />
                  I approve {dl.title} — {current.label}. This decision will be
                  recorded.
                </label>
              ) : (
                <Field label="Requested changes">
                  <textarea
                    required
                    minLength={5}
                    maxLength={3000}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What would you like us to refine?"
                  />
                </Field>
              )}
              <div className="form-actions">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDecision(null)}
                >
                  Keep reviewing
                </Button>
                <Button
                  disabled={
                    busy ||
                    (decision === "approve"
                      ? !confirm
                      : feedback.trim().length < 5)
                  }
                  onClick={() => void review()}
                >
                  {busy
                    ? "Recording…"
                    : decision === "approve"
                      ? "Confirm approval"
                      : "Send revision request"}
                  <ArrowUpRight size={16} />
                </Button>
              </div>
            </section>
          )}
          {message && (
            <p className="alert" role="status">
              {message}
            </p>
          )}
          <section className="review-history">
            <h3>This version’s story</h3>
            {d.approvals
              .filter((a) => a.versionId === current.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((a) => (
                <article key={a.id}>
                  <Tag>{a.action}</Tag>
                  <span>
                    {a.actor} · {timeText(a.createdAt)}
                  </span>
                  {a.feedback && <p>{a.feedback}</p>}
                </article>
              ))}
          </section>
        </Modal>
      )}
    </div>
  );
}
function PortalLogin({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setError(error.message);
        else await onSuccess();
        setBusy(false);
      }}
    >
      <Field label="Client email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </Field>
      <Field label="Client password">
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </Field>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "Signing in…" : "Sign in to client portal"}
      </Button>
    </form>
  );
}
export function InvoicePage({ token }: { token: string }) {
  const [data, setData] = useState<{
      invoice: Invoice;
      payments: Payment[];
      clientName: string;
      projectName: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void repo
      .invoice(token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);
  if (error)
    return (
      <div className="portal-gate">
        <Brand />
        <h1>Invoice unavailable.</h1>
        <p role="alert">{error}</p>
      </div>
    );
  if (!data) return <Loading text="Opening your invoice…" />;
  return (
    <main className="public-invoice">
      <header className="no-print">
        <span>{data.invoice.agency.name} · digital invoice</span>
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          Print invoice
        </Button>
      </header>
      <InvoiceDocument {...data} />
      <footer className="no-print">
        A private invoice link. Please share only with the intended recipient.
        <br />
        Powered by {CONFIG.appName}
      </footer>
    </main>
  );
}
