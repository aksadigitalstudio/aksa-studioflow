export const CONFIG = {
  appName: "AKSA StudioFlow",
  agency: {
    name: "AKSA Studio",
    description:
      "A creative AI and digital studio for brands, stories and what comes next.",
    services: [
      "Branding",
      "Social media",
      "AI advertising",
      "Websites",
      "Creative campaigns",
    ],
    email: "hello@aksastudio.example",
    address: "Yogyakarta, Indonesia",
  },
  workflow: ["Backlog", "To Do", "In Progress", "Client Review", "Completed"],
  billing: {
    currency: "IDR",
    locale: "id-ID",
    taxRate: 0,
    hourlyRate: 350000,
    paymentInstructions:
      "Please contact the studio for bank transfer details. Include your invoice number as the payment reference.",
  },
  style: {
    ink: "#252925",
    paper: "#faf9f6",
    blue: "#4370e8",
    muted: "#8e948c",
  },
} as const;
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const now = () => new Date().toISOString();
export const money = (v: number, currency: string = CONFIG.billing.currency) =>
  new Intl.NumberFormat(CONFIG.billing.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
export const dateText = (v: string) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(v.slice(0, 10) + "T12:00:00"))
    : "No deadline";
export const timeText = (v: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(v));
export function artwork(label: string, kind: number = 0) {
  const titles = [
    "GOOD\nTHINGS\nGROW.",
    "A QUIETER\nKIND OF\nLUXURY.",
    "MAKE\nYOUR NEXT\nMOVE.",
    "NEW\nWAYS OF\nSEEING.",
  ];
  const colors = [
    ["#d7debe", "#34432d"],
    ["#ded3c3", "#4f3e36"],
    ["#dfe7fc", "#284fbb"],
    ["#d6cfeb", "#59417b"],
  ];
  const [bg, fg] = colors[kind % 4];
  const safe = label.replace(/[<>&"']/g, "");
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="440" viewBox="0 0 700 440"><rect width="700" height="440" fill="${bg}"/><g fill="none" stroke="${fg}" opacity=".25" stroke-width="2" transform="translate(540 220)">${Array.from({ length: 12 }, (_, i) => `<ellipse rx="${60 + i * 8}" ry="${160 - i * 5}" transform="rotate(${i * 12})"/>`).join("")}</g><g fill="${fg}" font-family="Arial,sans-serif" font-weight="700">${titles[
        kind % 4
      ]
        .split("\n")
        .map(
          (t, i) =>
            `<text x="42" y="${115 + i * 73}" font-size="65" letter-spacing="-3">${t}</text>`,
        )
        .join(
          "",
        )}<text x="42" y="395" font-size="13" letter-spacing="3">${safe.toUpperCase()}</text><text x="595" y="75" font-size="55">↗</text></g></svg>`,
    )
  );
}
