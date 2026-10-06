import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { DailyReport } from "@/models/DailyReport";
import { userCanAccessProject } from "@/lib/get-project-filter";
import { dailyReportEditSchema } from "@/lib/validation/daily-report";
import {
  updateDailyReportMondayItem,
  updateTradeSubitem,
  uploadPhotoToSubitem,
} from "@/lib/monday";
import { uploadPhotoToS3 } from "@/lib/s3";

const MAX_PHOTOS_PER_TRADE = 8;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectToDatabase();

  const report = await DailyReport.findById(id)
    .populate("createdBy", "name email")
    .lean();

  if (!report || !(await userCanAccessProject(session.user.id, report.projectId))) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = dailyReportEditSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const report = await DailyReport.findById(id);

  if (!report || !(await userCanAccessProject(session.user.id, report.projectId))) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const edits = parsed.data.trades;

  if (edits.length !== report.trades.length) {
    return NextResponse.json(
      { error: "Trades don't match the saved report" },
      { status: 400 }
    );
  }

  if (
    edits.some(
      (edit, i) => report.trades[i].photos.length + edit.newPhotos.length > MAX_PHOTOS_PER_TRADE
    )
  ) {
    return NextResponse.json(
      { error: `You can attach up to ${MAX_PHOTOS_PER_TRADE} photos per trade` },
      { status: 400 }
    );
  }

  let newS3Photos;
  try {
    newS3Photos = await Promise.all(
      edits.map((edit) =>
        Promise.all(
          edit.newPhotos.map(async (photo) => ({
            url: await uploadPhotoToS3(photo.url, photo.name),
            name: photo.name,
          }))
        )
      )
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to upload photos. Please try again." },
      { status: 502 }
    );
  }

  report.otherIssues = parsed.data.otherIssues;
  edits.forEach((edit, i) => {
    const trade = report.trades[i];
    trade.progress = edit.progress;
    trade.issues = edit.issues;
    trade.photos.push(...newS3Photos[i]);
  });
  report.markModified("trades");
  await report.save();

  // Only push the edit to Monday if the report already made it there; a report
  // whose original sync failed has no item/subitems to update.
  if (report.mondayItemId) {
    try {
      await updateDailyReportMondayItem(report.mondayItemId, {
        otherIssues: report.otherIssues,
      });

      for (let i = 0; i < report.trades.length; i++) {
        const trade = report.trades[i];
        if (!trade.mondaySubitemId) continue;

        await updateTradeSubitem(trade.mondaySubitemId, {
          progress: trade.progress,
          issues: trade.issues,
        });

        for (const photo of edits[i].newPhotos) {
          await uploadPhotoToSubitem(trade.mondaySubitemId, photo.url, photo.name);
        }
      }

      report.status = "synced";
      report.syncError = undefined;
    } catch (error) {
      report.status = "sync_failed";
      report.syncError = error instanceof Error ? error.message : "Unknown sync error";
    }
    await report.save();
  }

  return NextResponse.json({ report });
}
