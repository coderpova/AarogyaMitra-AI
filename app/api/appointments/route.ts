import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Appointment from "@/models/Appointment";
import { getAuthUserId } from "@/lib/jwtHelper";

// =======================
// GET APPOINTMENTS
// =======================
export async function GET(request: Request) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: "No token provided", appointments: [] },
        { status: 401 }
      );
    }

    await connectDB();

    const appointments = await Appointment.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      { appointments: appointments || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json(
      { message: "Server Error", appointments: [] },
      { status: 500 }
    );
  }
}

// =======================
// ADD APPOINTMENT
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

    if (
      !body.patientName ||
      !body.doctorName ||
      !body.hospital ||
      !body.date ||
      !body.time
    ) {
      return NextResponse.json(
        { message: "All appointment fields are required" },
        { status: 400 }
      );
    }

    const appointment = await Appointment.create({
      userId,
      patientName: body.patientName,
      doctorName: body.doctorName,
      hospital: body.hospital,
      date: body.date,
      time: body.time,
      status: "Booked",
    });

    const appointments = await Appointment.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Booked Successfully",
        appointment,
        appointments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST appointment error:", error);
    return NextResponse.json(
      { message: "Appointment booking failed" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE APPOINTMENT
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

    const appointment = await Appointment.findOne({
      _id: id,
      userId,
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    await Appointment.findByIdAndDelete(id);

    const appointments = await Appointment.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Cancelled Successfully",
        appointments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE appointment error:", error);
    return NextResponse.json(
      { message: "Cancellation failed" },
      { status: 500 }
    );
  }
}

// =======================
// UPDATE APPOINTMENT STATUS (PATCH)
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

    const { id, status } = await request.json();

    const appointment = await Appointment.findOne({
      _id: id,
      userId,
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    if (status) {
      appointment.status = status;
      await appointment.save();
    }

    const appointments = await Appointment.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Updated Successfully",
        appointments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH appointment error:", error);
    return NextResponse.json(
      { message: "Update failed" },
      { status: 500 }
    );
  }
}