import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import HealthEvent from "@/models/HealthEvent";
import { getAuthUserId } from "@/lib/jwtHelper";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health-timeline
// Retrieve chronological health events for the authenticated user
// Supports filters: type, source, startDate, endDate
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type");
    const sourceFilter = url.searchParams.get("source");
    const startDateFilter = url.searchParams.get("startDate");
    const endDateFilter = url.searchParams.get("endDate");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

    // Strict User Isolation & Deleted Record Exclusion
    const queryFilter: any = {
      userId: authenticatedUserId,
      isDeleted: false,
    };

    if (typeFilter) {
      queryFilter.type = typeFilter;
    }

    if (sourceFilter) {
      queryFilter.source = sourceFilter;
    }

    if (startDateFilter || endDateFilter) {
      queryFilter.createdAt = {};
      if (startDateFilter) queryFilter.createdAt.$gte = new Date(startDateFilter);
      if (endDateFilter) queryFilter.createdAt.$lte = new Date(endDateFilter);
    }

    const events = await HealthEvent.find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(
      {
        success: true,
        count: events.length,
        events,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HealthTimeline API GET] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/health-timeline
// Create a new health timeline event for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { type, symptom, value, severity, startDate, endDate, status, notes, source, reportId } = body;

    if (!type) {
      return NextResponse.json({ message: "Event type is required" }, { status: 400 });
    }

    // Default source is USER_REPORTED unless specified
    const validSource = ["USER_REPORTED", "REPORT_EXTRACTED", "USER_CONFIRMED", "SYSTEM_DERIVED"].includes(source)
      ? source
      : "USER_REPORTED";

    const newEvent = await HealthEvent.create({
      userId: authenticatedUserId, // Strict ownership assignment
      type,
      symptom: symptom || "",
      value: value || "",
      severity: severity || "",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      status: status || "active",
      notes: notes || "",
      source: validSource,
      reportId: reportId || null,
      isDeleted: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Health event recorded successfully",
        event: newEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[HealthTimeline API POST] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/health-timeline
// Update an existing health event owned by the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { id, symptom, value, severity, startDate, endDate, status, notes, source } = body;

    if (!id) {
      return NextResponse.json({ message: "Event ID is required" }, { status: 400 });
    }

    // Strict User Scoping: only update if owned by authenticatedUserId
    const existingEvent = await HealthEvent.findOne({
      _id: id,
      userId: authenticatedUserId,
      isDeleted: false,
    });

    if (!existingEvent) {
      return NextResponse.json(
        { message: "Event not found or not owned by user" },
        { status: 404 }
      );
    }

    if (symptom !== undefined) existingEvent.symptom = symptom;
    if (value !== undefined) existingEvent.value = value;
    if (severity !== undefined) existingEvent.severity = severity;
    if (startDate !== undefined) existingEvent.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) existingEvent.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) existingEvent.status = status;
    if (notes !== undefined) existingEvent.notes = notes;
    if (source !== undefined) existingEvent.source = source;

    await existingEvent.save();

    return NextResponse.json(
      {
        success: true,
        message: "Health event updated successfully",
        event: existingEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HealthTimeline API PUT] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/health-timeline
// Soft delete an existing health event (isDeleted = true)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    let eventId = url.searchParams.get("id");

    if (!eventId) {
      try {
        const body = await request.json();
        eventId = body.id;
      } catch {
        // body json absent
      }
    }

    if (!eventId) {
      return NextResponse.json({ message: "Event ID is required" }, { status: 400 });
    }

    // Soft delete with strict user isolation
    const event = await HealthEvent.findOneAndUpdate(
      {
        _id: eventId,
        userId: authenticatedUserId,
      },
      {
        $set: { isDeleted: true },
      },
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { message: "Event not found or not owned by user" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Health event deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HealthTimeline API DELETE] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
