import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import Appointment from "@/models/Appointment";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}

// =======================
// GET APPOINTMENTS
// =======================

export async function GET(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };

    const appointments = await Appointment.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        appointments,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET appointments error:", error);

    return NextResponse.json(
      {
        message: "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// BOOK APPOINTMENT
// =======================

export async function POST(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          message: "No token provided",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };

    const body = await request.json();

    if (
      !body.patientName ||
      !body.doctorName ||
      !body.hospital ||
      !body.date ||
      !body.time
    ) {
      return NextResponse.json(
        {
          message: "All fields are required",
        },
        {
          status: 400,
        }
      );
    }

    const appointment = await Appointment.create({
      userId: decoded.userId,
      patientName: body.patientName,
      doctorName: body.doctorName,
      hospital: body.hospital,
      date: body.date,
      time: body.time,
      status: "Booked",
    });

    const appointments = await Appointment.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Booked",
        appointment,
        appointments,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST appointment error:", error);

    return NextResponse.json(
      {
        message: "Booking failed",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// UPDATE STATUS
// =======================

export async function PATCH(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          message: "No token provided",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };

    const { id, status } = await request.json();

    const appointment = await Appointment.findOne({
      _id: id,
      userId: decoded.userId,
    });

    if (!appointment) {
      return NextResponse.json(
        {
          message: "Appointment not found",
        },
        {
          status: 404,
        }
      );
    }

    appointment.status = status;

    await appointment.save();

    const appointments = await Appointment.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Updated",
        appointments,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("DELETE appointment error:", error);

    return NextResponse.json(
      {
        message: "Update failed",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// DELETE APPOINTMENT
// =======================

export async function DELETE(request: Request) {
  try {
    await connectDB();

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          message: "No token provided",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };

    const { id } = await request.json();

    const appointment = await Appointment.findOne({
      _id: id,
      userId: decoded.userId,
    });

    if (!appointment) {
      return NextResponse.json(
        {
          message: "Appointment not found",
        },
        {
          status: 404,
        }
      );
    }

    await Appointment.findByIdAndDelete(id);

    const appointments = await Appointment.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Appointment Deleted",
        appointments,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("PUT appointment error:", error);

    return NextResponse.json(
      {
        message: "Delete failed",
      },
      {
        status: 500,
      }
    );
  }
}