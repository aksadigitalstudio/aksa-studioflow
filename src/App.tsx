import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Columns3,
  CalendarDays,
  Clock3,
  Files,
  ExternalLink,
  ReceiptText,
  ChartNoAxesCombined,
  Settings2,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Command,
} from "lucide-react";
import { CONFIG, today, uid, dateText } from "./config";
import { repo, cloud, supabase, incompleteConfig } from "./store";
import { invoiceStatus } from "./domain";
import type { Data, Person, Operation } from "./types";
import {
  Context,
  Brand,
  Avatar,
  Button,
  Modal,
  Loading,
  SearchBox,
  Tag,
  Field,
  type Editor,
} from "./ui";
import {
  Dashboard,
  Clients,
  Projects,
  ProjectDetail,
  Deadlines,
} from "./Workspace";
import { Kanban, TimeTracking, Deliverables } from "./Production";
import { Invoices, Reports, Settings } from "./Finance";
import { ClientPortals, Portal, InvoicePage } from "./Portal";
import { EditDialog } from "./Editors";
const navigation: [string, [string, string, typeof LayoutDashboard][]][] = [
  [
    "Workspace",
    [
      ["Dashboard", "/", LayoutDashboard],
      ["Clients", "/clients", Users],
      ["Projects", "/projects", FolderKanban],
      ["Kanban board", "/kanban", Columns3],
      ["Calendar & deadlines", "/calendar", CalendarDays],
      ["Time tracking", "/time", Clock3],
      ["Deliverables", "/deliverables", Files],
    ],
  ],
  [
    "Business",
    [
      ["Client portals", "/portals", ExternalLink],
      ["Invoices", "/invoices", ReceiptText],
      ["Reports", "/reports", ChartNoAxesCombined],
      ["Settings", "/settings", Settings2],
    ],
  ],
];
export default function App() {
  const [path, setPath] = useState(location.pathname),
    [d, setData] = useState<Data | null>(null),
    [actor, setActor] = useState<Person | null>(null),
    [error, setError] = useState(""),
    [session, setSession] = useState<boolean | null>(cloud ? null : true),
    [editor, setEditor] = useState<Editor | null>(null),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState<string | null>(null),
    [notifications, setNotifications] = useState(false),
    [menu, setMenu] = useState(false);
  const portalMatch = path.match(/^\/portal\/([^/]+)\/?$/),
    invoiceMatch = path.match(/^\/invoice\/([^/]+)\/?$/),
    external = Boolean(portalMatch || invoiceMatch);
  const nav = (p: string) => {
    history.pushState({}, "", p);
    setPath(location.pathname);
    setMenu(false);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const pop = () => {
      setPath(location.pathname);
      setMenu(false);
    };
    window.addEventListener("popstate", pop);
    const link = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (
        !a ||
        e.defaultPrevented ||
        e.button ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        a.target ||
        a.hasAttribute("download")
      )
        return;
      const u = new URL(a.href);
      if (u.origin !== location.origin || u.hash) return;
      e.preventDefault();
      nav(u.pathname + u.search);
    };
    document.addEventListener("click", link);
    return () => {
      window.removeEventListener("popstate", pop);
      document.removeEventListener("click", link);
    };
  }, []);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(Boolean(s));
      if (!s) {
        setActor(null);
        setData(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  const refresh = useCallback(async () => {
    try {
      if (incompleteConfig)
        throw Error(
          "Complete both Supabase environment variables, or remove both to use Demo Mode.",
        );
      if (external) return;
      if (cloud && !session) return;
      const profile = actor || (await repo.profile());
      if (profile.role === "CLIENT") {
        setActor(profile);
        return;
      }
      const data = await repo.load(profile);
      setActor(profile);
      setData(data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [external, session, actor?.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (external || !actor) return;
    const id = setInterval(() => void refresh(), 10000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k" && !external) {
        e.preventDefault();
        setSearch("");
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [external]);
  if (portalMatch) return <Portal token={decodeURIComponent(portalMatch[1])} />;
  if (invoiceMatch)
    return <InvoicePage token={decodeURIComponent(invoiceMatch[1])} />;
  if (cloud && session === null)
    return <Loading text="Checking workspace access…" />;
  if (cloud && !session) return <Login refresh={refresh} />;
  if (actor?.role === "CLIENT") return <ClientLanding />;
  if (error && !d)
    return (
      <main className="fatal">
        <Brand />
        <h1>Your workspace is being prepared.</h1>
        <p role="alert">{error}</p>
        {cloud && (
          <Button
            onClick={() =>
              void supabase!
                .rpc("studio_bootstrap", { p_config: CONFIG })
                .then(({ error }) => {
                  if (error) setError(error.message);
                  else void refresh();
                })
            }
          >
            Initialize studio workspace
          </Button>
        )}
        <Button variant="outline" onClick={() => void refresh()}>
          Try again
        </Button>
        {cloud && (
          <Button variant="text" onClick={() => void supabase!.auth.signOut()}>
            Sign out
          </Button>
        )}
      </main>
    );
  if (!d || !actor) return <Loading />;
  const canAdmin = ["OWNER", "ADMIN"].includes(actor.role);
  const act = async (op: Operation) => {
    const result = await repo.action(
      { ...op, requestId: op.requestId || uid() },
      actor,
    );
    await refresh();
    return result;
  };
  const notice = (s: string) => setToast(s);
  let page: React.ReactNode;
  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch)
    page = <ProjectDetail id={decodeURIComponent(projectMatch[1])} />;
  else
    page =
      path === "/" ? (
        <Dashboard />
      ) : path === "/clients" ? (
        <Clients />
      ) : path === "/projects" ? (
        <Projects />
      ) : path === "/kanban" ? (
        <Kanban />
      ) : path === "/calendar" ? (
        <Deadlines />
      ) : path === "/time" ? (
        <TimeTracking />
      ) : path === "/deliverables" ? (
        <Deliverables />
      ) : path === "/portals" ? (
        <ClientPortals />
      ) : path === "/invoices" ? (
        <Invoices />
      ) : path === "/reports" ? (
        <Reports />
      ) : path === "/settings" ? (
        <Settings />
      ) : (
        <div className="empty">
          <h1>Page not found.</h1>
          <Button onClick={() => nav("/")}>Back to workspace</Button>
        </div>
      );
  const notes = [
    ...d.tasks
      .filter(
        (t) => t.assignee === actor.id && t.status !== d.settings.workflow[4],
      )
      .map((t) => ({
        id: "task-" + t.id,
        title:
          t.deadline && t.deadline < today()
            ? "Task overdue"
            : t.deadline &&
                t.deadline <=
                  new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
              ? "Deadline approaching"
              : "Assigned to you",
        text: t.title,
        path: "/projects/" + t.projectId,
      })),
    ...d.versions
      .filter((v) =>
        ["Client Review", "Revision Requested", "Approved"].includes(v.status),
      )
      .map((v) => {
        const dl = d.deliverables.find((x) => x.id === v.deliverableId)!;
        return {
          id: v.status + "-" + v.id,
          title:
            v.status === "Client Review"
              ? "Deliverable submitted"
              : v.status === "Approved"
                ? "Deliverable approved"
                : "Client requested a revision",
          text: dl.title + " · " + v.label,
          path: "/projects/" + dl.projectId,
        };
      }),
    ...d.invoices
      .filter((i) => invoiceStatus(i, d.payments) === "OVERDUE")
      .map((i) => ({
        id: "overdue-" + i.id,
        title: "Invoice overdue",
        text: i.number,
        path: "/invoices",
      })),
  ]
    .filter((x) => !d.dismissed.includes(x.id))
    .slice(0, 20);
  const index = [
    ...d.clients.map((x) => ({
      label: x.name,
      type: "Client",
      path: "/clients",
    })),
    ...d.projects.map((x) => ({
      label: x.name,
      type: "Project",
      path: "/projects/" + x.id,
    })),
    ...d.tasks.map((x) => ({
      label: x.title,
      type: "Task",
      path: "/projects/" + x.projectId,
    })),
    ...d.deliverables.map((x) => ({
      label: x.title,
      type: "Deliverable",
      path: "/projects/" + x.projectId,
    })),
    ...d.invoices.map((x) => ({
      label: x.number,
      type: "Invoice",
      path: "/invoices",
    })),
  ];
  return (
    <Context.Provider
      value={{ d, actor, act, open: setEditor, nav, toast: notice, canAdmin }}
    >
      <div className="app-shell">
        <aside className={"sidebar " + (menu ? "open" : "")}>
          <a href="/" aria-label={CONFIG.appName + " home"}>
            <Brand light />
          </a>
          <div className="studio-selector">
            <span className="studio-mark">A↗</span>
            <div>
              <strong>{d.settings.agencyName}</strong>
              <small>Creative workspace</small>
            </div>
          </div>
          <nav>
            {navigation.map(([group, links]) => (
              <section key={group}>
                <div className="nav-label">{group}</div>
                {links
                  .filter(
                    ([label]) =>
                      canAdmin ||
                      ![
                        "Clients",
                        "Client portals",
                        "Invoices",
                        "Reports",
                        "Settings",
                      ].includes(label),
                  )
                  .map(([label, route, Icon]) => (
                    <a
                      key={route}
                      href={route}
                      className={
                        path === route ||
                        (route === "/projects" && projectMatch)
                          ? "active"
                          : ""
                      }
                    >
                      <Icon size={18} />
                      {label}
                      {label === "Projects" && (
                        <span>
                          {
                            d.projects.filter(
                              (p) => p.status !== d.settings.workflow[4],
                            ).length
                          }
                        </span>
                      )}
                    </a>
                  ))}
              </section>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="studio-quote">
              Good work.
              <br />
              Better flow.<span>↗</span>
            </div>
            <div className="profile">
              <Avatar name={actor.name} />
              <div>
                <strong>{actor.name}</strong>
                <small>{actor.role.toLowerCase()}</small>
              </div>
              {cloud ? (
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={() => void supabase!.auth.signOut()}
                >
                  <LogOut size={17} />
                </button>
              ) : (
                <span className="demo-dot" />
              )}
            </div>
          </div>
        </aside>
        {menu && (
          <button
            className="mobile-overlay"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={21} />
              </button>
              <span>Workspace</span>
              <i>/</i>
              <strong>
                {projectMatch
                  ? "Project detail"
                  : navigation
                      .flatMap((x) => x[1])
                      .find((x) => x[1] === path)?.[0] || "Dashboard"}
              </strong>
            </div>
            <div className="top-actions">
              <button className="global-search" onClick={() => setSearch("")}>
                <Search size={16} />
                <span>Search anything…</span>
                <kbd>⌘ K</kbd>
              </button>
              {cloud ? (
                <span className="mode-pill">Connected workspace</span>
              ) : (
                <select
                  className="demo-identity"
                  aria-label="Demo identity"
                  value={actor.id}
                  onChange={(e) =>
                    setActor(
                      d.people.find((p) => p.id === e.target.value) || actor,
                    )
                  }
                >
                  {d.people
                    .filter((p) => p.role !== "CLIENT")
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {p.role}
                      </option>
                    ))}
                </select>
              )}
              <button
                className="icon-button notifications"
                aria-label={"Notifications · " + notes.length + " unread"}
                onClick={() => setNotifications(true)}
              >
                <Bell size={19} />
                {notes.length > 0 && <i />}
              </button>
            </div>
          </header>
          {error && <div className="alert error">{error}</div>}
          <main className="main-content">{page}</main>
          <footer className="app-footer">
            <span>
              {CONFIG.appName} <i>·</i> Made for the way creatives work.
            </span>
            <span>
              {cloud
                ? "Protected team workspace"
                : "Demo data · saved in this browser"}
            </span>
          </footer>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {editor && (
        <EditDialog
          key={editor.kind + (editor.record?.id || "new")}
          editor={editor}
          onClose={() => setEditor(null)}
        />
      )}{" "}
      {search !== null && (
        <Modal title="Find your next thing." onClose={() => setSearch(null)}>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search clients, projects, tasks, deliverables or invoices"
          />
          <div className="search-results">
            {index
              .filter((x) =>
                x.label.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, 18)
              .map((x, i) => (
                <button
                  key={i}
                  onClick={() => {
                    nav(x.path);
                    setSearch(null);
                  }}
                >
                  <span>
                    <small>{x.type}</small>
                    <strong>{x.label}</strong>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
          </div>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Your studio pulse."
          onClose={() => setNotifications(false)}
        >
          <div className="notification-list">
            {notes.length ? (
              notes.map((n) => (
                <article key={n.id}>
                  <button
                    onClick={() => {
                      nav(n.path);
                      setNotifications(false);
                    }}
                  >
                    <small>{n.title}</small>
                    <strong>{n.text}</strong>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Dismiss " + n.text}
                    onClick={() => void act({ type: "dismiss", id: n.id })}
                  >
                    <X size={16} />
                  </button>
                </article>
              ))
            ) : (
              <p>You’re all caught up.</p>
            )}
          </div>
        </Modal>
      )}
    </Context.Provider>
  );
}
function Login({ refresh }: { refresh: () => Promise<void> }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <div className="login-story">
        <Brand light />
        <div>
          <span className="eyebrow">YOUR CREATIVE WORKSPACE</span>
          <h1>
            Great work
            <br />
            starts with
            <br />
            <em>good flow.</em>
          </h1>
          <p>
            Projects, people and possibilities. All in one considered place.
          </p>
        </div>
        <small>{CONFIG.agency.description}</small>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const { error } = await supabase!.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">WELCOME BACK</span>
        <h2>
          Make room for
          <br />
          your best work.
        </h2>
        <p>Sign in with your provisioned team or client account.</p>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {busy ? "Signing in…" : "Sign in to workspace"}
          <ArrowUpRight size={18} />
        </Button>
        <small>Access is managed by your studio administrator.</small>
      </form>
    </div>
  );
}
function ClientLanding() {
  const [token, setToken] = useState("");
  return (
    <main className="fatal">
      <Brand />
      <h1>Your client workspace.</h1>
      <p>
        Open the portal link supplied by the studio, or paste its token below.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          location.href = "/portal/" + encodeURIComponent(token);
        }}
      >
        <Field label="Portal token">
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <Button>Open client portal</Button>
      </form>
      <Button variant="text" onClick={() => void supabase!.auth.signOut()}>
        Sign out
      </Button>
    </main>
  );
}
