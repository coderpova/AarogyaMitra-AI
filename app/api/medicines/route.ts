import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import { getAuthUserId } from "@/lib/jwtHelper";

// =======================
// GET MEDICINES
// =======================
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided", medicines: [] },
        { status: 401 }
      );
    }

    await connectDB();

    const medicines = await Medicine.find({
      userId,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      { medicines: medicines || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET medicines error:", error);
    return NextResponse.json(
      { message: "Server Error", medicines: [] },
      { status: 500 }
    );
  }
}

// =======================
// ADD MEDICINE
// =======================
export async function POST(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    if (!body.name || !body.dose || !body.time) {
      return NextResponse.json(
        { message: "Name, dose, and time are required" },
        { status: 400 }
      );
    }

    // Duplicate check for identical reminder
    const existingDuplicate = await Medicine.findOne({
      userId,
      isDeleted: { $ne: true },
      name: { $regex: new RegExp(`^${body.name.trim()}$`, "i") },
      time: body.time,
      date: body.date || "",
      frequency: body.frequency || "Daily",
    });

    if (existingDuplicate) {
      return NextResponse.json(
        { message: "An identical reminder already exists." },
        { status: 409 }
      );
    }

    const medicine = await Medicine.create({
      userId,
      name: body.name.trim(),
      dose: body.dose.trim(),
      time: body.time,
      date: body.date || "",
      frequency: body.frequency || "Daily",
      customDays: body.customDays || [],
      reminder: body.reminder ?? true,
      taken: false,
    });

    const medicines = await Medicine.find({
      userId,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Added Successfully",
        medicine,
        medicines,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST medicine error:", error);
    return NextResponse.json(
      { message: "Medicine add failed" },
      { status: 500 }
    );
  }
}

// =======================
// EDIT MEDICINE (PUT)
// =======================
export async function PUT(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    if (!body.id || !body.name || !body.dose || !body.time) {
      return NextResponse.json(
        { message: "ID, name, dose, and time are required" },
        { status: 400 }
      );
    }

    const medicine = await Medicine.findOne({
      _id: body.id,
      userId,
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine not found" },
        { status: 404 }
      );
    }

    medicine.name = body.name.trim();
    medicine.dose = body.dose.trim();
    medicine.time = body.time;
    if (body.date !== undefined) medicine.date = body.date;
    if (body.frequency !== undefined) medicine.frequency = body.frequency;
    if (body.customDays !== undefined) medicine.customDays = body.customDays;
    if (body.reminder !== undefined) medicine.reminder = body.reminder;

    await medicine.save();

    const medicines = await Medicine.find({
      userId,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Updated Successfully",
        medicine,
        medicines,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT medicine error:", error);
    return NextResponse.json(
      { message: "Medicine update failed" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE MEDICINE
// =======================
export async function DELETE(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await request.json();

    const medicine = await Medicine.findOne({
      _id: id,
      userId,
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine not found" },
        { status: 404 }
      );
    }

    await Medicine.findByIdAndDelete(id);

    const medicines = await Medicine.find({
      userId,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Deleted Successfully",
        medicines,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE medicine error:", error);
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    );
  }
}

// =======================
// UPDATE MEDICINE STATUS (PATCH)
// =======================
export async function PATCH(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await request.json();

    const medicine = await Medicine.findOne({
      _id: id,
      userId,
    });

    if (!medicine) {
      return NextResponse.json(
        { message: "Medicine not found" },
        { status: 404 }
      );
    }

    medicine.taken = !medicine.taken;
    await medicine.save();

    const medicines = await Medicine.find({
      userId,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Updated Successfully",
        medicines,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH medicine error:", error);
    return NextResponse.json(
      { message: "Update failed" },
      { status: 500 }
    );
  }
}