"use client";

import { useOnlineStatus } from "@/lib/useOnlineStatus";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Pill, Clock, Trash2, Plus, WifiOff, Edit2, Calendar, Repeat } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useNotification } from "@/context/NotificationContext";
import {
  cacheMedicines,
  getCachedMedicines,
  saveMedicineOffline,
} from "@/lib/offlineStorage";
import {
  searchMedicineCatalog,
  MedicineCatalogItem,
} from "@/lib/medicineCatalog";

interface Medicine {
  _id?: string;
  id?: string;
  name: string;
  dose: string;
  time: string;
  date?: string;
  frequency?: "Once" | "Daily" | "Custom";
  customDays?: string[];
  reminder: boolean;
  taken?: boolean;
  _pendingSync?: boolean;
}

const WEEKDAYS = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
  { id: "Sat", label: "Sat" },
  { id: "Sun", label: "Sun" },
];

function generateOfflineId() {
  return `offline_${Date.now()}`;
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return "";
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${min} ${period}`;
}

export default function MedicinesPage() {
  const { t } = useLanguage();
  const { refreshSchedules } = useNotification();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    dose: string;
    time: string;
    date: string;
    frequency: "Once" | "Daily" | "Custom";
    customDays: string[];
    reminder: boolean;
  }>({
    name: "",
    dose: "",
    time: "08:00",
    date: getTodayDateString(),
    frequency: "Daily",
    customDays: [],
    reminder: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<MedicineCatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<MedicineCatalogItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name.trim().length >= 1) {
        const results = searchMedicineCatalog(formData.name, 8);
        setSuggestions(results);
        setShowSuggestions(true);
        setFocusedIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.name]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMedicineActive = (medicineTime: string) => {
    if (typeof window === "undefined") return false;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const timeMatch = medicineTime.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;

    const medHour = parseInt(timeMatch[1], 10);
    const medMin = parseInt(timeMatch[2], 10);

    return currentHour === medHour && currentMin === medMin;
  };

  const fetchMedicines = useCallback(async () => {
    if (!navigator.onLine) {
      const cached = getCachedMedicines();
      setTimeout(() => {
        setMedicines(cached as Medicine[]);
        setLoading(false);
      }, 0);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/medicines", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        const meds = data.medicines || [];
        setMedicines(meds);
        cacheMedicines(meds);
        refreshSchedules();
      }
    } catch (error) {
      console.log("Medicines fetch failed, using cache:", error);
      const cached = getCachedMedicines();
      setMedicines(cached as Medicine[]);
    } finally {
      setLoading(false);
    }
  }, [refreshSchedules]);

  useEffect(() => {
    fetchMedicines();
    if (typeof window !== "undefined") {
      window.addEventListener("aarogya_data_changed", fetchMedicines);
      return () => window.removeEventListener("aarogya_data_changed", fetchMedicines);
    }
  }, [fetchMedicines]);

  const resetForm = () => {
    setFormData({
      name: "",
      dose: "",
      time: "08:00",
      date: getTodayDateString(),
      frequency: "Daily",
      customDays: [],
      reminder: true,
    });
    setFormErrors({});
    setSelectedCatalogItem(null);
    setEditingId(null);
    setShowForm(false);
  };

  const openEditForm = (med: Medicine) => {
    setEditingId(med._id || med.id || null);
    setFormData({
      name: med.name,
      dose: med.dose,
      time: med.time || "08:00",
      date: med.date || getTodayDateString(),
      frequency: med.frequency || "Daily",
      customDays: med.customDays || [],
      reminder: med.reminder ?? true,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Please select or enter a medicine name.";
    }

    if (!formData.dose.trim()) {
      errors.dose = "Please specify a dosage (e.g., 500 mg or 1 tablet).";
    }

    if (!formData.date) {
      errors.date = "Please select a valid date.";
    } else if (formData.date < getTodayDateString()) {
      errors.date = "Reminder date cannot be in the past.";
    }

    if (!formData.time) {
      errors.time = "Please choose a time.";
    }

    if (formData.frequency === "Custom" && formData.customDays.length === 0) {
      errors.customDays = "Select at least one day for custom repeat.";
    }

    // Duplicate check
    const isDuplicate = medicines.some((m) => {
      const isSelf = (m._id || m.id) === editingId;
      if (isSelf) return false;
      return (
        m.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        m.time === formData.time &&
        (m.date || getTodayDateString()) === (formData.date || getTodayDateString()) &&
        (m.frequency || "Daily") === formData.frequency
      );
    });

    if (isDuplicate) {
      errors.duplicate = "An identical reminder already exists.";
      toast.error("An identical reminder already exists.");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectSuggestion = (item: MedicineCatalogItem) => {
    setFormData((prev) => ({
      ...prev,
      name: item.name,
      dose: prev.dose || item.strength,
    }));
    setSelectedCatalogItem(item);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const toggleCustomDay = (dayId: string) => {
    setFormData((prev) => {
      const exists = prev.customDays.includes(dayId);
      const updatedDays = exists
        ? prev.customDays.filter((d) => d !== dayId)
        : [...prev.customDays, dayId];
      return { ...prev, customDays: updatedDays };
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Offline Mode Save
    if (!isOnline) {
      if (editingId) {
        const updatedMeds = medicines.map((m) =>
          (m._id || m.id) === editingId ? { ...m, ...formData } : m
        );
        setMedicines(updatedMeds);
        cacheMedicines(updatedMeds);
        toast.success("Reminder updated (offline mode).");
      } else {
        saveMedicineOffline(formData as Record<string, unknown>);
        const newMed: Medicine = {
          ...formData,
          _id: generateOfflineId(),
          _pendingSync: true,
        };
        const updated = [...medicines, newMed];
        setMedicines(updated);
        cacheMedicines(updated);
        toast.success("Reminder created (offline mode).");
        scheduleReminder(newMed);
      }
      resetForm();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = "/api/medicines";
      const method = editingId ? "PUT" : "POST";
      const payload = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Reminder updated successfully!" : "Reminder added successfully!");
        setMedicines(data.medicines || []);
        cacheMedicines(data.medicines || []);
        resetForm();
        refreshSchedules();
      } else {
        if (res.status === 409) {
          setFormErrors((prev) => ({ ...prev, duplicate: data.message }));
        }
        toast.error(data.message || "Failed to save medicine reminder.");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    }
  };

  const deleteMedicine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medicine reminder?")) return;

    if (!isOnline) {
      const updated = medicines.filter((m) => (m._id || m.id) !== id);
      setMedicines(updated);
      cacheMedicines(updated);
      toast.success(t("medicines.deletedSuccess") + t("medicinesExt.offlineSuffix"));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/medicines", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        toast.success(t("medicines.deletedSuccess"));
        fetchMedicines();
        refreshSchedules();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const scheduleReminder = (medicine: Medicine) => {
    if (!medicine.reminder || typeof window === "undefined" || !("Notification" in window)) return;

    const timeMatch = (medicine.time || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) return;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(`💊 Medicine Reminder — AarogyaMitra`, {
          body: `Time to take ${medicine.name} (${medicine.dose})`,
          icon: "/favicon.ico",
          tag: `med_${medicine.name}`,
        });
      }
    }, delay);
  };

  useEffect(() => {
    medicines.forEach((med) => {
      if (med.reminder) {
        scheduleReminder(med);
      }
    });
  }, [medicines]);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSkeleton text="Loading your medicine reminders..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-animation space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header Banner */}
        <div className={`text-white rounded-3xl p-6 sm:p-8 shadow-lg ${isOnline ? "bg-gradient-to-r from-blue-700 via-blue-600 to-teal-600" : "bg-gray-700"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {t("medicines.title")}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1 sm:mt-2 max-w-xl">
                {t("medicines.subtitle")}
              </p>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-2 bg-amber-500/30 px-3 py-2 rounded-xl text-amber-200 text-xs font-semibold self-start sm:self-auto">
                <WifiOff size={16} />
                <span>{t("medicinesExt.offline")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Offline Notice Banner */}
        {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
            <WifiOff size={18} className="shrink-0" />
            <div>
              <p className="font-semibold">{t("medicinesExt.workOffline")}</p>
              <p className="text-xs mt-0.5">{t("medicinesExt.offlineDesc")}</p>
            </div>
          </div>
        )}

        {/* Section Header & Add Trigger */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-6">
          <div>
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Pill className="text-blue-600" size={22} />
              {t("dashboard.medicineReminders")} ({medicines.length})
            </h2>
          </div>
          <button
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition shadow-md"
          >
            <Plus size={18} />
            {showForm ? t("common.cancel") : t("medicines.addMedicine")}
          </button>
        </div>

        {/* STRUCTURED MEDICINE FORM */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-5 sm:p-8 mt-4 border border-blue-100 dark:border-gray-800 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {editingId ? <Edit2 className="text-blue-600" size={18} /> : <Plus className="text-blue-600" size={18} />}
                {editingId ? "Edit Medicine Reminder" : "Set New Medicine Reminder"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {formErrors.duplicate && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs font-semibold">
                ⚠️ {formErrors.duplicate}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. AUTOCOMPLETE MEDICINE NAME */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="med-name-input">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="med-name-input"
                    role="combobox"
                    aria-expanded={showSuggestions}
                    aria-controls="med-suggestions-list"
                    aria-autocomplete="list"
                    placeholder="Search or enter medicine (e.g., Paracetamol)"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (formData.name.trim().length >= 1) setShowSuggestions(true);
                    }}
                    className={`w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white text-sm outline-none transition ${
                      formErrors.name
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>

                {formErrors.name && (
                  <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.name}</p>
                )}

                {/* Autocomplete Dropdown */}
                {showSuggestions && (
                  <div
                    id="med-suggestions-list"
                    role="listbox"
                    className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((item, idx) => (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={idx === focusedIndex}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`p-3 cursor-pointer text-xs flex items-center justify-between transition border-b last:border-0 border-gray-100 dark:border-gray-800 ${
                            idx === focusedIndex
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-gray-800 dark:text-white">{item.name}</span>
                            <span className="text-gray-400 ml-2">({item.strength})</span>
                          </div>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                            {item.form}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400 dark:text-gray-500">
                        No matching medicine found in catalog
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. DOSE INPUT */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="med-dose-input">
                  Dosage / Strength <span className="text-red-500">*</span>
                </label>
                <input
                  id="med-dose-input"
                  placeholder="e.g. 500 mg or 1 tablet"
                  value={formData.dose}
                  onChange={(e) => {
                    setFormData({ ...formData, dose: e.target.value });
                    if (formErrors.dose) setFormErrors({ ...formErrors, dose: "" });
                  }}
                  className={`w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white text-sm outline-none transition ${
                    formErrors.dose
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
                {formErrors.dose && (
                  <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.dose}</p>
                )}
              </div>

              {/* 3. STRUCTURED DATE INPUT */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="med-date-input">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="med-date-input"
                    type="date"
                    min={getTodayDateString()}
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (formErrors.date) setFormErrors({ ...formErrors, date: "" });
                    }}
                    className={`w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white text-sm outline-none transition ${
                      formErrors.date
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {formErrors.date && (
                  <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.date}</p>
                )}
              </div>

              {/* 4. STRUCTURED TIME INPUT */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="med-time-input">
                  Reminder Time (HH:mm) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="med-time-input"
                    type="time"
                    value={formData.time}
                    onChange={(e) => {
                      setFormData({ ...formData, time: e.target.value });
                      if (formErrors.time) setFormErrors({ ...formErrors, time: "" });
                    }}
                    className={`w-full border p-3 rounded-xl dark:bg-gray-800 dark:text-white text-sm outline-none transition ${
                      formErrors.time
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {formData.time && (
                  <p className="text-blue-600 dark:text-blue-400 text-[11px] font-semibold mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    <span>Formatted: {formatTimeTo12Hour(formData.time)}</span>
                  </p>
                )}
                {formErrors.time && (
                  <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.time}</p>
                )}
              </div>
            </div>

            {/* 5. REPEAT / FREQUENCY SELECTOR */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Repeat Frequency <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {(["Once", "Daily", "Custom"] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: freq })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.frequency === freq
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Repeat size={14} />
                    {freq}
                  </button>
                ))}
              </div>

              {/* Custom Weekday Checkbox Grid */}
              {formData.frequency === "Custom" && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block">
                    Select Days of Week:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const isSelected = formData.customDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleCustomDay(day.id)}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition border ${
                            isSelected
                              ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.customDays && (
                    <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.customDays}</p>
                  )}
                </div>
              )}
            </div>

            {/* Selected Catalog Info Banner */}
            {selectedCatalogItem && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-150 dark:border-blue-900/50 p-3.5 rounded-2xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Pill size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">{selectedCatalogItem.name}</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400">({selectedCatalogItem.strength} • {selectedCatalogItem.form})</span>
                  </div>
                </div>
                <span className="bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded-md font-semibold text-[10px]">Catalog Verified</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-gray-800">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-md"
              >
                {editingId ? "Update Reminder" : t("medicines.saveMedicine")}
              </button>
            </div>
          </div>
        )}

        {/* MEDICINES LIST GRID */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {medicines.length > 0 ? (
            medicines.map((medicine) => (
              <div
                key={medicine._id || medicine.id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:-translate-y-[1px] hover:shadow-xl transition-all duration-200 ${
                  isMedicineActive(medicine.time)
                    ? "animate-med-pulse border-blue-500 ring-2 ring-blue-500/20"
                    : medicine.taken
                    ? "opacity-75 border-green-200 dark:border-green-950/40 bg-gray-50/50 dark:bg-gray-950/20"
                    : medicine._pendingSync
                    ? "border-amber-300 dark:border-amber-700"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Pill size={22} />
                      </div>
                      <div>
                        <h2 className={`text-lg font-bold dark:text-white transition-all ${medicine.taken ? "line-through text-gray-400 dark:text-gray-500" : ""}`}>
                          {medicine.name}
                        </h2>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {t("medicines.dose")}: {medicine.dose}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditForm(medicine)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        title="Edit Reminder"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteMedicine(medicine._id || medicine.id || "")}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title={t("common.delete")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Clock size={14} className="text-blue-600 shrink-0" />
                      <span className="font-semibold">{formatTimeTo12Hour(medicine.time)}</span>
                    </div>
                    {medicine.date && (
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Calendar size={14} className="text-teal-600 shrink-0" />
                        <span>{medicine.date}</span>
                      </div>
                    )}
                  </div>

                  {medicine.frequency && (
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                      <Repeat size={12} className="text-gray-400" />
                      <span>Repeat: </span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {medicine.frequency === "Custom" && medicine.customDays?.length
                          ? medicine.customDays.join(", ")
                          : medicine.frequency}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <div className="flex gap-1.5 flex-wrap">
                    {medicine.reminder && (
                      <p className="text-green-600 dark:text-green-400 font-semibold text-[10px] bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full">
                        ✓ {t("medicines.reminder")}
                      </p>
                    )}
                    {medicine._pendingSync && (
                      <p className="text-amber-600 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        ⏳ Sync
                      </p>
                    )}
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("token");
                        await fetch("/api/medicines", {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ id: medicine._id }),
                        });
                        fetchMedicines();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                      medicine.taken
                        ? "bg-green-600 text-white shadow-sm shadow-green-500/20"
                        : "bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-250 dark:border-gray-700"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 flex items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
                      medicine.taken ? "bg-white border-white text-green-600" : "border-gray-400 text-transparent"
                    }`}>
                      ✓
                    </span>
                    {medicine.taken ? "Taken" : "Mark Taken"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-3 text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
              <Pill className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400">
                {t("medicines.noMedicines")}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}