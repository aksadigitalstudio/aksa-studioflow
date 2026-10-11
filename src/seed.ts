import { CONFIG, uid, now, today, artwork } from "./config.ts";
import type { Data, Client, Project, Task, Invoice } from "./types";
export function seed(): Data {
  const stamp = now(),
    day = today();
  const shift = (n: number) => {
    const d = new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const owner = uid(),
    admin = uid(),
    designer = uid(),
    developer = uid();
  const people = [
    { id: owner, name: "Mira Santoso", initials: "MS", role: "OWNER" as const },
    { id: admin, name: "Arif Pratama", initials: "AP", role: "ADMIN" as const },
    {
      id: designer,
      name: "Nadia Putri",
      initials: "NP",
      role: "TEAM MEMBER" as const,
    },
    {
      id: developer,
      name: "Dimas Wardana",
      initials: "DW",
      role: "TEAM MEMBER" as const,
    },
  ];
  const clients: Client[] = [
    "Olive & Co.",
    "Aster Living",
    "Northstar Coffee",
    "Monochrome Lab",
  ].map((name, i) => ({
    id: uid(),
    name,
    contact: ["Clara Tan", "Raka Aditya", "Sofia Rahman", "Evan Lee"][i],
    email: [
      "clara@olive.example",
      "raka@aster.example",
      "sofia@northstar.example",
      "evan@monochrome.example",
    ][i],
    phone: `+62 812 5550 00${i + 1}0`,
    companyInfo: [
      "Conscious botanical skincare",
      "Considered spaces for everyday living",
      "Independent specialty coffee roaster",
      "Creative technology and lifestyle",
    ][i],
    notes: "Sample client · relationship notes are internal.",
    archived: false,
    token: uid(),
    createdAt: stamp,
  }));
  const names = [
    "A new identity, rooted in nature",
    "The art of living well",
    "A warmer kind of daily ritual",
    "An AI-powered brand story",
    "Digital presence, reimagined",
    "A season of new perspectives",
  ];
  const projects: Project[] = names.map((name, i) => ({
    id: uid(),
    name,
    clientId: clients[i % 4].id,
    description: [
      "A thoughtful identity system for a new chapter. Strategy, visual language and guidelines.",
      "A campaign that makes the everyday feel exceptional.",
      "A considered social content system, from first sip to last scroll.",
      "AI-assisted films and imagery, made with a distinct human point of view.",
      "A responsive website built around clarity and conversion.",
      "Campaign concepts and launch assets for the season ahead.",
    ][i],
    type: CONFIG.agency.services[i % 5],
    start: shift(-22 + i * 2),
    deadline: shift([8, 3, -2, 15, 22, 30][i]),
    status: CONFIG.workflow[[2, 3, 2, 1, 0, 4][i]],
    priority: ["High", "High", "Urgent", "Medium", "Low", "Medium"][i],
    budget: [18000000, 24000000, 12000000, 15000000, 32000000, 9000000][i],
    billing: i === 4 ? "Hourly" : "Fixed fee",
    hourlyRate: CONFIG.billing.hourlyRate,
    members: [owner, admin, i === 4 ? developer : designer],
    notes: "Demo project · internal production details stay in this workspace.",
    art: i % 4,
    createdAt: stamp,
  }));
  const taskTitles = [
    [
      "Brand discovery workshop",
      "Explore logo directions",
      "Build the typography system",
      "Prepare brand guidelines",
    ],
    [
      "Campaign moodboard",
      "Art-direct the hero images",
      "Client presentation deck",
      "Export the launch assets",
    ],
    [
      "Plan the content calendar",
      "Design the carousel templates",
      "Edit the product reels",
      "Schedule the first content batch",
    ],
    [
      "Creative concept & script",
      "Generate visual explorations",
      "Edit the first AI film",
      "Prepare review presentation",
    ],
    [
      "Content architecture",
      "Responsive homepage",
      "CMS integration",
      "Accessibility and QA",
    ],
    [
      "Launch strategy",
      "Build the creative toolkit",
      "Final campaign approval",
      "Deliver the asset library",
    ],
  ];
  const tasks: Task[] = projects.flatMap((p, i) =>
    taskTitles[i].map((title, j) => ({
      id: uid(),
      title,
      projectId: p.id,
      assignee: p.members[2],
      priority: j === 1 ? "High" : p.priority,
      deadline: shift([-4, 2, 5, 9][j] + i * 2),
      description:
        "Explore the brief, document decisions, and prepare a considered outcome.",
      checklist: [
        { id: uid(), text: "Review the brief and references", done: j === 0 },
        { id: uid(), text: "Prepare the production-ready file", done: false },
      ],
      attachments: [],
      estimatedHours: 4 + j * 2,
      status: CONFIG.workflow[i === 5 ? 4 : [4, 2, 1, 0][(i + j) % 4]],
      createdAt: stamp,
    })),
  );
  const deliverables = projects
    .slice(0, 4)
    .map((p, i) => ({
      id: uid(),
      projectId: p.id,
      title: [
        "Visual identity concepts",
        "Campaign art direction",
        "Social content system",
        "AI advertising concept",
      ][i],
      kind: "Design",
      createdAt: stamp,
    }));
  const versions = deliverables.map((dl, i) => ({
    id: uid(),
    deliverableId: dl.id,
    label: "V1",
    file: {
      id: uid(),
      name: "creative-preview.svg",
      type: "image/svg+xml",
      size: 4200,
      url: artwork(clients[i].name, i),
    },
    url: "",
    status: [
      "Internal Review",
      "Client Review",
      "Revision Requested",
      "Approved",
    ][i] as any,
    submittedAt: i ? stamp : null,
    reviewDeadline: shift(i === 1 ? 2 : 7),
    createdAt: stamp,
  }));
  // Built-in SVG artwork is generated by the application; user SVG uploads are not accepted.
  const finalDl = {
    id: uid(),
    projectId: projects[5].id,
    title: "Seasonal campaign toolkit",
    kind: "Design",
    createdAt: stamp,
  };
  deliverables.push(finalDl);
  const finalVersion = {
    id: uid(),
    deliverableId: finalDl.id,
    label: "FINAL",
    file: {
      id: uid(),
      name: "campaign-toolkit.svg",
      type: "image/svg+xml",
      size: 4000,
      url: artwork(clients[1].name, 1),
    },
    url: "",
    status: "Approved" as any,
    submittedAt: stamp,
    reviewDeadline: shift(-1),
    createdAt: stamp,
  };
  versions.push(finalVersion);
  const timeEntries = tasks
    .slice(0, 15)
    .map((t, i) => ({
      id: uid(),
      projectId: t.projectId,
      taskId: t.id,
      userId: t.assignee,
      date: shift(-i % 8),
      seconds: ((i % 3) + 1) * 5400,
      note: [
        "Creative exploration",
        "Production and refinement",
        "Review preparation",
      ][i % 3],
      billable: i % 4 !== 0,
      approved: i % 3 !== 0,
      createdAt: stamp,
    }));
  const settings = {
    agencyName: CONFIG.agency.name,
    agencyDescription: CONFIG.agency.description,
    email: CONFIG.agency.email,
    address: CONFIG.agency.address,
    currency: CONFIG.billing.currency,
    taxRate: CONFIG.billing.taxRate,
    hourlyRate: CONFIG.billing.hourlyRate,
    paymentInstructions: CONFIG.billing.paymentInstructions,
    workflow: [...CONFIG.workflow],
  };
  const invoices: Invoice[] = projects
    .slice(0, 4)
    .map((p, i) => ({
      id: uid(),
      token: uid(),
      number: `INV-${day.slice(0, 4)}-${String(i + 1).padStart(4, "0")}`,
      clientId: p.clientId,
      projectId: p.id,
      issue: shift(-12),
      due: shift(i === 2 ? -3 : 14),
      items: [
        {
          id: uid(),
          description: [
            "Brand strategy & identity — first milestone",
            "Campaign creative production",
            "Monthly social content retainer",
            "AI advertising concept development",
          ][i],
          quantity: 1,
          rate: p.budget / 2,
        },
      ],
      discount: 0,
      taxRate: settings.taxRate,
      status: i === 3 ? "DRAFT" : "SENT",
      notes: "Sample invoice for demonstration only.",
      timeIds: [],
      createdAt: stamp,
      agency: {
        name: settings.agencyName,
        email: settings.email,
        address: settings.address,
        paymentInstructions: settings.paymentInstructions,
      },
      currency: settings.currency,
    }));
  const payments = [
    {
      id: uid(),
      invoiceId: invoices[0].id,
      amount: invoices[0].items[0].rate,
      date: shift(-4),
      method: "Bank Transfer",
      reference: "DEMO-TRANSFER-001",
      createdAt: stamp,
    },
    {
      id: uid(),
      invoiceId: invoices[1].id,
      amount: 3000000,
      date: shift(-2),
      method: "Bank Transfer",
      reference: "DEMO-TRANSFER-002",
      createdAt: stamp,
    },
  ];
  const approvals = versions
    .filter((v) => v.submittedAt)
    .flatMap((v) => {
      const dl = deliverables.find((d) => d.id === v.deliverableId)!,
        p = projects.find((p) => p.id === dl.projectId)!,
        c = clients.find((c) => c.id === p.clientId)!;
      const records = [
        {
          id: uid(),
          versionId: v.id,
          projectId: p.id,
          clientId: c.id,
          action: "Submitted for Review",
          feedback: "",
          actor: people[0].name,
          createdAt: stamp,
        },
      ];
      if (v.status === "Revision Requested")
        records.push({
          ...records[0],
          id: uid(),
          action: "Revision Requested",
          feedback:
            "Please bring more warmth to the palette and simplify the opening frame.",
          actor: c.contact,
        });
      if (v.status === "Approved")
        records.push({
          ...records[0],
          id: uid(),
          action: "Approved",
          actor: c.contact,
        });
      return records;
    });
  return {
    settings,
    people,
    clients,
    projects,
    tasks,
    timeEntries,
    timers: [],
    deliverables,
    versions,
    comments: [
      {
        id: uid(),
        projectId: projects[0].id,
        deliverableId: deliverables[0].id,
        taskId: "",
        visibility: "Internal",
        text: "Explore a quieter palette before the client presentation.",
        author: people[0].name,
        createdAt: stamp,
      },
      {
        id: uid(),
        projectId: projects[1].id,
        deliverableId: deliverables[1].id,
        taskId: "",
        visibility: "Client-visible",
        text: "The new art direction is ready for your thoughts. Looking forward to your feedback.",
        author: people[1].name,
        createdAt: stamp,
      },
    ],
    approvals,
    invoices,
    payments,
    activity: projects.map((p, i) => ({
      id: uid(),
      projectId: p.id,
      message: [
        "Identity exploration started",
        "Campaign sent for client review",
        "Client requested a warmer visual direction",
        "Creative brief approved",
        "Website project added to backlog",
        "Final campaign toolkit approved",
      ][i],
      actor: people[i % 2].name,
      createdAt: stamp,
    })),
    dismissed: [],
    revision: 0,
  };
}
