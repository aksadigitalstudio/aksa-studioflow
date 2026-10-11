import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  X,
  ArrowUpRight,
  ChevronDown,
  Check,
  Plus,
  Search,
  LoaderCircle,
} from "lucide-react";
import { CONFIG, money, dateText, artwork, today } from "./config";
import type { Data, Person, Operation, Project } from "./types";
export type Editor = {
  kind: string;
  record?: any;
  projectId?: string;
  extra?: any;
};
export const Context = createContext<{
  d: Data;
  actor: Person;
  act: (op: Operation) => Promise<any>;
  open: (e: Editor) => void;
  nav: (path: string) => void;
  toast: (s: string) => void;
  canAdmin: boolean;
} | null>(null);
export const useStudio = () => {
  const x = useContext(Context);
  if (!x) throw Error("Workspace unavailable");
  return x;
};
export function Button({
  children,
  variant = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button {...props} className={`button ${variant} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function Tag({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const text = String(children);
  const cls =
    tone ||
    (text.match(/Completed|Approved|PAID$/) && text !== "PARTIALLY PAID"
      ? "green"
      : text.match(/Review|SENT|Progress/)
        ? "blue"
        : text.match(/Overdue|OVERDUE|Revision|Urgent/)
          ? "red"
          : text === "High"
            ? "gold"
            : "");
  return <span className={"tag " + cls}>{children}</span>;
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span className={"avatar " + (small ? "small" : "")}>
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet.",
  text = "Add your first item to get started.",
  children,
}: {
  title?: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span>↗</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            "aria-label": (children.props as any)["aria-label"] || label,
          })
        : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Stat({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className={"stat " + (accent ? "accent" : "")}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>("input,button,select,textarea")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const elements = [
          ...dialog!.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ),
        ].filter((x) => x.getClientRects().length);
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function ProjectCard({ p }: { p: Project }) {
  const { d, nav } = useStudio();
  const tasks = d.tasks.filter((t) => t.projectId === p.id),
    count = tasks.filter((t) => t.status === d.settings.workflow[4]).length;
  return (
    <article className="project-card">
      <button
        className="project-art"
        onClick={() => nav("/projects/" + p.id)}
        aria-label={"Open " + p.name}
      >
        <img
          src={artwork(
            d.clients.find((c) => c.id === p.clientId)?.name || p.name,
            p.art,
          )}
          alt={p.type + " project artwork"}
        />
        <span>
          <ArrowUpRight size={22} />
        </span>
      </button>
      <div className="project-card-body">
        <div className="project-card-top">
          <small>{d.clients.find((c) => c.id === p.clientId)?.name}</small>
          <Tag>{p.priority}</Tag>
        </div>
        <button
          className="link-heading"
          onClick={() => nav("/projects/" + p.id)}
        >
          {p.name}
        </button>
        <div className="project-card-meta">
          <Tag>{p.status}</Tag>
          <span
            className={
              p.deadline < today() && p.status !== d.settings.workflow[4]
                ? "overdue"
                : ""
            }
          >
            {p.deadline < today() && p.status !== d.settings.workflow[4]
              ? "Overdue · "
              : ""}
            {dateText(p.deadline)}
          </span>
        </div>
        <div className="progress">
          <i
            style={{
              width: tasks.length ? (count / tasks.length) * 100 + "%" : "0%",
            }}
          />
        </div>
        <div className="project-card-footer">
          <div className="avatars">
            {p.members.slice(0, 3).map((id) => (
              <Avatar
                key={id}
                small
                name={d.people.find((x) => x.id === id)?.name || "Team member"}
              />
            ))}
          </div>
          <small>
            {count}/{tasks.length} tasks
          </small>
        </div>
      </div>
    </article>
  );
}
export const Loading = ({
  text = "Getting your workspace ready…",
}: {
  text?: string;
}) => (
  <div className="loading">
    <LoaderCircle size={24} className="spin" />
    <p>{text}</p>
  </div>
);
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={"brand " + (light ? "light" : "")}>
      <span className="brand-symbol">
        A<span>✳</span>
      </span>
      <span>
        {CONFIG.appName.replace(CONFIG.agency.name.split(" ")[0] + " ", "")}
        <small>BY {CONFIG.agency.name.toUpperCase()}</small>
      </span>
    </span>
  );
}
export async function copyText(text: string, toast: (s: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Link copied to clipboard.");
  } catch {
    toast("Clipboard unavailable. Select and copy the displayed link.");
  }
}
export const hours = (v: number) => `${v.toFixed(1)} h`;
