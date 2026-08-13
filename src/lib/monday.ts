const MONDAY_API_URL = "https://api.monday.com/v2";

export interface MondayProject {
  id: string;
  name: string;
  status: string;
}

interface MondayItemsPage {
  cursor: string | null;
  items: {
    id: string;
    name: string;
    column_values: { id: string; text: string | null }[];
  }[];
}

const PROJECTS_QUERY = `
  query ($boardId: [ID!], $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: 100, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values(ids: ["project_status"]) {
            id
            text
          }
        }
      }
    }
  }
`;

const NEXT_ITEMS_QUERY = `
  query ($cursor: String!) {
    next_items_page(limit: 100, cursor: $cursor) {
      cursor
      items {
        id
        name
        column_values(ids: ["project_status"]) {
          id
          text
        }
      }
    }
  }
`;

function getMondayToken(): string {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    throw new Error("Missing MONDAY_API_TOKEN environment variable");
  }
  return token;
}

async function mondayRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = getMondayToken();

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(`Monday API error: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

// "Master Daily Reports" board and its "Subitems of Master Daily Reports" board.
const DAILY_REPORT_COLUMNS = {
  relatedProject: "board_relation_mkxatv9w",
  reportedDate: "date4",
  weatherCondition: "dropdown__1",
  otherIssues: "long_text__1",
  mongoId: "text_mm5fdgd1",
  reportedBy: "people__1",
};

const USER_BY_EMAIL_QUERY = `
  query ($emails: [String!]) {
    users(emails: $emails) {
      id
    }
  }
`;

async function getMondayUserIdByEmail(email: string): Promise<string | null> {
  const data = await mondayRequest<{ users: { id: string }[] }>(USER_BY_EMAIL_QUERY, {
    emails: [email],
  });

  return data.users[0]?.id ?? null;
}

const TRADE_SUBITEM_COLUMNS = {
  trade: "dropdown_mkxapk5b",
  manpower: "numeric_mkxatdzs",
  progress: "long_text_mkxacp18",
  issues: "long_text_mkxawa17",
  photos: "file_mkxa5kf",
};

export interface CreateDailyReportItemParams {
  projectId: string;
  projectName: string;
  reportedDate: string;
  weatherLabel: string;
  otherIssues: string;
  mongoId: string;
  reporterEmail: string;
}

export async function createDailyReportMondayItem(
  params: CreateDailyReportItemParams
): Promise<string> {
  const boardId = process.env.MONDAY_DAILY_REPORTS_BOARD_ID;
  if (!boardId) {
    throw new Error("Missing MONDAY_DAILY_REPORTS_BOARD_ID environment variable");
  }

  const reporterId = await getMondayUserIdByEmail(params.reporterEmail);

  const columnValues: Record<string, unknown> = {
    [DAILY_REPORT_COLUMNS.relatedProject]: { item_ids: [Number(params.projectId)] },
    [DAILY_REPORT_COLUMNS.reportedDate]: { date: params.reportedDate },
    [DAILY_REPORT_COLUMNS.weatherCondition]: { labels: [params.weatherLabel] },
    [DAILY_REPORT_COLUMNS.otherIssues]: params.otherIssues,
    [DAILY_REPORT_COLUMNS.mongoId]: params.mongoId,
  };

  if (reporterId) {
    columnValues[DAILY_REPORT_COLUMNS.reportedBy] = {
      personsAndTeams: [{ id: Number(reporterId), kind: "person" }],
    };
  }

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }
  `;

  const data = await mondayRequest<{ create_item: { id: string } }>(mutation, {
    boardId,
    itemName: `${params.reportedDate} - ${params.projectName}`,
    columnValues: JSON.stringify(columnValues),
  });

  return data.create_item.id;
}

export interface CreateTradeSubitemParams {
  parentItemId: string;
  tradeLabel: string;
  manpower: number;
  progress: string;
  issues: string;
}

export async function createTradeSubitem(params: CreateTradeSubitemParams): Promise<string> {
  const columnValues = {
    [TRADE_SUBITEM_COLUMNS.trade]: { labels: [params.tradeLabel] },
    [TRADE_SUBITEM_COLUMNS.manpower]: String(params.manpower),
    [TRADE_SUBITEM_COLUMNS.progress]: params.progress,
    [TRADE_SUBITEM_COLUMNS.issues]: params.issues,
  };

  const mutation = `
    mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_subitem(
        parent_item_id: $parentItemId
        item_name: $itemName
        column_values: $columnValues
      ) {
        id
      }
    }
  `;

  const data = await mondayRequest<{ create_subitem: { id: string } }>(mutation, {
    parentItemId: params.parentItemId,
    itemName: params.tradeLabel,
    columnValues: JSON.stringify(columnValues),
  });

  return data.create_subitem.id;
}

function dataUriToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid photo data URI");
  }
  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer], { type: mime });
}

async function uploadFileToMondayColumn(
  itemId: string,
  columnId: string,
  dataUri: string,
  filename: string
): Promise<void> {
  const token = getMondayToken();
  const blob = dataUriToBlob(dataUri);

  const mutation = `
    mutation ($file: File!) {
      add_file_to_column (file: $file, item_id: ${JSON.stringify(itemId)}, column_id: ${JSON.stringify(
        columnId
      )}) {
        id
      }
    }
  `;

  const form = new FormData();
  form.append("query", mutation);
  form.append("variables[file]", blob, filename);

  const response = await fetch("https://api.monday.com/v2/file", {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Monday file upload error: ${JSON.stringify(json.errors)}`);
  }
}

export async function uploadPhotoToSubitem(
  subitemId: string,
  dataUri: string,
  filename: string
): Promise<void> {
  return uploadFileToMondayColumn(subitemId, TRADE_SUBITEM_COLUMNS.photos, dataUri, filename);
}

// "QC Inspection Request" board.
const INSPECTION_REQUEST_COLUMNS = {
  status: "status",
  project: "dropdown_mm1291d2",
  trade: "dropdown_mm1262n2",
  timeline: "timerange_mm12zqrs",
  details: "text_mm127c3e",
  requestedBy: "multiple_person_mm1278m4",
  mongoId: "text_mm5jec81",
};

export interface CreateInspectionRequestParams {
  projectName: string;
  trades: string[];
  startDate: string;
  endDate: string;
  details: string;
  reporterEmail: string;
  mongoId: string;
}

export async function createInspectionRequestMondayItem(
  params: CreateInspectionRequestParams
): Promise<string> {
  const boardId = process.env.MONDAY_INSPECTION_REQUESTS_BOARD_ID;
  if (!boardId) {
    throw new Error("Missing MONDAY_INSPECTION_REQUESTS_BOARD_ID environment variable");
  }

  const reporterId = await getMondayUserIdByEmail(params.reporterEmail);

  const columnValues: Record<string, unknown> = {
    [INSPECTION_REQUEST_COLUMNS.status]: { label: "New Inspection" },
    [INSPECTION_REQUEST_COLUMNS.project]: { labels: [params.projectName] },
    [INSPECTION_REQUEST_COLUMNS.trade]: { labels: params.trades },
    [INSPECTION_REQUEST_COLUMNS.timeline]: { from: params.startDate, to: params.endDate },
    [INSPECTION_REQUEST_COLUMNS.details]: params.details,
    [INSPECTION_REQUEST_COLUMNS.mongoId]: params.mongoId,
  };

  if (reporterId) {
    columnValues[INSPECTION_REQUEST_COLUMNS.requestedBy] = {
      personsAndTeams: [{ id: Number(reporterId), kind: "person" }],
    };
  }

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

  const today = new Date();
  const requestDate = [
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
    today.getFullYear(),
  ].join("-");

  const data = await mondayRequest<{ create_item: { id: string } }>(mutation, {
    boardId,
    itemName: `${params.projectName} | ${requestDate}`,
    columnValues: JSON.stringify(columnValues),
  });

  return data.create_item.id;
}

// "RFI Request" board (id 18425892290).
const RFI_REQUEST_COLUMNS = {
  status: "status",
  creationDate: "date4",
  project: "board_relation_mm63dnp0",
  trade: "dropdown_mm631paq",
  subject: "text_mm632e3p",
  question: "text_mm63xcaf",
  attachments: "file_mm631kks",
  requestedBy: "person",
  assignedPerson: "multiple_person_mm63csvy",
  mongoId: "text_mm63wr6e",
};

export interface CreateRfiRequestParams {
  projectId: string;
  projectName: string;
  subject: string;
  question: string;
  trades: string[];
  reporterEmail: string;
  mongoId: string;
  assignedPersonId?: string;
}

async function changeMondayColumnValue(
  boardId: string,
  itemId: string,
  columnId: string,
  value: unknown
): Promise<void> {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
        id
      }
    }
  `;

  await mondayRequest(mutation, {
    boardId,
    itemId,
    columnId,
    value: JSON.stringify(value),
  });
}

export async function createRfiRequestMondayItem(
  params: CreateRfiRequestParams
): Promise<string> {
  const boardId = process.env.MONDAY_RFI_REQUESTS_BOARD_ID;
  if (!boardId) {
    throw new Error("Missing MONDAY_RFI_REQUESTS_BOARD_ID environment variable");
  }

  const reporterId = await getMondayUserIdByEmail(params.reporterEmail);

  const today = new Date().toISOString().slice(0, 10);

  // The "Project Name" column is a board_relation (connect-boards) column: Monday
  // does not reliably apply that type via create_item's column_values, so it is
  // set with a follow-up change_column_value call below.
  const columnValues: Record<string, unknown> = {
    [RFI_REQUEST_COLUMNS.status]: { label: "New Request" },
    [RFI_REQUEST_COLUMNS.creationDate]: { date: today },
    [RFI_REQUEST_COLUMNS.trade]: { labels: params.trades },
    [RFI_REQUEST_COLUMNS.subject]: params.subject,
    [RFI_REQUEST_COLUMNS.question]: params.question,
    [RFI_REQUEST_COLUMNS.mongoId]: params.mongoId,
  };

  if (reporterId) {
    columnValues[RFI_REQUEST_COLUMNS.requestedBy] = {
      personsAndTeams: [{ id: Number(reporterId), kind: "person" }],
    };
  }

  if (params.assignedPersonId) {
    columnValues[RFI_REQUEST_COLUMNS.assignedPerson] = {
      personsAndTeams: [{ id: Number(params.assignedPersonId), kind: "person" }],
    };
  }

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

  const data = await mondayRequest<{ create_item: { id: string } }>(mutation, {
    boardId,
    itemName: `${params.projectName} | ${params.subject}`,
    columnValues: JSON.stringify(columnValues),
  });

  const itemId = data.create_item.id;

  await changeMondayColumnValue(boardId, itemId, RFI_REQUEST_COLUMNS.project, {
    item_ids: [Number(params.projectId)],
  });

  return itemId;
}

export async function uploadRfiAttachment(
  itemId: string,
  dataUri: string,
  filename: string
): Promise<void> {
  return uploadFileToMondayColumn(itemId, RFI_REQUEST_COLUMNS.attachments, dataUri, filename);
}

export interface MondayUpdate {
  id: string;
  textBody: string;
  createdAt: string;
  creatorName: string | null;
}

const ITEM_UPDATES_QUERY = `
  query ($itemId: [ID!]) {
    items(ids: $itemId) {
      updates(limit: 100) {
        id
        text_body
        created_at
        creator {
          name
        }
      }
    }
  }
`;

export async function getRfiRequestUpdates(itemId: string): Promise<MondayUpdate[]> {
  const data = await mondayRequest<{
    items: {
      updates: {
        id: string;
        text_body: string | null;
        created_at: string;
        creator: { name: string } | null;
      }[];
    }[];
  }>(ITEM_UPDATES_QUERY, { itemId: [itemId] });

  const updates = data.items[0]?.updates ?? [];

  return updates
    .map((update) => ({
      id: update.id,
      textBody: update.text_body ?? "",
      createdAt: update.created_at,
      creatorName: update.creator?.name ?? null,
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export interface MondayAccountUser {
  id: string;
  name: string;
  email: string;
}

const ACCOUNT_USERS_QUERY = `
  query {
    users {
      id
      name
      email
      enabled
    }
  }
`;

export async function getMondayAccountUsers(): Promise<MondayAccountUser[]> {
  const data = await mondayRequest<{
    users: { id: string; name: string; email: string; enabled: boolean }[];
  }>(ACCOUNT_USERS_QUERY, {});

  return data.users
    .filter((user) => user.enabled)
    .map((user) => ({ id: user.id, name: user.name, email: user.email }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMondayProjects(): Promise<MondayProject[]> {
  const boardId = process.env.MONDAY_PROJECTS_BOARD_ID;
  if (!boardId) {
    throw new Error("Missing MONDAY_PROJECTS_BOARD_ID environment variable");
  }

  const projects: MondayProject[] = [];

  const first = await mondayRequest<{ boards: { items_page: MondayItemsPage }[] }>(
    PROJECTS_QUERY,
    { boardId: [boardId], cursor: null }
  );

  let page = first.boards[0]?.items_page;

  while (page) {
    for (const item of page.items) {
      projects.push({
        id: item.id,
        name: item.name,
        status: item.column_values.find((c) => c.id === "project_status")?.text ?? "",
      });
    }

    if (!page.cursor) break;

    const next = await mondayRequest<{ next_items_page: MondayItemsPage }>(NEXT_ITEMS_QUERY, {
      cursor: page.cursor,
    });
    page = next.next_items_page;
  }

  return projects.filter((project) => project.status.toLowerCase() !== "completed");
}
