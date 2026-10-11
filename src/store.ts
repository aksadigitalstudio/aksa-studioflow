import { createClient } from "@supabase/supabase-js";
import { apply, portal, teamData, allowedURL } from "./domain";
import { seed } from "./seed";
import { uid } from "./config";
import type {
  Data,
  Person,
  Operation,
  Attachment,
  PortalData,
  Invoice,
  Payment,
} from "./types";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const incompleteConfig = Boolean(url) !== Boolean(key);
export const cloud = Boolean(url && key);
export const supabase = cloud ? createClient(url, key) : null;
let connection: Promise<IDBDatabase> | null = null;
function database() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("aksa-studioflow-demo-v1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        Error(
          "Browser storage is unavailable. Enable site storage for Demo Mode.",
        ),
      );
  }));
}
async function mutate<T>(action: (d: Data) => T): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite"),
      s = tx.objectStore("state"),
      r = s.get("data");
    let value: T, error: unknown;
    r.onsuccess = () => {
      try {
        const d: Data = r.result || seed();
        value = action(d);
        d.revision++;
        s.put(d, "data");
      } catch (e) {
        error = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(value);
    tx.onabort = tx.onerror = () =>
      reject(
        error ||
          Error("Nothing was saved. Storage may be full; try a smaller file."),
      );
  });
}
async function rpc<T>(name: string, args: object = {}): Promise<T> {
  if (!supabase) throw Error("Backend is not configured.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw Error(error.message);
  return data as T;
}
async function resolveFiles<T extends { versions?: any[]; tasks?: any[] }>(
  data: T,
): Promise<T> {
  if (!supabase) return data;
  const files = [
    ...(data.versions || []).map((v) => v.file),
    ...(data.tasks || []).flatMap((t) => t.attachments),
  ];
  for (const f of files) {
    if (f?.path) {
      const { data: link, error } = await supabase.storage
        .from("studio-files")
        .createSignedUrl(f.path, 3600);
      if (!error && link) f.url = link.signedUrl;
      else f.url = "";
    }
  }
  return data;
}
export const repo = {
  mode: cloud ? "cloud" : "demo",
  async profile(): Promise<Person> {
    if (incompleteConfig)
      throw Error(
        "Set both Supabase environment variables, or remove both for Demo Mode.",
      );
    if (cloud) return rpc("studio_profile");
    return mutate((d) => d.people[0]);
  },
  async load(actor: Person): Promise<Data> {
    if (cloud) return resolveFiles(await rpc<Data>("studio_team_data"));
    return mutate((d) => teamData(d, actor));
  },
  async action(op: Operation, actor: Person) {
    if (cloud) return rpc<string | null>("studio_action", { p_op: op });
    return mutate((d) => {
      const safe = d.people.find(
        (p) => p.id === actor.id && p.role === actor.role,
      );
      if (!safe) throw Error("Choose a valid demo team member.");
      return apply(d, op, safe);
    });
  },
  async portal(token: string): Promise<PortalData> {
    if (cloud)
      return resolveFiles(
        await rpc<PortalData>("studio_portal", { p_token: token }),
      );
    return mutate((d) => portal(d, token));
  },
  async clientAction(token: string, op: Operation) {
    if (cloud) return rpc("studio_client_action", { p_token: token, p_op: op });
    return mutate((d) => {
      const c = d.clients.find((c) => c.token === token && !c.archived);
      if (!c) throw Error("This client portal is unavailable.");
      return apply(d, op, {
        id: c.id,
        clientId: c.id,
        name: c.contact || c.name,
        initials: "CL",
        role: "CLIENT",
      });
    });
  },
  async invoice(
    token: string,
  ): Promise<{
    invoice: Invoice;
    payments: Payment[];
    clientName: string;
    projectName: string;
  }> {
    if (cloud) return rpc("studio_invoice", { p_token: token });
    return mutate((d) => {
      const i = d.invoices.find(
        (i) => i.token === token && i.status !== "DRAFT",
      );
      if (!i)
        throw Error("This invoice is unavailable or has not been issued.");
      return {
        invoice: i,
        payments: d.payments.filter((p) => p.invoiceId === i.id),
        clientName: d.clients.find((c) => c.id === i.clientId)!.name,
        projectName: d.projects.find((p) => p.id === i.projectId)!.name,
      };
    });
  },
  async upload(file: File, projectId: string): Promise<Attachment> {
    if (file.size > 10 * 1024 * 1024)
      throw Error("Choose a file smaller than 10 MB.");
    if (
      !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(
        file.type,
      )
    )
      throw Error(
        "Upload a PNG, JPEG, WebP or PDF. Use a preview link for other formats.",
      );
    let blob: Blob = file;
    if (file.type.startsWith("image/")) {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(Error("Image conversion failed."))),
          "image/webp",
          0.85,
        ),
      );
      image.close();
    }
    const id = uid(),
      name =
        blob.type === "image/webp"
          ? file.name.replace(/\.[^.]+$/, ".webp")
          : file.name;
    if (cloud) {
      const path = `${projectId}/${id}/${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase!.storage
        .from("studio-files")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw Error(error.message);
      const { data, error: e } = await supabase!.storage
        .from("studio-files")
        .createSignedUrl(path, 3600);
      if (e || !data)
        throw Error("File uploaded, but preview could not be created.");
      return {
        id,
        name,
        type: blob.type,
        size: blob.size,
        path,
        url: data.signedUrl,
      };
    }
    const dataURL = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(Error("Unable to read file."));
      r.readAsDataURL(blob);
    });
    return { id, name, type: blob.type, size: blob.size, url: dataURL };
  },
};
export function external(url: string) {
  return allowedURL(url) ? url : "#";
}
