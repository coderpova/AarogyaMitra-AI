import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import HealthEvent from "@/models/HealthEvent";
import { getAuthUserId } from "@/lib/jwtHelper";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health-profile
// Returns the authenticated user's own health profile and AI preferences
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(authenticatedUserId).select("-password");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const aiPreferences = user.aiPreferences || {
      allowHealthHistory: false,
      allowMedicalReports: false,
      allowMedications: false,
      allowSymptomTimeline: false,
    };

    return NextResponse.json(
      {
        success: true,
        profile: {
          name: user.name,
          email: user.email,
          basicProfile: user.profile || {},
          medicalHistory: user.medicalHistory || [],
          allergies: user.allergies || [],
          aiPreferences,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HealthProfile API GET] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST / PUT /api/health-profile
// Updates the authenticated user's own health profile and AI preferences
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const updateFields: any = {};

    if (body.profile) {
      if (body.profile.age !== undefined) updateFields["profile.age"] = Number(body.profile.age);
      if (body.profile.gender !== undefined) updateFields["profile.gender"] = body.profile.gender;
      if (body.profile.bloodGroup !== undefined) updateFields["profile.bloodGroup"] = body.profile.bloodGroup;
      if (body.profile.phone !== undefined) updateFields["profile.phone"] = body.profile.phone;
      if (body.profile.address !== undefined) updateFields["profile.address"] = body.profile.address;
    }

    if (body.medicalHistory !== undefined) {
      updateFields.medicalHistory = body.medicalHistory;
    }

    if (body.allergies !== undefined) {
      updateFields.allergies = body.allergies;
    }

    if (body.aiPreferences) {
      if (typeof body.aiPreferences.allowHealthHistory === "boolean") {
        updateFields["aiPreferences.allowHealthHistory"] = body.aiPreferences.allowHealthHistory;
      }
      if (typeof body.aiPreferences.allowMedicalReports === "boolean") {
        updateFields["aiPreferences.allowMedicalReports"] = body.aiPreferences.allowMedicalReports;
      }
      if (typeof body.aiPreferences.allowMedications === "boolean") {
        updateFields["aiPreferences.allowMedications"] = body.aiPreferences.allowMedications;
      }
      if (typeof body.aiPreferences.allowSymptomTimeline === "boolean") {
        updateFields["aiPreferences.allowSymptomTimeline"] = body.aiPreferences.allowSymptomTimeline;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      authenticatedUserId,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    return NextResponse.json(
      {
        success: true,
        message: "Health profile and AI preferences updated successfully",
        profile: {
          name: updatedUser?.name || "",
          email: updatedUser?.email || "",
          basicProfile: updatedUser?.profile || {},
          medicalHistory: updatedUser?.medicalHistory || [],
          allergies: updatedUser?.allergies || [],
          aiPreferences: updatedUser?.aiPreferences || {},
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[HealthProfile API PUT] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/health-profile
// Explicit health context deletion and clearing of AI memory
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const authenticatedUserId = getAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const clearAll = url.searchParams.get("clearAll") === "true";
    const itemType = url.searchParams.get("type");

    if (clearAll || itemType === "all") {
      await User.findByIdAndUpdate(authenticatedUserId, {
        $set: {
          medicalHistory: [],
          allergies: [],
          symptomsHistory: [],
          aiPreferences: {
            allowHealthHistory: false,
            allowMedicalReports: false,
            allowMedications: false,
            allowSymptomTimeline: false,
          },
        },
      });

      await HealthEvent.updateMany(
        { userId: authenticatedUserId },
        { $set: { isDeleted: true } }
      );

      return NextResponse.json(
        {
          success: true,
          message: "All personal health context and AI memory cleared successfully",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Please specify clearAll=true or valid item type",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[HealthProfile API DELETE] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
