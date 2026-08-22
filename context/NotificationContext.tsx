"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Bell, Calendar, Pill, AlertTriangle, Shield, MessageSquare } from "lucide-react";
import { audioSynth } from "@/lib/audioSynth";

export interface NotificationItem {
  id: string;
  category: "medication" | "appointment" | "emergency" | "message" | "security" | "system";
  title: string;
  text: string;
  timestamp: string;
  read: boolean;
}

interface MedicineItem {
  _id: string;
  name: string;
  dose: string;
  time: string;
  reminder: boolean;
}

interface AppointmentItem {
  _id: string;
  doctorName: string;
  hospital?: string;
  date: string;
  time: string;
  status: string;
}

interface NotificationContextProps {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  soundsEnabled: boolean;
  setSoundsEnabled: (val: boolean) => void;
  medicationSounds: boolean;
  setMedicationSounds: (val: boolean) => void;
  appointmentSounds: boolean;
  setAppointmentSounds: (val: boolean) => void;
  alertSounds: boolean;
  setAlertSounds: (val: boolean) => void;
  messageSounds: boolean;
  setMessageSounds: (val: boolean) => void;
  securitySounds: boolean;
  setSecuritySounds: (val: boolean) => void;
  notifications: NotificationItem[];
  addNotification: (
    category: NotificationItem["category"],
    title: string,
    text: string,
    options?: {
      onClickAction?: () => void;
      customActions?: { label: string; action: () => void }[];
    }
  ) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  browserPermission: string;
  requestBrowserPermission: () => Promise<boolean>;
  refreshSchedules: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers for SSR safety and avoiding useEffect setstate warnings
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_global");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_sounds");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [medicationSounds, setMedicationSounds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_med_sound");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [appointmentSounds, setAppointmentSounds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_appt_sound");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [alertSounds, setAlertSounds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_alert_sound");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [messageSounds, setMessageSounds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_msg_sound");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [securitySounds, setSecuritySounds] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notif_sec_sound");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window !== "undefined") {
      const storedNotifs = localStorage.getItem("notif_list");
      if (storedNotifs) {
        try {
          return JSON.parse(storedNotifs);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  // Scheduled check items
  const [scheduledMedicines, setScheduledMedicines] = useState<MedicineItem[]>([]);
  const [scheduledAppointments, setScheduledAppointments] = useState<AppointmentItem[]>([]);
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "medication":
        return <Pill className="text-blue-600 dark:text-blue-400" size={18} />;
      case "appointment":
        return <Calendar className="text-purple-600 dark:text-purple-400" size={18} />;
      case "emergency":
        return <AlertTriangle className="text-red-600 dark:text-red-400 animate-pulse" size={18} />;
      case "message":
        return <MessageSquare className="text-teal-600 dark:text-teal-400" size={18} />;
      case "security":
        return <Shield className="text-amber-600 dark:text-amber-400" size={18} />;
      default:
        return <Bell className="text-gray-600 dark:text-gray-400" size={18} />;
    }
  };

  const addNotification = (
    category: NotificationItem["category"],
    title: string,
    text: string,
    options?: {
      onClickAction?: () => void;
      customActions?: { label: string; action: () => void }[];
    }
  ) => {
    if (!notificationsEnabled) return;

    // Play synthesized sound if enabled
    if (soundsEnabled) {
      if (category === "medication" && medicationSounds) audioSynth.playMedication();
      else if (category === "appointment" && appointmentSounds) audioSynth.playAppointment();
      else if (category === "emergency" && alertSounds) audioSynth.playEmergency();
      else if (category === "message" && messageSounds) audioSynth.playMessage();
      else if (category === "security" && securitySounds) audioSynth.playSecurity();
      else if (category === "system") audioSynth.playSystem();
    }

    // Add to state & localStore
    const newNotif: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      category,
      title,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 50); // limit to 50 items
      localStorage.setItem("notif_list", JSON.stringify(updated));
      return updated;
    });

    // Trigger Native Browser notification
    if (browserPermission === "granted" && typeof window !== "undefined") {
      try {
        new Notification(title, { body: text });
      } catch (e) {
        console.error("Failed to show OS Notification:", e);
      }
    }

    // Trigger In-App custom Toast
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white dark:bg-gray-800 shadow-2xl rounded-2xl pointer-events-auto border border-gray-100 dark:border-gray-700 p-4 flex gap-3 items-start interactive-element`}
        >
          <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 shrink-0">
            {getCategoryIcon(category)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {text}
            </p>
            {options?.customActions && (
              <div className="flex gap-2 mt-3">
                {options.customActions.map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      btn.action();
                      toast.dismiss(t.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      index === 0
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white font-medium shrink-0 ml-1"
          >
            Dismiss
          </button>
        </div>
      ),
      { duration: category === "medication" ? 15000 : 5000 }
    );
  };

  const refreshSchedules = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [medRes, apptRes] = await Promise.all([
        fetch("/api/medicines", { headers }),
        fetch("/api/appointments", { headers }),
      ]);
      if (medRes.ok) {
        const medData = await medRes.json();
        setScheduledMedicines(medData.medicines || []);
      }
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        setScheduledAppointments(apptData.appointments || []);
      }
    } catch (e) {
      console.error("Failed to refresh scheduled notifications:", e);
    }
  };

  // Save settings helpers
  const savePref = (key: string, val: boolean) => {
    localStorage.setItem(key, String(val));
  };

  const updateGlobalNotif = (val: boolean) => {
    setNotificationsEnabled(val);
    savePref("notif_global", val);
  };

  const updateGlobalSounds = (val: boolean) => {
    setSoundsEnabled(val);
    savePref("notif_sounds", val);
  };

  const updateMedSounds = (val: boolean) => {
    setMedicationSounds(val);
    savePref("notif_med_sound", val);
  };

  const updateApptSounds = (val: boolean) => {
    setAppointmentSounds(val);
    savePref("notif_appt_sound", val);
  };

  const updateAlertSounds = (val: boolean) => {
    setAlertSounds(val);
    savePref("notif_alert_sound", val);
  };

  const updateMsgSounds = (val: boolean) => {
    setMessageSounds(val);
    savePref("notif_msg_sound", val);
  };

  const updateSecSounds = (val: boolean) => {
    setSecuritySounds(val);
    savePref("notif_sec_sound", val);
  };

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      return perm === "granted";
    } catch {
      return false;
    }
  };

  const triggerMedicationReminder = (med: MedicineItem, triggerKey: string) => {
    localStorage.setItem(triggerKey, "true");
    
    addNotification(
      "medication",
      "Medication Reminder",
      `It is time to take your dose of ${med.name} (${med.dose}).`,
      {
        customActions: [
          {
            label: "Mark as Taken",
            action: async () => {
              try {
                const token = localStorage.getItem("token");
                await fetch("/api/medicines", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ id: med._id }),
                });
                refreshSchedules();
                toast.success(`${med.name} marked as taken.`);
              } catch (e) {
                console.error(e);
              }
            },
          },
          {
            label: "Snooze (5m)",
            action: () => {
              const snoozeUntil = Date.now() + 5 * 60 * 1000;
              setSnoozedReminders((prev) => ({
                ...prev,
                [med._id]: snoozeUntil,
              }));
              toast.success(`Reminder for ${med.name} snoozed for 5 minutes.`);
            },
          },
          {
            label: "Skip",
            action: () => {
              toast.success(`Dose of ${med.name} skipped.`);
            },
          },
        ],
      }
    );
  };

  const checkReminders = () => {
    if (!notificationsEnabled) return;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // "2026-08-09"
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Check Medicines
    scheduledMedicines.forEach((med) => {
      if (!med.reminder) return;
      
      const timeMatch = med.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return;

      let medHour = parseInt(timeMatch[1]);
      const medMin = parseInt(timeMatch[2]);
      const period = timeMatch[3]?.toUpperCase();

      if (period === "PM" && medHour < 12) medHour += 12;
      if (period === "AM" && medHour === 12) medHour = 0;

      const triggerKey = `triggered_med_${med._id}_${todayStr}`;
      const isAlreadyTriggered = localStorage.getItem(triggerKey) === "true";

      if (currentHour === medHour && currentMin === medMin && !isAlreadyTriggered) {
        triggerMedicationReminder(med, triggerKey);
      }
    });

    // Check snoozed reminders
    Object.keys(snoozedReminders).forEach((medId) => {
      const snoozeTime = snoozedReminders[medId];
      if (Date.now() >= snoozeTime) {
        const med = scheduledMedicines.find((m) => m._id === medId);
        if (med) {
          triggerMedicationReminder(med, `triggered_med_${med._id}_snooze_${Date.now()}`);
        }
        setSnoozedReminders((prev) => {
          const next = { ...prev };
          delete next[medId];
          return next;
        });
      }
    });

    // Check Appointments
    scheduledAppointments.forEach((appt) => {
      if (appt.status !== "Booked") return;
      
      const apptDateStr = appt.date;
      if (apptDateStr !== todayStr) return;

      const timeMatch = appt.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return;

      let apptHour = parseInt(timeMatch[1]);
      const apptMin = parseInt(timeMatch[2]);
      const period = timeMatch[3]?.toUpperCase();

      if (period === "PM" && apptHour < 12) apptHour += 12;
      if (period === "AM" && apptHour === 12) apptHour = 0;

      const apptTime = new Date();
      apptTime.setHours(apptHour, apptMin, 0, 0);

      const diffMs = apptTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins === 15) {
        const triggerKey = `triggered_appt_15m_${appt._id}`;
        if (localStorage.getItem(triggerKey) !== "true") {
          localStorage.setItem(triggerKey, "true");
          addNotification(
            "appointment",
            "Upcoming Appointment",
            `Your consultation with Dr. ${appt.doctorName} is in 15 minutes.`
          );
        }
      }
    });
  };

  // Sync schedules on mount or focus
  useEffect(() => {

    refreshSchedules();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", refreshSchedules);
      return () => window.removeEventListener("focus", refreshSchedules);
    }
  }, []);

  // Set up ticker checking every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledMedicines, scheduledAppointments, snoozedReminders, notificationsEnabled]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("notif_list", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem("notif_list");
  };

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled: updateGlobalNotif,
        soundsEnabled,
        setSoundsEnabled: updateGlobalSounds,
        medicationSounds,
        setMedicationSounds: updateMedSounds,
        appointmentSounds,
        setAppointmentSounds: updateApptSounds,
        alertSounds,
        setAlertSounds: updateAlertSounds,
        messageSounds,
        setMessageSounds: updateMsgSounds,
        securitySounds,
        setSecuritySounds: updateSecSounds,
        notifications,
        addNotification,
        markAsRead,
        clearAll,
        browserPermission,
        requestBrowserPermission,
        refreshSchedules,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
