import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { DailyReport } from "@/models/DailyReport";
import { dailyReportSchema, WEATHER_LABELS } from "@/lib/validation/daily-report";
import type { WeatherCondition } from "@/models/DailyReport";
import { getProjectAccessFilter, userCanAccessProject } from "@/lib/get-project-filter";
import {
  createDailyReportMondayItem,
  createTradeSubitem,
  uploadPhotoToSubitem,
} from "@/lib/monday";
import { uploadPhotoToS3 } from "@/lib/s3";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const filter = await getProjectAccessFilter(session.user.id);

  const reports = await DailyReport.find(filter)
    .sort({ reportedDate: -1, createdAt: -1 })
    .limit(200)
    .populate("createdBy", "name email")
    .lean();

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = dailyReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(await userCanAccessProject(session.user.id, parsed.data.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  // Keep the original (base64) photos around for the Monday file upload below,
  // and persist the report in MongoDB with public S3 URLs instead of base64.
  const originalTrades = parsed.data.trades;

  let tradesWithS3Photos;
  try {
    tradesWithS3Photos = await Promise.all(
      originalTrades.map(async (trade) => ({
        ...trade,
        photos: await Promise.all(
          trade.photos.map(async (photo) => ({
            url: await uploadPhotoToS3(photo.url, photo.name),
            name: photo.name,
          }))
        ),
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to upload photos. Please try again." },
      { status: 502 }
    );
  }

  const report = await DailyReport.create({
    ...parsed.data,
    trades: tradesWithS3Photos,
    reportedDate: new Date(parsed.data.reportedDate),
    createdBy: session.user.id,
  });

  try {
    const mondayItemId = await createDailyReportMondayItem({
      projectId: report.projectId,
      projectName: report.projectName,
      reportedDate: parsed.data.reportedDate,
      weatherLabel: WEATHER_LABELS[report.weatherCondition as WeatherCondition],
      otherIssues: report.otherIssues,
      mongoId: report._id.toString(),
      reporterEmail: session.user.email ?? "",
    });

    for (let i = 0; i < report.trades.length; i++) {
      const trade = report.trades[i];

      const subitemId = await createTradeSubitem({
        parentItemId: mondayItemId,
        tradeLabel: trade.tradeName,
        manpower: trade.manpower,
        progress: trade.progress,
        issues: trade.issues,
      });

      trade.mondaySubitemId = subitemId;

      for (const photo of originalTrades[i].photos) {
        await uploadPhotoToSubitem(subitemId, photo.url, photo.name);
      }
    }

    report.mondayItemId = mondayItemId;
    report.status = "synced";
    await report.save();
  } catch (error) {
    report.status = "sync_failed";
    report.syncError = error instanceof Error ? error.message : "Unknown sync error";
    await report.save();
  }

  return NextResponse.json({ report }, { status: 201 });
}
