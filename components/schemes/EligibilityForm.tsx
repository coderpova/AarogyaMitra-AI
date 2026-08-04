"use client";

import { UserProfile } from "@/lib/schemeMatcher";
import { locations } from "@/data/locations";

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
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-8 mt-8">

      <h2 className="text-3xl font-bold mb-2">
        Check Your Eligibility
      </h2>

      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Fill your details to find government healthcare schemes.
      </p>

      {/* Personal Details */}

      <h3 className="text-xl font-semibold mb-5">
        Personal Information
      </h3>

      <div className="grid md:grid-cols-2 gap-6">

        <div>
          <label className="block mb-2 font-medium">
            Age
          </label>

            <input
                type="number"
                placeholder="e.g. 25"
                value={formData.age || ""}
                onChange={(e) =>
                    setFormData({
                        ...formData,
                        age:
                        e.target.value === ""
                        ? 0
                        : Number(e.target.value),
                    })
                }
                className="w-full border rounded-xl p-3 dark:bg-gray-800"
            />

        </div>

        <div>
          <label className="block mb-2 font-medium">
            Gender
          </label>

          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({
                ...formData,
                gender: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
            <label className="block mb-2 font-medium">
            State
            </label>

                    <select
                        value={formData.state}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                state: e.target.value,
                            })
                        }
                        className="w-full border rounded-xl p-3 dark:bg-gray-800"
                    >
                        <option value="">
                            Select State
                            </option>

                            {Object.keys(locations).map((state) => (
                                <option
                                    key={state}
                                    value={state}
                                >
                                {state}
                                </option>
                            ))}
                    </select>
        </div>
        <div>
            <label className="block mb-2 font-medium">
                Annual Family Income
            </label>

            <input
                type="number"
                placeholder="e.g. 250000"
                value={formData.income || ""}
                onChange={(e) =>
                    setFormData({
                        ...formData,
                        income:
                        e.target.value === ""
                        ? 0
                        : Number(e.target.value),
                    })
                }
                className="w-full border rounded-xl p-3 dark:bg-gray-800"
            />
        </div>


        <div>
          <label className="block mb-2 font-medium">
            Category
          </label>

          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value,
              })
            }
            className="w-full border rounded-xl p-3 dark:bg-gray-800"
          >
            <option value="">Select Category</option>
            <option>General</option>
            <option>OBC</option>
            <option>SC</option>
            <option>ST</option>
          </select>
        </div>

      </div>

      {/* Health Information */}

      <h3 className="text-xl font-semibold mt-10 mb-5">
        Health Information
      </h3>

      <div className="grid md:grid-cols-3 gap-6">

        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer">

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

          Pregnant
        </label>

        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer">

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

          Senior Citizen
        </label>

        <label className="flex items-center gap-3 border rounded-xl p-4 cursor-pointer">

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

          Disability
        </label>

      </div>

      <button
        onClick={onSubmit}
        className="
          w-full
          mt-10
          bg-blue-600
          hover:bg-blue-700
          text-white
          py-4
          rounded-2xl
          text-lg
          font-semibold
          transition
        "
      >
        Check Eligibility
      </button>

    </div>
  );
}