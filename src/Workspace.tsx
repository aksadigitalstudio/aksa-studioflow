import { useState } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Check,
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { today, money, dateText, timeText, artwork } from "./config";
import { invoiceStatus, totals, projectTime } from "./domain";
import {
  useStudio,
  Heading,
  Button,
  Stat,
  Tag,
  ProjectCard,
  Empty,
  SearchBox,
  Avatar,
  Modal,
  Field,
  hours,
  copyText,
} from "./ui";
import { Deliverables, TaskList, TimeTracking, Discussion } from "./Production";
import { InvoiceList } from "./Finance";
export function Dashboard() {
  const { d, actor, nav, open, canAdmin } = useStudio();
  const active = d.projects.filter((p) => p.status !== d.settings.workflow[4]);
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const outstanding = d.invoices
    .filter((i) => i.status === "SENT")
    .reduce((s, i) => s + totals(i, d.payments).outstanding, 0);
  const paid = d.payments.reduce((s, p) => s + p.amount, 0);
  const deadlines = d.tasks
    .filter((t) => t.status !== d.settings.workflow[4] && t.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);
  const totalHours = d.timeEntries.reduce((s, t) => s + t.seconds / 3600, 0);
  return (
    <>
      <Heading
        eyebrow="THE STUDIO, AT A GLANCE"
        title={
          "Good " +
          (new Date().getHours() < 12 ? "morning" : "afternoon") +
          ", " +
          actor.name.split(" ")[0] +
          "."
        }
        description="A little clarity. A lot of possibility."
      >
        {canAdmin && (
          <Button onClick={() => open({ kind: "project" })}>
            <Plus size={17} />
            New project
          </Button>
        )}
      </Heading>
      <div className="dashboard-banner">
        <div>
          <span className="eyebrow">MAKE SPACE FOR YOUR BEST WORK</span>
          <h2>
            Everything in motion.
            <br />
            <em>All in good flow.</em>
          </h2>
          <p>{active.length} projects. One creative workspace.</p>
          <button onClick={() => nav("/projects")}>
            See what we’re making <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="banner-art">
          <span>
            AKSA
            <br />
            STUDIO
            <br />
            <em>IN FLOW.</em>
          </span>
          <div className="orbit">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ transform: `rotate(${i * 14}deg)` }} />
            ))}
          </div>
          <small>IDEAS → IMPACT</small>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          label="Active projects"
          value={active.length}
          note={`${active.filter((p) => p.deadline < today()).length} overdue · ${active.filter((p) => p.deadline >= today() && p.deadline <= soon).length} due this week`}
        />
        <Stat
          label="Work in progress"
          value={
            d.tasks.filter((t) => t.status === d.settings.workflow[2]).length
          }
          note={`${d.tasks.filter((t) => t.status === d.settings.workflow[3]).length} tasks awaiting approval`}
        />
        <Stat
          label="Tracked this workspace"
          value={hours(totalHours)}
          note={`${hours(d.timeEntries.filter((t) => t.billable).reduce((s, t) => s + t.seconds / 3600, 0))} billable`}
        />
        {canAdmin ? (
          <Stat
            label="Outstanding invoices"
            value={money(outstanding, d.settings.currency)}
            note={`${d.invoices.filter((i) => invoiceStatus(i, d.payments) === "OVERDUE").length} overdue · ${money(paid, d.settings.currency)} collected`}
            accent
          />
        ) : (
          <Stat
            label="Assigned to you"
            value={
              d.tasks.filter(
                (t) =>
                  t.assignee === actor.id &&
                  t.status !== d.settings.workflow[4],
              ).length
            }
            note="Your next meaningful work"
            accent
          />
        )}
      </div>
      <div className="section-heading">
        <div>
          <h2>On the drawing board</h2>
          <p>The projects moving your studio forward.</p>
        </div>
        <Button variant="text" onClick={() => nav("/projects")}>
          All projects <ArrowUpRight size={17} />
        </Button>
      </div>
      <div className="project-grid three">
        {active.slice(0, 3).map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <h2>On the horizon</h2>
            <Button variant="text" onClick={() => nav("/calendar")}>
              View calendar <ArrowUpRight size={16} />
            </Button>
          </div>
          {deadlines.map((t) => (
            <button
              className="deadline-row"
              key={t.id}
              onClick={() => nav("/projects/" + t.projectId)}
            >
              <div
                className={"date-tile " + (t.deadline < today() ? "late" : "")}
              >
                <strong>{new Date(t.deadline + "T12:00:00").getDate()}</strong>
                <small>
                  {new Date(t.deadline + "T12:00:00").toLocaleDateString(
                    "en-GB",
                    { month: "short" },
                  )}
                </small>
              </div>
              <span>
                <strong>{t.title}</strong>
                <small>
                  {d.projects.find((p) => p.id === t.projectId)?.name}
                </small>
              </span>
              <Tag tone={t.deadline < today() ? "red" : ""}>
                {t.deadline < today()
                  ? "Overdue"
                  : t.deadline === today()
                    ? "Today"
                    : t.priority}
              </Tag>
            </button>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>The latest in the studio</h2>
            <span className="eyebrow">ACTIVITY</span>
          </div>
          <div className="activity-list">
            {d.activity.slice(0, 5).map((a) => (
              <article key={a.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{a.message}</strong>
                  <p>
                    {a.actor} <i>·</i> {timeText(a.createdAt)}
                  </p>
                  {a.projectId && (
                    <button
                      className="text-link"
                      onClick={() => nav("/projects/" + a.projectId)}
                    >
                      Open project <ArrowUpRight size={13} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
export function Clients() {
  const { d, open, act, nav, canAdmin, toast } = useStudio();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("Active"),
    [selected, setSelected] = useState<string | null>(null),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const c = d.clients.find((c) => c.id === selected);
  const list = d.clients.filter(
    (c) =>
      (filter === "All" || c.archived === (filter === "Archived")) &&
      `${c.name} ${c.contact} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="PEOPLE BEHIND THE PROJECTS"
        title="Good partnerships. Great work."
        description="Your clients, conversations and creative collaborations."
      >
        {canAdmin && (
          <Button onClick={() => open({ kind: "client" })}>
            <Plus size={17} />
            New client
          </Button>
        )}
      </Heading>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search clients"
        />
        <select
          aria-label="Client status filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["Active", "Archived", "All"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="result-count">{list.length} clients</span>
      </div>
      <div className="client-grid">
        {list.map((client, i) => {
          const ps = d.projects.filter((p) => p.clientId === client.id);
          return (
            <button
              className="client-card"
              key={client.id}
              onClick={() => setSelected(client.id)}
            >
              <div className={"client-monogram art-" + (i % 4)}>
                {client.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
                <ArrowUpRight size={20} />
              </div>
              <div className="client-card-body">
                <div>
                  <h2>{client.name}</h2>
                  <Tag>{client.archived ? "Archived" : "Active"}</Tag>
                </div>
                <p>{client.companyInfo || "A new creative partnership."}</p>
                <div className="client-contact">
                  <Avatar small name={client.contact || client.name} />
                  <span>
                    {client.contact}
                    <small>{client.email || "No email added"}</small>
                  </span>
                </div>
                <footer>
                  <span>
                    {
                      ps.filter((p) => p.status !== d.settings.workflow[4])
                        .length
                    }{" "}
                    active projects
                  </span>
                  <span>
                    {
                      ps.filter((p) => p.status === d.settings.workflow[4])
                        .length
                    }{" "}
                    completed
                  </span>
                </footer>
              </div>
            </button>
          );
        })}
      </div>
      {!list.length && (
        <Empty
          title="Make a new connection."
          text="Add a client or adjust your search."
        />
      )}
      {c && (
        <Modal
          title={c.name + " · client workspace"}
          onClose={() => {
            setSelected(null);
            setConfirm(false);
          }}
          wide
        >
          <div className="client-detail">
            <div className="detail-contact">
              <Avatar name={c.contact || c.name} />
              <div>
                <strong>{c.contact || "Contact to be added"}</strong>
                <p>
                  {c.email} {c.phone && "· " + c.phone}
                </p>
              </div>
              <Tag>{c.archived ? "Archived" : "Active"}</Tag>
            </div>
            <p>{c.companyInfo}</p>
            <div className="stats-grid three">
              <Stat
                label="Active projects"
                value={
                  d.projects.filter(
                    (p) =>
                      p.clientId === c.id &&
                      p.status !== d.settings.workflow[4],
                  ).length
                }
              />
              <Stat
                label="Completed projects"
                value={
                  d.projects.filter(
                    (p) =>
                      p.clientId === c.id &&
                      p.status === d.settings.workflow[4],
                  ).length
                }
              />
              <Stat
                label="Invoices"
                value={d.invoices.filter((i) => i.clientId === c.id).length}
              />
            </div>
            <h3>Projects</h3>
            {d.projects
              .filter((p) => p.clientId === c.id)
              .map((p) => (
                <button
                  key={p.id}
                  className="record-row"
                  onClick={() => {
                    nav("/projects/" + p.id);
                    setSelected(null);
                  }}
                >
                  <strong>{p.name}</strong>
                  <Tag>{p.status}</Tag>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            <h3>Invoice history</h3>
            <InvoiceList
              invoices={d.invoices.filter((i) => i.clientId === c.id)}
              compact
            />
            <div className="internal-note">
              <small>INTERNAL RELATIONSHIP NOTES</small>
              <p>{c.notes || "No notes added."}</p>
            </div>
            {canAdmin && (
              <div className="form-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null);
                    open({ kind: "client", record: c });
                  }}
                >
                  Edit client
                </Button>
                <Button variant="outline" onClick={() => setConfirm(true)}>
                  {c.archived ? "Restore client" : "Archive client"}
                </Button>
                <Button
                  onClick={() => {
                    setSelected(null);
                    open({
                      kind: "project",
                      record: undefined,
                      extra: { clientId: c.id },
                    });
                  }}
                >
                  New project
                </Button>
              </div>
            )}
            {confirm && (
              <div className="confirmation">
                <p>
                  {c.archived
                    ? "Restore this client to active partnerships?"
                    : "Archive this client? Active projects must be completed first."}
                </p>
                {error && <p role="alert">{error}</p>}
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Keep current status
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await act({ type: "archiveClient", id: c.id });
                      setConfirm(false);
                      toast("Client status updated.");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Confirm {c.archived ? "restore" : "archive"}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
export function Projects() {
  const { d, open, canAdmin } = useStudio();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("All stages"),
    [client, setClient] = useState("");
  const projects = d.projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (status === "All stages" || p.status === status) &&
      (!client || p.clientId === client),
  );
  return (
    <>
      <Heading
        eyebrow="FROM FIRST THOUGHT TO FINAL FILE"
        title="Work with a point of view."
        description="A considered home for every creative project."
      >
        {canAdmin && (
          <Button onClick={() => open({ kind: "project" })}>
            <Plus size={17} />
            New project
          </Button>
        )}
      </Heading>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search projects"
        />
        <select
          aria-label="Project stage filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All stages</option>
          {d.settings.workflow.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Project client filter"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">All clients</option>
          {d.clients.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="result-count">{projects.length} projects</span>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <ProjectCard p={p} key={p.id} />
        ))}
      </div>
      {!projects.length && (
        <Empty
          title="A blank canvas, in the best way."
          text="Create a project or change your filters."
        />
      )}
    </>
  );
}
export function ProjectDetail({ id }: { id: string }) {
  const { d, open, nav, canAdmin } = useStudio();
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).get("tab") || "Overview",
  );
  const p = d.projects.find((p) => p.id === id);
  if (!p)
    return (
      <Empty
        title="This project is unavailable."
        text="The project may not be assigned to you."
      >
        <Button onClick={() => nav("/projects")}>Back to projects</Button>
      </Empty>
    );
  const c = d.clients.find((c) => c.id === p.clientId)!,
    time = projectTime(d, p.id);
  const tasks = d.tasks.filter((t) => t.projectId === p.id);
  return (
    <>
      <div className="project-breadcrumb">
        <button onClick={() => nav("/projects")}>Projects</button>
        <span>/</span>
        {c.name}
      </div>
      <div className="project-detail-hero">
        <img src={artwork(c.name, p.art)} alt="Project creative identity" />
        <div>
          <div className="eyebrow">
            {p.type} <span>·</span> {c.name}
          </div>
          <h1>{p.name}</h1>
          <div className="project-meta">
            <Tag>{p.status}</Tag>
            <Tag>{p.priority}</Tag>
            <span>
              <CalendarDays size={16} />
              {dateText(p.deadline)}
            </span>
          </div>
        </div>
        {canAdmin && (
          <Button
            variant="outline"
            onClick={() => open({ kind: "project", record: p })}
          >
            <Edit3 size={16} />
            Edit project
          </Button>
        )}
      </div>
      <div className="tabs">
        {[
          "Overview",
          "Tasks",
          "Deliverables",
          "Time",
          "Client feedback",
          ...(canAdmin ? ["Financials"] : []),
          "Activity",
        ].map((t) => (
          <button
            className={t === tab ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Tasks" && <span>{tasks.length}</span>}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <div className="stats-grid">
            <Stat
              label="Project progress"
              value={
                tasks.length
                  ? `${Math.round((tasks.filter((t) => t.status === d.settings.workflow[4]).length / tasks.length) * 100)}%`
                  : "0%"
              }
              note={`${tasks.filter((t) => t.status === d.settings.workflow[4]).length}/${tasks.length} tasks completed`}
            />
            <Stat
              label="Project deadline"
              value={dateText(p.deadline)}
              note={
                p.deadline < today() && p.status !== d.settings.workflow[4]
                  ? "Overdue — needs attention"
                  : "Keep the creative momentum"
              }
            />
            <Stat
              label="Tracked / estimated"
              value={`${time.tracked.toFixed(1)} / ${time.estimated} h`}
            />
            <Stat
              label="Deliverables"
              value={
                d.deliverables.filter((dl) => dl.projectId === p.id).length
              }
              note="Every version, thoughtfully preserved"
            />
          </div>
          <div className="project-overview">
            <section className="panel">
              <h2>The brief</h2>
              <p className="body-copy">
                {p.description ||
                  "Add a description to bring the brief into focus."}
              </p>
              <div className="brief-meta">
                <div>
                  <small>CLIENT</small>
                  <strong>{c.name}</strong>
                </div>
                <div>
                  <small>START DATE</small>
                  <strong>{dateText(p.start)}</strong>
                </div>
                <div>
                  <small>BILLING MODEL</small>
                  <strong>{p.billing}</strong>
                </div>
                {canAdmin && (
                  <div>
                    <small>PROJECT VALUE</small>
                    <strong>{money(p.budget, d.settings.currency)}</strong>
                  </div>
                )}
              </div>
              <div className="internal-note">
                <small>INTERNAL PROJECT NOTES</small>
                <p>{p.notes || "No internal notes yet."}</p>
              </div>
            </section>
            <section className="panel">
              <h2>The people making it happen</h2>
              {p.members.map((id) => {
                const person = d.people.find((x) => x.id === id)!;
                return (
                  <div className="person-row" key={id}>
                    <Avatar name={person?.name || "Team member"} />
                    <div>
                      <strong>{person?.name}</strong>
                      <small>{person?.role.toLowerCase()}</small>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="outline"
                onClick={() => {
                  setTab("Tasks");
                  open({ kind: "task", projectId: p.id });
                }}
              >
                <Plus size={16} />
                Add a task
              </Button>
            </section>
          </div>
          <div className="section-heading">
            <h2>Next in production</h2>
            <Button variant="text" onClick={() => setTab("Tasks")}>
              All tasks <ArrowUpRight size={16} />
            </Button>
          </div>
          <TaskList projectId={p.id} limit={4} />
        </>
      )}
      {tab === "Tasks" && (
        <>
          <div className="section-heading">
            <h2>Make the work move.</h2>
            <Button onClick={() => open({ kind: "task", projectId: p.id })}>
              <Plus size={16} />
              New task
            </Button>
          </div>
          <TaskList projectId={p.id} />
        </>
      )}
      {tab === "Deliverables" && <Deliverables projectId={p.id} />}{" "}
      {tab === "Time" && <TimeTracking projectId={p.id} />}{" "}
      {tab === "Client feedback" && (
        <>
          <section className="panel">
            <h2>Review & approval history</h2>
            <div className="activity-list">
              {d.approvals
                .filter((a) => a.projectId === p.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <article key={a.id}>
                    <span className="activity-dot" />
                    <div>
                      <Tag>{a.action}</Tag>
                      <strong>
                        {
                          d.deliverables.find(
                            (dl) =>
                              dl.id ===
                              d.versions.find((v) => v.id === a.versionId)
                                ?.deliverableId,
                          )?.title
                        }{" "}
                        · {d.versions.find((v) => v.id === a.versionId)?.label}
                      </strong>
                      <p>
                        {a.actor} · {timeText(a.createdAt)}
                      </p>
                      {a.feedback && <blockquote>{a.feedback}</blockquote>}
                    </div>
                  </article>
                ))}
            </div>
          </section>
          <Discussion projectId={p.id} />
        </>
      )}
      {tab === "Financials" && canAdmin && (
        <>
          <div className="stats-grid three">
            <Stat
              label="Project value"
              value={money(p.budget, d.settings.currency)}
            />
            <Stat
              label="Billable value"
              value={money(time.value, d.settings.currency)}
              note={`${hours(time.billable)} × ${money(p.hourlyRate, d.settings.currency)}`}
            />
            <Stat
              label="Recorded payments"
              value={money(
                d.payments
                  .filter((pay) =>
                    d.invoices.some(
                      (i) => i.projectId === p.id && i.id === pay.invoiceId,
                    ),
                  )
                  .reduce((s, p) => s + p.amount, 0),
                d.settings.currency,
              )}
            />
          </div>
          <div className="section-heading">
            <h2>Project invoices</h2>
            <Button onClick={() => open({ kind: "invoice", projectId: p.id })}>
              <Plus size={16} />
              Create invoice
            </Button>
          </div>
          <InvoiceList
            invoices={d.invoices.filter((i) => i.projectId === p.id)}
          />
        </>
      )}
      {tab === "Activity" && (
        <section className="panel">
          <h2>The project story</h2>
          <div className="activity-list">
            {d.activity
              .filter((a) => a.projectId === p.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((a) => (
                <article key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.message}</strong>
                    <p>
                      {a.actor} · {timeText(a.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}
    </>
  );
}
export function Deadlines() {
  const { d, nav } = useStudio();
  const [view, setView] = useState("List view"),
    [filter, setFilter] = useState("All deadlines"),
    [month, setMonth] = useState(() => new Date(today() + "T12:00:00"));
  const all = [
    ...d.tasks
      .filter((t) => t.deadline && t.status !== d.settings.workflow[4])
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.deadline,
        type: "Task",
        projectId: t.projectId,
      })),
    ...d.projects
      .filter((p) => p.status !== d.settings.workflow[4])
      .map((p) => ({
        id: p.id,
        title: p.name,
        date: p.deadline,
        type: "Project",
        projectId: p.id,
      })),
    ...d.versions
      .filter((v) => v.status === "Client Review" && v.reviewDeadline)
      .map((v) => {
        const dl = d.deliverables.find((x) => x.id === v.deliverableId)!;
        return {
          id: v.id,
          title: dl.title + " · " + v.label,
          date: v.reviewDeadline,
          type: "Client review",
          projectId: dl.projectId,
        };
      }),
  ]
    .filter(
      (x) =>
        filter === "All deadlines" ||
        (filter === "Today" && x.date === today()) ||
        (filter === "Overdue" && x.date < today()) ||
        (filter === "Upcoming" && x.date > today()),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = (first.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <>
      <Heading
        eyebrow="MAKE ROOM FOR WHAT’S NEXT"
        title="Keep the big picture in sight."
        description="Production deadlines, project milestones and client reviews."
      />
      <div className="toolbar">
        <div className="segmented">
          {["List view", "Calendar view"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <select
          aria-label="Deadline filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["All deadlines", "Today", "Upcoming", "Overdue"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="result-count">{all.length} deadlines</span>
      </div>
      {view === "List view" ? (
        <section className="panel deadline-list">
          {all.map((x) => (
            <button
              className="deadline-row"
              key={x.type + x.id}
              onClick={() => nav("/projects/" + x.projectId)}
            >
              <div className={"date-tile " + (x.date < today() ? "late" : "")}>
                <strong>{new Date(x.date + "T12:00:00").getDate()}</strong>
                <small>
                  {new Date(x.date + "T12:00:00").toLocaleDateString("en-GB", {
                    month: "short",
                  })}
                </small>
              </div>
              <span>
                <strong>{x.title}</strong>
                <small>
                  {d.projects.find((p) => p.id === x.projectId)?.name}
                </small>
              </span>
              <Tag>{x.type}</Tag>
              <span className={x.date < today() ? "overdue" : ""}>
                {x.date < today()
                  ? "Overdue · "
                  : x.date === today()
                    ? "Today · "
                    : ""}
                {dateText(x.date)}
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!all.length && (
            <Empty
              title="A little breathing room."
              text="No deadlines match this filter."
            />
          )}
        </section>
      ) : (
        <section className="panel calendar">
          <div className="calendar-heading">
            <h2>
              {month.toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div>
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={19} />
              </button>
              <Button
                variant="text"
                onClick={() => setMonth(new Date(today() + "T12:00:00"))}
              >
                Today
              </Button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div className="day-label" key={day}>
                {day}
              </div>
            ))}
            {Array.from(
              { length: Math.ceil((offset + days) / 7) * 7 },
              (_, i) => {
                const n = i - offset + 1,
                  date =
                    n > 0 && n <= days
                      ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`
                      : "";
                return (
                  <div
                    className={
                      "calendar-cell " +
                      (date === today() ? "today" : "") +
                      (date ? "" : "outside")
                    }
                    key={i}
                  >
                    {date && (
                      <>
                        <strong>{n}</strong>
                        {all
                          .filter((x) => x.date === date)
                          .map((x) => (
                            <button
                              key={x.type + x.id}
                              onClick={() => nav("/projects/" + x.projectId)}
                              title={x.title}
                              className={date < today() ? "late" : ""}
                            >
                              {date < today() ? "! " : ""}
                              {x.title}
                              <small>{x.type}</small>
                            </button>
                          ))}
                      </>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}
    </>
  );
}
