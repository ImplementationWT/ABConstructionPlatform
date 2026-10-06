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

const ITEM_BOARD_QUERY = `
  query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      board {
        id
      }
    }
  }
`;

// Subitems live on their own auto-generated board, whose id isn't in our env,
// so look it up from the item itself.
async function getItemBoardId(itemId: string): Promise<string> {
  const data = await mondayRequest<{ items: { board: { id: string } }[] }>(ITEM_BOARD_QUERY, {
    itemIds: [itemId],
  });

  const boardId = data.items[0]?.board.id;
  if (!boardId) {
    throw new Error(`Monday item ${itemId} not found`);
  }
  return boardId;
}

async function changeMondayColumnValues(
  itemId: string,
  columnValues: Record<string, unknown>
): Promise<void> {
  const boardId = await getItemBoardId(itemId);

  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }
  `;

  await mondayRequest(mutation, {
    boardId,
    itemId,
    columnValues: JSON.stringify(columnValues),
  });
}

export async function updateDailyReportMondayItem(
  itemId: string,
  params: { otherIssues: string }
): Promise<void> {
  await changeMondayColumnValues(itemId, {
    [DAILY_REPORT_COLUMNS.otherIssues]: params.otherIssues,
  });
}

export async function updateTradeSubitem(
  subitemId: string,
  params: { progress: string; issues: string }
): Promise<void> {
  await changeMondayColumnValues(subitemId, {
    [TRADE_SUBITEM_COLUMNS.progress]: params.progress,
    [TRADE_SUBITEM_COLUMNS.issues]: params.issues,
  });
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
  assignedPersonIds?: string[];
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

  if (params.assignedPersonIds && params.assignedPersonIds.length > 0) {
    columnValues[RFI_REQUEST_COLUMNS.assignedPerson] = {
      personsAndTeams: params.assignedPersonIds.map((id) => ({
        id: Number(id),
        kind: "person",
      })),
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

  const nameDate = [
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
    new Date().getFullYear(),
  ].join("-");

  const data = await mondayRequest<{ create_item: { id: string } }>(mutation, {
    boardId,
    itemName: `${params.subject} - ${params.projectName} - ${nameDate}`,
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

export interface MondayUpdateAsset {
  id: string;
  name: string;
  url: string;
  fileExtension: string | null;
}

export interface MondayUpdate {
  id: string;
  textBody: string;
  createdAt: string;
  creatorName: string | null;
  assets: MondayUpdateAsset[];
}

const ITEM_UPDATES_QUERY = `
  query ($itemId: [ID!]) {
    items(ids: $itemId) {
      column_values(ids: ["status"]) {
        text
      }
      updates(limit: 100) {
        id
        body
        created_at
        creator {
          name
        }
        assets {
          id
          name
          public_url
          file_extension
        }
      }
    }
  }
`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

// Monday's API can only post updates as the account that owns MONDAY_API_TOKEN,
// so replies sent from this app can't carry the actual app user's identity.
// We tag the raw HTML body with the real author's name and strip it back out
// on read, so the chat UI can show the true sender instead of the token's owner.
const APP_REPLY_PREFIX = /^<b>(.+?)<\/b> \(via Construction Platform\):<br\s*\/?>([\s\S]*)$/i;

function parseUpdateAuthorship(body: string, creatorName: string | null) {
  const match = body.match(APP_REPLY_PREFIX);
  if (match) {
    return { textBody: htmlToPlainText(match[2]), creatorName: htmlToPlainText(match[1]) };
  }
  return { textBody: htmlToPlainText(body), creatorName };
}

export interface RfiRequestThread {
  updates: MondayUpdate[];
  status: string | null;
}

export async function getRfiRequestUpdates(itemId: string): Promise<RfiRequestThread> {
  const data = await mondayRequest<{
    items: {
      column_values: { text: string | null }[];
      updates: {
        id: string;
        body: string | null;
        created_at: string;
        creator: { name: string } | null;
        assets: {
          id: string;
          name: string;
          public_url: string;
          file_extension: string | null;
        }[];
      }[];
    }[];
  }>(ITEM_UPDATES_QUERY, { itemId: [itemId] });

  const item = data.items[0];
  const updates = item?.updates ?? [];

  const sortedUpdates = updates
    .map((update) => {
      const { textBody, creatorName } = parseUpdateAuthorship(
        update.body ?? "",
        update.creator?.name ?? null
      );

      return {
        id: update.id,
        textBody,
        createdAt: update.created_at,
        creatorName,
        assets: (update.assets ?? []).map((asset) => ({
          id: asset.id,
          name: asset.name,
          url: asset.public_url,
          fileExtension: asset.file_extension,
        })),
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return {
    updates: sortedUpdates,
    status: item?.column_values[0]?.text ?? null,
  };
}

const ITEM_STATUSES_QUERY = `
  query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      column_values(ids: ["status"]) {
        text
      }
    }
  }
`;

export async function getRfiRequestStatuses(
  itemIds: string[]
): Promise<Record<string, string>> {
  if (itemIds.length === 0) return {};

  const statuses: Record<string, string> = {};

  // Keep each batch well under Monday's per-request complexity budget.
  const BATCH_SIZE = 25;
  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE);

    const data = await mondayRequest<{
      items: { id: string; column_values: { text: string | null }[] }[];
    }>(ITEM_STATUSES_QUERY, { itemIds: batch });

    for (const item of data.items) {
      const text = item.column_values[0]?.text;
      if (text) statuses[item.id] = text;
    }
  }

  return statuses;
}

export async function setRfiRequestStatus(itemId: string, label: string): Promise<void> {
  const boardId = process.env.MONDAY_RFI_REQUESTS_BOARD_ID;
  if (!boardId) {
    throw new Error("Missing MONDAY_RFI_REQUESTS_BOARD_ID environment variable");
  }

  await changeMondayColumnValue(boardId, itemId, RFI_REQUEST_COLUMNS.status, { label });
}

const CREATE_UPDATE_MUTATION = `
  mutation ($itemId: ID!, $body: String!) {
    create_update(item_id: $itemId, body: $body) {
      id
      created_at
    }
  }
`;

async function uploadFileToMondayUpdate(
  updateId: string,
  dataUri: string,
  filename: string
): Promise<MondayUpdateAsset> {
  const token = getMondayToken();
  const blob = dataUriToBlob(dataUri);

  const mutation = `
    mutation ($file: File!) {
      add_file_to_update (file: $file, update_id: ${JSON.stringify(updateId)}) {
        id
        name
        public_url
        file_extension
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

  const asset = json.data.add_file_to_update;
  return {
    id: asset.id,
    name: asset.name,
    url: asset.public_url,
    fileExtension: asset.file_extension,
  };
}

export async function createRfiRequestUpdate(
  itemId: string,
  authorName: string,
  message: string,
  attachments: { url: string; name: string }[] = []
): Promise<MondayUpdate> {
  const trimmedMessage = message.trim();
  const messageHtml =
    trimmedMessage.length > 0
      ? escapeHtml(trimmedMessage).replace(/\n/g, "<br>")
      : "Sent an attachment";
  const body = `<b>${escapeHtml(authorName)}</b> (via Construction Platform):<br>${messageHtml}`;

  const data = await mondayRequest<{
    create_update: { id: string; created_at: string };
  }>(CREATE_UPDATE_MUTATION, { itemId, body });

  const updateId = data.create_update.id;

  const assets: MondayUpdateAsset[] = [];
  for (const attachment of attachments) {
    assets.push(await uploadFileToMondayUpdate(updateId, attachment.url, attachment.name));
  }

  return {
    id: updateId,
    textBody: trimmedMessage,
    createdAt: data.create_update.created_at,
    creatorName: authorName,
    assets,
  };
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
