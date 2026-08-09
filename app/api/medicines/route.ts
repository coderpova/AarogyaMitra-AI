import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import Medicine from "@/models/Medicine";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing in .env.local");
}

// =======================
// GET MEDICINES
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

    const medicines = await Medicine.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        medicines,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET medicines error:", error);

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
// ADD MEDICINE
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

    if (!body.name || !body.dose || !body.time) {
      return NextResponse.json(
        {
          message: "All fields are required",
        },
        {
          status: 400,
        }
      );
    }

    const medicine = await Medicine.create({
      userId: decoded.userId,
      name: body.name,
      dose: body.dose,
      time: body.time,
      reminder: body.reminder ?? true,
      taken: false,
    });

    const medicines = await Medicine.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Added Successfully",
        medicine,
        medicines,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST medicine error:", error);

    return NextResponse.json(
      {
        message: "Medicine add failed",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================
// DELETE MEDICINE
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

    const medicine = await Medicine.findOne({
      _id: id,
      userId: decoded.userId,
    });

    if (!medicine) {
      return NextResponse.json(
        {
          message: "Medicine not found",
        },
        {
          status: 404,
        }
      );
    }

    await Medicine.findByIdAndDelete(id);

    const medicines = await Medicine.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Deleted Successfully",
        medicines,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("DELETE medicine error:", error);

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

// =======================
// UPDATE MEDICINE STATUS
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

    const { id } = await request.json();

    const medicine = await Medicine.findOne({
      _id: id,
      userId: decoded.userId,
    });

    if (!medicine) {
      return NextResponse.json(
        {
          message: "Medicine not found",
        },
        {
          status: 404,
        }
      );
    }

    medicine.taken = !medicine.taken;

    await medicine.save();

    const medicines = await Medicine.find({
      userId: decoded.userId,
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json(
      {
        message: "Medicine Updated Successfully",
        medicines,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("PATCH medicine error:", error);

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