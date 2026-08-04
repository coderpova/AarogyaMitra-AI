"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Calendar,
  Clock,
  UserRound,
  Hospital as HospitalIcon,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface AppointmentItem {
  _id: string;
  patientName: string;
  doctorName: string;
  hospital: string;
  date: string;
  time: string;
  status: "Booked" | "Completed" | "Cancelled";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    patientName: "",
    doctorName: "",
    hospital: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/appointments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      } else {
        toast.error(data.message || "Failed to load appointments");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (
      !formData.patientName ||
      !formData.doctorName ||
      !formData.hospital ||
      !formData.date ||
      !formData.time
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Appointment Booked Successfully!");
        setAppointments(data.appointments || []);
        setFormData({
          patientName: "",
          doctorName: "",
          hospital: "",
          date: "",
          time: "",
        });
        setShowForm(false);
      } else {
        toast.error(data.message || "Booking failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Appointment marked as ${newStatus}`);
        setAppointments(data.appointments || []);
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/appointments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Appointment Deleted");
        setAppointments(data.appointments || []);
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-xl font-medium">Loading Appointments...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-animation">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold">My Appointments 📅</h1>
          <p className="text-blue-100 mt-2">
            Schedule and manage your doctor consultations seamlessly.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Upcoming Consultations ({appointments.length})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 transition hover:scale-105 shadow-md"
          >
            <Plus size={20} />
            {showForm ? "Cancel" : "Book Appointment"}
          </button>
        </div>

        {/* Booking Form Modal / Container */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-8 mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                Patient Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={formData.patientName}
                onChange={(e) =>
                  setFormData({ ...formData, patientName: e.target.value })
                }
                className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                Doctor Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Priya Singh"
                value={formData.doctorName}
                onChange={(e) =>
                  setFormData({ ...formData, doctorName: e.target.value })
                }
                className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                Hospital / Clinic
              </label>
              <input
                type="text"
                placeholder="e.g. AIIMS Delhi"
                value={formData.hospital}
                onChange={(e) =>
                  setFormData({ ...formData, hospital: e.target.value })
                }
                className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className="w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBookAppointment}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        )}

        {/* Appointment List */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <div
                key={appointment._id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg p-6 transition hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                        <UserRound className="text-blue-700 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {appointment.doctorName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Patient: {appointment.patientName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteAppointment(appointment._id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                      title="Delete Appointment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-5 space-y-2 text-gray-600 dark:text-gray-300">
                    <p className="flex items-center gap-2">
                      <HospitalIcon size={18} className="text-blue-600" />
                      <span>{appointment.hospital}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      <span>{appointment.date}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={18} className="text-blue-600" />
                      <span>{appointment.time}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      appointment.status === "Completed"
                        ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : appointment.status === "Cancelled"
                        ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {appointment.status}
                  </span>

                  <div className="flex gap-2">
                    {appointment.status !== "Completed" && (
                      <button
                        onClick={() =>
                          updateStatus(appointment._id, "Completed")
                        }
                        className="text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 flex items-center gap-1 transition"
                      >
                        <CheckCircle size={14} /> Complete
                      </button>
                    )}
                    {appointment.status !== "Cancelled" && (
                      <button
                        onClick={() =>
                          updateStatus(appointment._id, "Cancelled")
                        }
                        className="text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 flex items-center gap-1 transition"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-2 text-center py-12 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No appointments booked yet.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition"
              >
                Book Your First Appointment
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}