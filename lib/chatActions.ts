import connectDB from "@/lib/mongodb";
import Appointment from "@/models/Appointment";
import User from "@/models/User";

export function parseActionTags(text: string): { actionType: string; params: Record<string, unknown> }[] {
  const actions: { actionType: string; params: Record<string, unknown> }[] = [];
  
  const bookMatch = text.match(/\[BOOK_APPOINTMENT\]([\s\S]*?)\[\/BOOK_APPOINTMENT\]/);
  if (bookMatch) {
    try {
      const params = JSON.parse(bookMatch[1]);
      actions.push({ actionType: "BOOK_APPOINTMENT", params });
    } catch (e) {
      console.error("Failed to parse BOOK_APPOINTMENT JSON:", e);
    }
  }

  const findMatch = text.match(/\[FIND_HOSPITAL\]([\s\S]*?)\[\/FIND_HOSPITAL\]/);
  if (findMatch) {
    try {
      const params = JSON.parse(findMatch[1]);
      actions.push({ actionType: "FIND_HOSPITAL", params });
    } catch (e) {
      console.error("Failed to parse FIND_HOSPITAL JSON:", e);
    }
  }

  return actions;
}

export function stripActionTags(text: string): string {
  let cleaned = text.replace(/\[BOOK_APPOINTMENT\][\s\S]*?\[\/BOOK_APPOINTMENT\]/g, "");
  cleaned = cleaned.replace(/\[FIND_HOSPITAL\][\s\S]*?\[\/FIND_HOSPITAL\]/g, "");
  return cleaned.trim();
}

export async function executeBookAppointment(userId: string, params: Record<string, unknown>): Promise<string> {
  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return "\n\n❌ Booking failed: User account not found.";
    }

    const patientName = user.profile?.name || user.email || "Patient";
    const doctorName = params.doctorName;
    const date = params.date;
    const time = params.time;
    let hospital = params.hospital;

    if (!doctorName || !date || !time) {
       return "\n\n❌ Booking failed: Missing required details (doctor, date, or time).";
    }

    // If hospital not provided, try to find one nearby based on user profile
    if (!hospital) {
        if (user.profile?.city && user.profile?.state) {
            const locParams = { city: user.profile.city, state: user.profile.state };
            const hospitalsResult = await executeFindHospital(locParams, true);
            if (typeof hospitalsResult === "object" && hospitalsResult !== null && 'hospitals' in hospitalsResult) {
                const results = hospitalsResult as { hospitals: Array<{ name: string }> };
                if (results.hospitals && results.hospitals.length > 0) {
                    hospital = results.hospitals[0].name;
                }
            }
        }
    }
    
    if (!hospital) {
         return "\n\n❌ Booking failed: Could not determine a hospital. Please specify a hospital name or update your location profile.";
    }

    // Check for duplicates
    const existing = await Appointment.findOne({
      userId,
      doctorName,
      date,
      time,
      status: "Booked",
    });

    if (existing) {
      return `\n\n✅ You already have this appointment booked:\nDoctor: ${existing.doctorName}\nHospital: ${existing.hospital}\nDate: ${existing.date}\nTime: ${existing.time}`;
    }

    const appointment = await Appointment.create({
      userId,
      patientName,
      doctorName,
      hospital,
      date,
      time,
      status: "Booked",
    });

    return `\n\n✅ Appointment booked successfully.\n\nDoctor: ${appointment.doctorName}\nHospital: ${appointment.hospital}\nDate: ${appointment.date}\nTime: ${appointment.time}`;
  } catch (error) {
    console.error("Booking error:", error);
    return "\n\n❌ I couldn't complete the booking due to an error. Please try again or book from the Appointments page.";
  }
}

export async function executeFindHospital(params: Record<string, unknown>, returnRaw = false): Promise<Record<string, unknown> | string> {
    try {
        let lat = params.lat;
        let lon = params.lon;
        const city = params.city;
        const state = params.state;
        const apiKey = process.env.GEOAPIFY_API_KEY;

        if (!apiKey) {
             return returnRaw ? { hospitals: [] } : "\n\n❌ Cannot search hospitals right now (Configuration missing).";
        }

        if (!lat || !lon) {
            if (city && state) {
                const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(String(city))},${encodeURIComponent(String(state))},India&apiKey=${apiKey}`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                if (geoData.features && geoData.features.length > 0) {
                    lat = geoData.features[0].properties.lat;
                    lon = geoData.features[0].properties.lon;
                }
            }
        }

        if (!lat || !lon) {
             return returnRaw ? { hospitals: [] } : "\n\n❌ I need your city and state, or your location, to find nearby hospitals.";
        }

        const placesUrl = `https://api.geoapify.com/v2/places?categories=healthcare.hospital&filter=circle:${lon},${lat},10000&bias=proximity:${lon},${lat}&limit=5&apiKey=${apiKey}`;
        const placesRes = await fetch(placesUrl);
        const placesData = await placesRes.json();

        const hospitals = placesData.features?.map((f: Record<string, unknown>) => {
            const props = f.properties as Record<string, unknown>;
            return {
                name: props.name || "Unknown Hospital",
                address: props.address_line2 || props.formatted || "No address",
                distance: props.distance,
            };
        }) || [];
        
        if (returnRaw) {
             return { hospitals };
        }

        if (hospitals.length === 0) {
             return "\n\n❌ I couldn't find any nearby hospitals. Please specify a hospital name or use the Hospital page.";
        }

        let reply = "\n\n🏥 **Here are the nearest hospitals I found:**\n\n";
        hospitals.forEach((h: Record<string, unknown>, i: number) => {
            const distanceStr = (Number(h.distance) / 1000).toFixed(2);
            reply += `${i + 1}. **${h.name}**\n   Address: ${h.address}\n   Distance: ${distanceStr} km\n\n`;
        });
        
        return reply;
    } catch (error) {
        console.error("Find hospital error:", error);
        return returnRaw ? { hospitals: [] } : "\n\n❌ I couldn't find nearby hospitals due to an error. Please try again.";
    }
}
