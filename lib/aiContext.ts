import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Medicine from "@/models/Medicine";
import Appointment from "@/models/Appointment";

export async function getAIContext(userId: string) {
  await connectDB();

  // Find user by email or _id
  let user = null;
  if (userId.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(userId);
  }

  if (!user) {
    return "No user information available";
  }

  const userIdStr = user._id.toString();

  // Query medicines and appointments from their respective collections
  const userMedicines = await Medicine.find({
    userId: userIdStr,
  });

  const userAppointments = await Appointment.find({
    userId: userIdStr,
  });

  const context = `
Patient Information:
Name: ${user.name}
Age: ${user.profile?.age || "Not available"}
Gender: ${user.profile?.gender || "Not available"}
Blood Group: ${user.profile?.bloodGroup || "Not available"}

Health Data:
Heart Rate: ${user.health?.heartRate || "Not available"}
Steps: ${user.health?.steps || "Not available"}
Health Score: ${user.health?.healthScore || "Not available"}

Medical History:
${
  user.medicalHistory?.length
    ? user.medicalHistory
        .map((item: any) => `${item.condition} - ${item.notes}`)
        .join("\n")
    : "None"
}

Medicines:
${
  userMedicines?.length
    ? userMedicines
        .map(
          (item: any) =>
            `${item.name} (Dose: ${item.dose}, Time: ${item.time}${
              item.taken ? " - Taken" : ""
            })`
        )
        .join("\n")
    : "None"
}

Appointments:
${
  userAppointments?.length
    ? userAppointments
        .map(
          (item: any) =>
            `Doctor: ${item.doctorName || item.doctor}, Hospital: ${
              item.hospital
            }, Date: ${item.date}, Time: ${item.time}, Status: ${item.status}`
        )
        .join("\n")
    : "None"
}

Allergies:
${
  user.allergies?.length
    ? user.allergies.map((item: any) => item.name).join(", ")
    : "None"
}
`;

  return context;
}