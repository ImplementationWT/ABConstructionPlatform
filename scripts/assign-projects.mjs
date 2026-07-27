import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });

const MONDAY_API_URL = "https://api.monday.com/v2";

const PROJECTS_QUERY = `
  query ($boardId: [ID!], $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: 100, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values(ids: ["project_status"]) {
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
          text
        }
      }
    }
  }
`;

async function mondayRequest(query, variables) {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function getMondayProjects() {
  const boardId = process.env.MONDAY_PROJECTS_BOARD_ID;
  const projects = [];

  const first = await mondayRequest(PROJECTS_QUERY, { boardId: [boardId], cursor: null });
  let page = first.boards[0]?.items_page;

  while (page) {
    for (const item of page.items) {
      projects.push({
        id: item.id,
        name: item.name,
        status: item.column_values[0]?.text ?? "",
      });
    }
    if (!page.cursor) break;
    const next = await mondayRequest(NEXT_ITEMS_QUERY, { cursor: page.cursor });
    page = next.next_items_page;
  }

  return projects;
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
    allowedProjectIds: [String],
  },
  { strict: false }
);

async function main() {
  const [, , command, ...args] = process.argv;

  if (command === "list") {
    const projects = await getMondayProjects();
    console.log(`${projects.length} projects found:\n`);
    for (const p of projects) {
      console.log(`${p.id}  ${p.name}  [${p.status}]`);
    }
    return;
  }

  if (command === "assign") {
    const [email, idsArg] = args;
    if (!email || !idsArg) {
      console.error(
        "Usage: node scripts/assign-projects.mjs assign <email> <projectId1,projectId2,...>"
      );
      process.exit(1);
    }

    const projectIds = idsArg.split(",").map((id) => id.trim());

    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { allowedProjectIds: projectIds } },
      { new: true }
    );

    if (!user) {
      console.error(`No user found with email ${email}`);
      process.exit(1);
    }

    console.log(`Updated ${user.email}. Allowed projects: ${user.allowedProjectIds.join(", ")}`);
    await mongoose.disconnect();
    return;
  }

  console.error(
    "Usage:\n  node scripts/assign-projects.mjs list\n  node scripts/assign-projects.mjs assign <email> <projectId1,projectId2,...>"
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
