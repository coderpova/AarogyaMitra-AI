"use client";

import { UserProfile } from "@/lib/schemeMatcher";
import { locations } from "@/data/locations";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  formData: UserProfile;
  setFormData: React.Dispatch<React.SetStateAction<UserProfile>>;
  onSubmit: () => void;
}

export default function EligibilityForm({
  formData,
  setFormData,
  onSubmit,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-8 mt-8 border border-gray-100 dark:border-gray-800">
      <h2 className="text-3xl font-bold mb-2 dark:text-white">
        {t("schemes.checkEligibility")}
      </h2>

      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t("schemes.subtitle")}
      </p>

      <h3 className="text-xl font-semibold mb-5 dark:text-gray-200">
        {t("profile.personalDetails")}
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-2 font-medium dark:text-gray-200">
            {t("schemes.age")}
          </label>
          <input
            type="number"
            placeholder="e.g. 25"
            min="0"
            max="120"
            value={formData.age || ""}
            onChange={(e) => {
              const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
              setFormData({
                ...formData,
                age: val,
                seniorCitizen: val >= 60 ? true : formData.seniorCitizen,
              });
            }}
            className="w-full border rounded-xl p-3 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium dark:text-gray-200">
            {t("schemes.gender")}
          </label>

          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({
                ...formData,
                gender: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          >
            <option value="">{t("schemesExt.selectGender")}</option>
            <option value="male">{t("schemesExt.male")}</option>
            <option value="female">{t("schemesExt.female")}</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium dark:text-gray-200">
            {t("schemes.state")}
          </label>

          <select
            value={formData.state}
            onChange={(e) =>
              setFormData({
                ...formData,
                state: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          >
            <option value="">{t("schemesExt.selectState")}</option>
            {Object.keys(locations).map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium dark:text-gray-200">
            {t("schemes.income")}
          </label>

          <input
            type="number"
            placeholder="e.g. 250000"
            value={formData.income || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                income: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium dark:text-gray-200">
            {t("schemes.category")}
          </label>

          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          >
            <option value="">{t("schemesExt.selectCategory")}</option>
            <option value="General">{t("schemesExt.general")}</option>
            <option value="OBC">{t("schemesExt.obc")}</option>
            <option value="SC">{t("schemesExt.sc")}</option>
            <option value="ST">{t("schemesExt.st")}</option>
          </select>
        </div>
      </div>

      <h3 className="text-xl font-semibold mt-10 mb-5 dark:text-gray-200">
        Health Information
      </h3>

      <div className="grid md:grid-cols-3 gap-6">
        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer dark:border-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={formData.pregnant}
            onChange={(e) =>
              setFormData({
                ...formData,
                pregnant: e.target.checked,
              })
            }
          />
          <span>{t("schemesExt.pregnant")}</span>
        </label>

        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer dark:border-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={formData.seniorCitizen}
            onChange={(e) =>
              setFormData({
                ...formData,
                seniorCitizen: e.target.checked,
              })
            }
          />
          <span>{t("schemesExt.seniorCitizen")}</span>
        </label>

        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer dark:border-gray-700 dark:text-white">
          <input
            type="checkbox"
            checked={formData.disability}
            onChange={(e) =>
              setFormData({
                ...formData,
                disability: e.target.checked,
              })
            }
          />
          <span>{t("schemesExt.disability")}</span>
        </label>
      </div>

      <button
        onClick={onSubmit}
        className="w-full mt-10 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-lg font-semibold transition shadow-md"
      >
        {t("schemes.checkBtn")}
      </button>
    </div>
  );
}