"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  User,
  Mail,
  Phone,
  HeartPulse,
  Calendar,
  Globe,
  MapPin,
  Pencil,
  Save,
  Scale,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

/* ── BMI Calculator Component ─────────────────────────────────────────── */
function BMICalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);

  const calculateBMI = () => {
    const h = parseFloat(height) / 100; // cm to m
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) {
      toast.error("Please enter valid height and weight");
      return;
    }
    const result = w / (h * h);
    setBmi(Math.round(result * 10) / 10);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", advice: "Consider a balanced diet with more calories. Consult a nutritionist." };
    if (bmi < 25) return { label: "Normal", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", advice: "Great! Maintain your healthy lifestyle with regular exercise and balanced diet." };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", advice: "Consider increasing physical activity and reducing processed food intake." };
    return { label: "Obese", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", advice: "Please consult a doctor or dietitian for a personalized weight management plan." };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
        <Scale size={22} className="text-blue-600" />
        BMI Calculator
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Calculate your Body Mass Index to understand your weight category.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium dark:text-gray-200 mb-1">Height (cm)</label>
          <input
            type="number"
            placeholder="e.g. 170"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-200 mb-1">Weight (kg)</label>
          <input
            type="number"
            placeholder="e.g. 65"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <button
        onClick={calculateBMI}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-md flex items-center gap-2 text-sm"
      >
        <TrendingUp size={16} />
        Calculate BMI
      </button>

      {bmi !== null && (
        <div className={`mt-5 rounded-2xl p-5 ${getBMICategory(bmi).bg} fade-in-up`}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold">{bmi}</p>
              <p className={`text-sm font-bold ${getBMICategory(bmi).color}`}>
                {getBMICategory(bmi).label}
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getBMICategory(bmi).label === "Normal" ? (
                  <CheckCircle size={18} className="text-green-600" />
                ) : (
                  <AlertTriangle size={18} className={getBMICategory(bmi).color} />
                )}
                <span className="font-semibold text-sm dark:text-white">
                  {getBMICategory(bmi).label} ({bmi} BMI)
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {getBMICategory(bmi).advice}
              </p>
            </div>
          </div>

          {/* BMI Scale Bar */}
          <div className="mt-4">
            <div className="h-3 rounded-full bg-gradient-to-r from-blue-400 via-green-400 via-50% to-red-500 relative">
              <div
                className="absolute w-4 h-4 bg-white border-2 border-gray-800 rounded-full shadow-md -top-0.5 transition-all duration-500"
                style={{ left: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    age: "",
    gender: "",
    bloodGroup: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const res = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        setFormData({
          age: data.user.profile?.age || "",
          gender: data.user.profile?.gender || "",
          bloodGroup: data.user.profile?.bloodGroup || "",
          phone: data.user.profile?.phone || "",
          address: data.user.profile?.address || "",
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t("profile.profileUpdated"));
        setUser(data.user);
        setEditMode(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(t("common.error"));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-xl">{t("common.loading")}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-animation space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("profile.title")}</h1>
          <p className="text-blue-100 mt-2">{t("profile.subtitle")}</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center shrink-0 shadow-inner">
              <User size={56} className="text-blue-700 dark:text-blue-300" />
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold dark:text-white">
                {user?.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 justify-center sm:justify-start">
                <Mail size={14} />
                {user?.email}
              </p>

              {user?.profile?.bloodGroup && (
                <span className="inline-flex items-center gap-1 mt-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                  🩸 {user.profile.bloodGroup}
                </span>
              )}

              <button
                onClick={() => setEditMode(!editMode)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition shadow-md mx-auto sm:mx-0"
              >
                <Pencil size={18} />
                {editMode ? t("common.cancel") : t("common.edit")}
              </button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editMode && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 grid md:grid-cols-2 gap-5 border border-gray-100 dark:border-gray-700 fade-in-up">
            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                {t("profile.age")}
              </label>
              <input
                type="number"
                placeholder={t("profile.age")}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                {t("profile.gender")}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                {t("profile.bloodGroup")}
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Blood Group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                {t("profile.phone")}
              </label>
              <input
                type="tel"
                placeholder={t("profile.phone")}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium dark:text-gray-200">
                {t("profile.address")}
              </label>
              <input
                type="text"
                placeholder={t("profile.address")}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border p-3 rounded-xl dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={handleUpdate}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-3 flex justify-center items-center gap-2 md:col-span-2 font-semibold transition shadow-md"
            >
              <Save size={18} />
              {t("profile.saveProfile")}
            </button>
          </div>
        )}

        {/* Profile Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProfileInfoCard icon={<Mail className="text-blue-600" size={20} />} title={t("auth.email")} value={user?.email || t("common.none")} />
          <ProfileInfoCard icon={<Phone className="text-green-600" size={20} />} title={t("profile.phone")} value={user?.profile?.phone || t("common.none")} />
          <ProfileInfoCard icon={<HeartPulse className="text-red-600" size={20} />} title={t("profile.bloodGroup")} value={user?.profile?.bloodGroup || t("common.none")} />
          <ProfileInfoCard icon={<Calendar className="text-purple-600" size={20} />} title={t("profile.age")} value={user?.profile?.age ? `${user.profile.age} years` : t("common.none")} />
          <ProfileInfoCard icon={<Globe className="text-indigo-600" size={20} />} title={t("settings.languageSection")} value={language === "hi" ? "हिन्दी" : "English"} />
          <ProfileInfoCard icon={<User className="text-amber-600" size={20} />} title={t("profile.gender")} value={user?.profile?.gender || t("common.none")} />
        </div>

        {/* BMI Calculator */}
        <BMICalculator />

        {/* Health Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-3xl p-6 sm:p-8 border border-blue-100 dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
            <Info size={20} className="text-blue-600" />
            Health Reminders
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "💧 Drink 8 glasses of water daily",
              "🚶 Walk at least 30 minutes daily",
              "😴 Sleep 7-8 hours every night",
              "🥗 Eat fruits & vegetables daily",
              "🧘 Practice stress management",
              "🏥 Get annual health checkups",
            ].map((tip, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-700 rounded-xl p-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ProfileInfoCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
      <div className="flex gap-3 items-center">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="font-semibold dark:text-white text-sm">{value}</p>
        </div>
      </div>
    </div>
  );
}
