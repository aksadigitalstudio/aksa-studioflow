import { useEffect, useRef, useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Play,
  Pause,
  Square,
  Clock3,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Upload,
  Eye,
  Send,
  FileText,
  Check,
  ExternalLink,
  Download,
} from "lucide-react";
import { money, dateText, timeText, today, artwork } from "./config";
import { elapsed, projectTime, latest, allowedURL } from "./domain";
import {
  useStudio,
  Heading,
  Button,
  Tag,
  Empty,
  SearchBox,
  Avatar,
  Modal,
  Field,
  Stat,
  hours,
} from "./ui";
import type { Version, Data } from "./types";
export function TaskList({
  projectId,
  limit,
}: {
  projectId?: string;
  limit?: number;
}) {
  const { d, open, act, toast } = useStudio();
  const tasks = d.tasks
    .filter((t) => !projectId || t.projectId === projectId)
    .slice(0, limit);
  const [error, setError] = useState("");
  return (
    <>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="task-list">
        {tasks.map((t) => (
          <article key={t.id} className="task-list-row">
            <button
              className="task-complete icon-button"
              aria-label={"Toggle completion " + t.title}
              onClick={async () => {
                try {
                  await act({
                    type: "moveTask",
                    id: t.id,
                    status:
                      t.status === d.settings.workflow[4]
                        ? d.settings.workflow[1]
                        : d.settings.workflow[4],
                  });
                  toast("Task stage updated.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <span
                className={t.status === d.settings.workflow[4] ? "checked" : ""}
              >
                {t.status === d.settings.workflow[4] && <Check size={14} />}
              </span>
            </button>
            <button
              className="task-title"
              onClick={() => open({ kind: "task", record: t })}
            >
              <strong>{t.title}</strong>
              <small>
                {d.projects.find((p) => p.id === t.projectId)?.name}
              </small>
            </button>
            <Tag>{t.priority}</Tag>
            <span
              className={
                t.deadline &&
                t.deadline < today() &&
                t.status !== d.settings.workflow[4]
                  ? "overdue"
                  : "task-date"
              }
            >
              {t.deadline < today() && t.status !== d.settings.workflow[4]
                ? "Overdue · "
                : ""}
              {dateText(t.deadline)}
            </span>
            <Avatar
              small
              name={d.people.find((p) => p.id === t.assignee)?.name || "Team"}
            />
            <select
              aria-label={"Move " + t.title}
              value={t.status}
              onChange={async (e) => {
                try {
                  await act({
                    type: "moveTask",
                    id: t.id,
                    status: e.target.value,
                  });
                  toast("Task and project workflow updated.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {d.settings.workflow.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </article>
        ))}
      </div>
      {!tasks.length && (
        <Empty
          title="The next step starts here."
          text="Add a task to give your project momentum."
        />
      )}
    </>
  );
}
export function Kanban() {
  const { d, open, act, toast } = useStudio();
  const [project, setProject] = useState(""),
    [client, setClient] = useState(""),
    [assignee, setAssignee] = useState(""),
    [priority, setPriority] = useState(""),
    [deadline, setDeadline] = useState(""),
    [search, setSearch] = useState(""),
    [dragged, setDragged] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const tasks = d.tasks.filter(
    (t) =>
      (!project || t.projectId === project) &&
      (!client ||
        d.projects.find((p) => p.id === t.projectId)?.clientId === client) &&
      (!assignee || t.assignee === assignee) &&
      (!priority || t.priority === priority) &&
      (!deadline ||
        (deadline === "Overdue" &&
          t.deadline &&
          t.deadline < today() &&
          t.status !== d.settings.workflow[4]) ||
        (deadline === "Today" && t.deadline === today()) ||
        (deadline === "Upcoming" && t.deadline > today())) &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );
  const move = async (id: string, status: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await act({ type: "moveTask", id, status });
      toast("Task moved. Project workflow updated.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setDragged("");
    }
  };
  return (
    <>
      <Heading
        eyebrow="THOUGHTFULLY IN MOTION"
        title="A good idea needs a good flow."
        description="Move the work forward. One considered step at a time."
      >
        <Button
          onClick={() =>
            open({ kind: "task", projectId: project || undefined })
          }
        >
          <Plus size={17} />
          New task
        </Button>
      </Heading>
      <div className="toolbar kanban-filters">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search tasks"
        />
        <select
          aria-label="Kanban project filter"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="">All projects</option>
          {d.projects.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Kanban client filter"
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
        <select
          aria-label="Kanban assignee filter"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">All assignees</option>
          {d.people
            .filter((p) => p.role !== "CLIENT")
            .map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Kanban priority filter"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {["Low", "Medium", "High", "Urgent"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Kanban deadline filter"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        >
          <option value="">Any deadline</option>
          {["Today", "Upcoming", "Overdue"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="kanban-scroll">
        <div className="kanban">
          {d.settings.workflow.map((stage, i) => (
            <section
              className={"kanban-column stage-" + i}
              key={stage}
              aria-label={stage + " column"}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id && d.tasks.some((t) => t.id === id))
                  void move(id, stage);
              }}
            >
              <header>
                <span className="stage-dot" />
                <h2>{stage}</h2>
                <small>{tasks.filter((t) => t.status === stage).length}</small>
                <button
                  className="icon-button"
                  aria-label={"Add task to " + stage}
                  onClick={() =>
                    open({
                      kind: "task",
                      projectId: project || undefined,
                      extra: { status: stage },
                    })
                  }
                >
                  <Plus size={16} />
                </button>
              </header>
              <div className="kanban-cards">
                {tasks
                  .filter((t) => t.status === stage)
                  .map((t) => (
                    <article
                      className={
                        "kanban-card " + (dragged === t.id ? "dragging" : "")
                      }
                      key={t.id}
                      draggable={!busy}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragged(t.id);
                      }}
                      onDragEnd={() => setDragged("")}
                    >
                      <div className="card-labels">
                        <small>
                          {d.projects.find((p) => p.id === t.projectId)?.type}
                        </small>
                        <Tag>{t.priority}</Tag>
                      </div>
                      <button
                        className="kanban-task-title"
                        onClick={() => open({ kind: "task", record: t })}
                      >
                        {t.title}
                      </button>
                      <p>
                        {
                          d.clients.find(
                            (c) =>
                              c.id ===
                              d.projects.find((p) => p.id === t.projectId)
                                ?.clientId,
                          )?.name
                        }
                      </p>
                      {t.checklist.length > 0 && (
                        <div className="checklist-mini">
                          <CheckSquare size={14} />
                          {t.checklist.filter((c) => c.done).length}/
                          {t.checklist.length} checklist complete
                        </div>
                      )}
                      <footer>
                        <span
                          className={
                            t.deadline < today() &&
                            t.status !== d.settings.workflow[4]
                              ? "overdue"
                              : ""
                          }
                        >
                          {t.deadline < today() &&
                          t.status !== d.settings.workflow[4]
                            ? "Overdue · "
                            : ""}
                          {dateText(t.deadline)}
                        </span>
                        <Avatar
                          small
                          name={
                            d.people.find((p) => p.id === t.assignee)?.name ||
                            "Team"
                          }
                        />
                      </footer>
                      <select
                        aria-label={"Move " + t.title}
                        value={t.status}
                        disabled={busy}
                        onChange={(e) => void move(t.id, e.target.value)}
                      >
                        {d.settings.workflow.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </article>
                  ))}
              </div>
              <button
                className="add-task-column"
                onClick={() =>
                  open({
                    kind: "task",
                    projectId: project || undefined,
                    extra: { status: stage },
                  })
                }
              >
                <Plus size={15} />
                Add a task
              </button>
            </section>
          ))}
        </div>
      </div>
      <p className="quiet-note">
        Drag a card to a stage, or use its stage menu. Project status follows
        the production workflow.
      </p>
    </>
  );
}
export function TimeTracking({ projectId }: { projectId?: string }) {
  const { d, actor, act, open, canAdmin, toast } = useStudio();
  const [filter, setFilter] = useState(projectId || ""),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState("");
  const timer = d.timers.find((t) => t.userId === actor.id);
  useEffect(() => {
    const update = () => setSeconds(timer ? elapsed(timer) : 0);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timer]);
  const entries = d.timeEntries
    .filter((t) => !filter || t.projectId === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const billable = entries
      .filter((t) => t.billable)
      .reduce((s, t) => s + t.seconds / 3600, 0),
    nonbillable = entries
      .filter((t) => !t.billable)
      .reduce((s, t) => s + t.seconds / 3600, 0);
  const estimated = d.tasks
    .filter((t) => !filter || t.projectId === filter)
    .reduce((s, t) => s + t.estimatedHours, 0);
  const control = async (type: string) => {
    try {
      await act({ type, id: timer!.id });
      toast(
        type === "stopTimer" ? "Time saved to your project." : "Timer updated.",
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <Heading
        eyebrow="TIME WELL SPENT"
        title="Make your focus count."
        description="A clear record of the work behind the work."
      >
        <Button
          variant="outline"
          onClick={() => open({ kind: "time", projectId: filter || undefined })}
        >
          <Plus size={16} />
          Manual entry
        </Button>
        <Button
          onClick={() =>
            open({ kind: "timer", projectId: filter || undefined })
          }
          disabled={Boolean(timer)}
        >
          <Play size={16} />
          Start timer
        </Button>
      </Heading>
      {timer && (
        <section className="active-timer">
          <div className="timer-icon">
            <Clock3 size={25} />
          </div>
          <div>
            <small>
              {timer.startedAt ? "FOCUS SESSION IN PROGRESS" : "SESSION PAUSED"}
            </small>
            <strong>{timer.note}</strong>
            <p>
              {d.projects.find((p) => p.id === timer.projectId)?.name}{" "}
              {timer.taskId &&
                "· " + d.tasks.find((t) => t.id === timer.taskId)?.title}
            </p>
          </div>
          <time>
            {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
            {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </time>
          <Button
            variant="outline"
            onClick={() =>
              void control(timer.startedAt ? "pauseTimer" : "resumeTimer")
            }
          >
            {timer.startedAt ? <Pause size={16} /> : <Play size={16} />}{" "}
            {timer.startedAt ? "Pause" : "Resume"}
          </Button>
          <Button onClick={() => void control("stopTimer")}>
            <Square size={14} />
            Stop & save
          </Button>
        </section>
      )}
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <div className="stats-grid">
        <Stat label="Estimated hours" value={hours(estimated)} />
        <Stat label="Tracked hours" value={hours(billable + nonbillable)} />
        <Stat label="Billable hours" value={hours(billable)} accent />
        <Stat label="Non-billable hours" value={hours(nonbillable)} />
      </div>
      <div className="toolbar">
        <h2>Time, thoughtfully accounted for.</h2>
        {!projectId && (
          <select
            aria-label="Time project filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {d.projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Work & project</th>
              <th>Team member</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Billing</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.note}</strong>
                  <small>
                    {d.projects.find((p) => p.id === t.projectId)?.name}
                    {t.taskId &&
                      " · " +
                        d.tasks.find((task) => task.id === t.taskId)?.title}
                  </small>
                </td>
                <td>{d.people.find((p) => p.id === t.userId)?.name}</td>
                <td>{dateText(t.date)}</td>
                <td className="number">{hours(t.seconds / 3600)}</td>
                <td>
                  <Tag>{t.billable ? "Billable" : "Non-billable"}</Tag>
                </td>
                <td>
                  {t.invoicedId ? (
                    <Tag>Billed</Tag>
                  ) : canAdmin && t.billable ? (
                    <Button
                      variant="text"
                      onClick={async () => {
                        try {
                          await act({ type: "approveTime", id: t.id });
                          toast("Time approval updated.");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      {t.approved ? (
                        <>
                          <Check size={14} />
                          Approved
                        </>
                      ) : (
                        "Approve time"
                      )}
                    </Button>
                  ) : (
                    <Tag>{t.approved ? "Approved" : "Pending"}</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && (
          <Empty
            title="A fresh start on the clock."
            text="Start a timer or add your first manual entry."
          />
        )}
      </div>
    </>
  );
}
export function Preview({ v, title }: { v: Version; title: string }) {
  const [failed, setFailed] = useState(false);
  const valid =
    v.file?.url && (v.file.url.startsWith("data:") || allowedURL(v.file.url));
  return (
    <div className="file-preview">
      {valid && v.file?.type.startsWith("image/") && !failed ? (
        <img
          src={v.file.url}
          alt={title + " · " + v.label}
          onError={() => setFailed(true)}
        />
      ) : valid && v.file?.type === "application/pdf" ? (
        <>
          <object
            data={v.file.url}
            type="application/pdf"
            aria-label={"PDF preview " + title}
          >
            <p>Preview unavailable in this browser.</p>
          </object>
          <a
            className="button outline"
            href={v.file.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF <ArrowUpRight size={16} />
          </a>
        </>
      ) : (
        <div className="preview-fallback">
          <FileText size={50} />
          <strong>{v.file?.name || "Linked creative work"}</strong>
          <span>{v.file?.type || "External preview"}</span>
          {v.url && allowedURL(v.url) ? (
            <a
              className="button outline"
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open preview <ExternalLink size={16} />
            </a>
          ) : v.file?.url && valid ? (
            <a
              href={v.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button outline"
            >
              Open file
            </a>
          ) : (
            <p>
              This file is not available for preview. Ask the studio for a
              refreshed link.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function Deliverables({ projectId }: { projectId?: string }) {
  const { d, open, act, toast } = useStudio();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All statuses"),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState("");
  const list = d.deliverables.filter(
    (dl) =>
      (!projectId || dl.projectId === projectId) &&
      dl.title.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "All statuses" || latest(d, dl.id)?.status === filter),
  );
  const dl = d.deliverables.find((dl) => dl.id === selected);
  const [vid, setVid] = useState("");
  const versions = dl
    ? d.versions
        .filter((v) => v.deliverableId === dl.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const v = versions.find((x) => x.id === vid) || versions[0];
  const submit = async (type: string, id: string) => {
    try {
      await act({ type, id });
      toast(
        type === "submit"
          ? "Submitted for client review."
          : "Moved to internal review.",
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <Heading
        eyebrow="THE WORK, IN ITS BEST LIGHT"
        title={
          projectId
            ? "From concept to considered outcome."
            : "Creative work. Thoughtfully delivered."
        }
        description="Files, feedback and every version along the way."
      >
        <Button onClick={() => open({ kind: "deliverable", projectId })}>
          <Plus size={17} />
          New deliverable
        </Button>
      </Heading>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search deliverables"
        />
        <select
          aria-label="Deliverable status filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "All statuses",
            "Draft",
            "Internal Review",
            "Client Review",
            "Revision Requested",
            "Approved",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="result-count">{list.length} deliverables</span>
      </div>
      <div className="deliverable-grid">
        {list.map((dl) => {
          const v = latest(d, dl.id),
            p = d.projects.find((p) => p.id === dl.projectId)!;
          return (
            <article className="deliverable-card" key={dl.id}>
              <button
                className="deliverable-thumb"
                onClick={() => {
                  setSelected(dl.id);
                  setVid("");
                }}
                aria-label={"Open deliverable " + dl.title}
              >
                {v?.file?.type.startsWith("image/") && v.file.url ? (
                  <img
                    src={v.file.url}
                    alt={dl.title}
                    onError={(e) => {
                      e.currentTarget.src = artwork(p.name, p.art);
                    }}
                  />
                ) : (
                  <img src={artwork(p.name, p.art)} alt="Project artwork" />
                )}
                <span>{v ? <Tag>{v.status}</Tag> : <Tag>Draft</Tag>}</span>
                <div className="thumb-icon">
                  <Eye size={19} />
                </div>
              </button>
              <div className="deliverable-card-body">
                <small>
                  {d.clients.find((c) => c.id === p.clientId)?.name} · {dl.kind}
                </small>
                <button
                  className="link-heading"
                  onClick={() => {
                    setSelected(dl.id);
                    setVid("");
                  }}
                >
                  {dl.title}
                </button>
                <footer>
                  <span>
                    {v?.label || "No version yet"} ·{" "}
                    {dateText(v?.createdAt || dl.createdAt)}
                  </span>
                  <button
                    className="text-link"
                    onClick={() =>
                      open({
                        kind: "version",
                        projectId: p.id,
                        extra: { deliverableId: dl.id },
                      })
                    }
                  >
                    <Plus size={15} />
                    Add version
                  </button>
                </footer>
              </div>
            </article>
          );
        })}
      </div>
      {!list.length && (
        <Empty
          title="Make something worth sharing."
          text="Create a deliverable and add its first version."
        />
      )}
      {dl && (
        <Modal
          title={dl.title}
          onClose={() => {
            setSelected(null);
            setError("");
          }}
          wide
        >
          <div className="deliverable-detail">
            <div className="version-switch">
              <select
                aria-label="Deliverable version"
                value={v?.id || ""}
                onChange={(e) => setVid(e.target.value)}
              >
                {versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.label} · {v.status}
                  </option>
                ))}
              </select>
              {v && <Tag>{v.status}</Tag>}
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  open({
                    kind: "version",
                    projectId: dl.projectId,
                    extra: { deliverableId: dl.id },
                  });
                }}
              >
                <Plus size={15} />
                New version
              </Button>
            </div>
            {v ? (
              <>
                <Preview v={v} title={dl.title} />
                <div className="version-actions">
                  {v.file?.url && (
                    <a
                      href={v.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button outline"
                    >
                      Open / download <Download size={16} />
                    </a>
                  )}
                  {v.status !== "Approved" && v.id === latest(d, dl.id)?.id && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => void submit("internalReview", v.id)}
                      >
                        Internal review
                      </Button>
                      <Button
                        onClick={() => void submit("submit", v.id)}
                        disabled={v.status === "Client Review"}
                      >
                        <Send size={16} />
                        {v.status === "Client Review"
                          ? "Awaiting client review"
                          : "Submit for client review"}
                      </Button>
                    </>
                  )}
                </div>
                {error && (
                  <p className="alert error" role="alert">
                    {error}
                  </p>
                )}
                <h3>Version history & decisions</h3>
                <div className="activity-list">
                  {d.approvals
                    .filter((a) => a.versionId === v.id)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((a) => (
                      <article key={a.id}>
                        <span className="activity-dot" />
                        <div>
                          <Tag>{a.action}</Tag>
                          <p>
                            {a.actor} · {timeText(a.createdAt)}
                          </p>
                          {a.feedback && <blockquote>{a.feedback}</blockquote>}
                        </div>
                      </article>
                    ))}
                </div>
                <p className="quiet-note">
                  Approved work is preserved. Add a new version for further
                  changes.
                </p>
              </>
            ) : (
              <Empty
                title="A version is the next step."
                text="Upload a preview or add a link to bring this deliverable to life."
              >
                <Button
                  onClick={() => {
                    setSelected(null);
                    open({
                      kind: "version",
                      projectId: dl.projectId,
                      extra: { deliverableId: dl.id },
                    });
                  }}
                >
                  <Upload size={16} />
                  Add first version
                </Button>
              </Empty>
            )}
            <Discussion projectId={dl.projectId} deliverableId={dl.id} />
          </div>
        </Modal>
      )}
    </>
  );
}
export function Discussion({
  projectId,
  deliverableId = "",
}: {
  projectId: string;
  deliverableId?: string;
}) {
  const { d, act, toast } = useStudio();
  const [text, setText] = useState(""),
    [visibility, setVisibility] = useState("Internal"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const comments = d.comments.filter(
    (c) =>
      c.projectId === projectId &&
      !c.taskId &&
      (!deliverableId || c.deliverableId === deliverableId),
  );
  return (
    <section className="panel discussion">
      <div className="panel-heading">
        <h2>Keep the conversation considered.</h2>
        <MessageSquare size={19} />
      </div>
      {comments.map((c) => (
        <article key={c.id}>
          <Avatar small name={c.author} />
          <div>
            <header>
              <strong>{c.author}</strong>
              <Tag>{c.visibility}</Tag>
              <small>{timeText(c.createdAt)}</small>
            </header>
            <p>{c.text}</p>
          </div>
        </article>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await act({
              type: "comment",
              data: { projectId, deliverableId, taskId: "", text, visibility },
            });
            setText("");
            toast(
              visibility === "Internal"
                ? "Internal comment added."
                : "Comment shared with the client.",
            );
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Your comment">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            maxLength={3000}
            placeholder="A thought, a question, a little direction…"
          />
        </Field>
        <div className="discussion-actions">
          <select
            aria-label="Comment visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option>Internal</option>
            <option>Client-visible</option>
          </select>
          <small>
            {visibility === "Internal"
              ? "Visible to the studio team only."
              : "This comment will appear in the client portal."}
          </small>
          <Button disabled={busy || !text.trim()}>
            Post comment <ArrowUpRight size={15} />
          </Button>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
