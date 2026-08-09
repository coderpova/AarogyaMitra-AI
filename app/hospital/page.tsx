"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchBar from "@/components/hospital/SearchBar";
import HospitalCard from "@/components/hospital/HospitalCard";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { locations } from "@/data/locations";
import { useLanguage } from "@/context/LanguageContext";

interface Hospital {
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  category?: string;
  distance?: number;
}

export default function HospitalPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findHospitals = async () => {
    setLoading(true);
    setError("");

    if (state && !city) {
      setError("Please select city");
      setLoading(false);
      return;
    }

    try {
      let lat = "";
      let lon = "";

      if (state && city) {
        const locationResponse = await fetch(
          `/api/location?city=${city}&state=${state}`
        );
        const locationData = await locationResponse.json();

        if (!locationData.lat || !locationData.lon) {
          setError("Location not found");
          setLoading(false);
          return;
        }

        lat = locationData.lat;
        lon = locationData.lon;
      } else {
        if (!navigator.geolocation) {
          setError("Location is not supported");
          setLoading(false);
          return;
        }

        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        lat = position.coords.latitude;
        lon = position.coords.longitude;
      }

      const response = await fetch(`/api/hospitals?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      setHospitals(data.hospitals || []);
    } catch (error) {
      console.log(error);
      setError("Unable to fetch hospitals");
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = [...hospitals]
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    .filter((hospital) =>
      hospital.name.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <DashboardLayout>
      <div className="page-animation space-y-6">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold">
            {t("hospitals.title")}
          </h1>
          <p className="text-blue-100 mt-2">{t("hospitals.subtitle")}</p>
        </div>

        {/* State City Selection */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity("");
              setHospitals([]);
            }}
            className="p-3 rounded-xl border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          >
            <option value="">Select State</option>
            {Object.keys(locations).map((item: string) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setHospitals([]);
            }}
            className="p-3 rounded-xl border dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-700"
          >
            <option value="">Select City</option>
            {state &&
              locations[state].map((item: string) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>
        </div>

        {/* Search + Button */}
        <div className="mt-8 flex gap-4 items-center">
          <div className="flex-1">
            <SearchBar search={search} setSearch={setSearch} />
          </div>

          <button
            onClick={findHospitals}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-medium transition shadow-md shrink-0"
          >
            {loading
              ? t("common.loading")
              : state && city
              ? t("common.search")
              : t("common.search")}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        {/* Hospital List */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hospital, index) => (
              <HospitalCard key={index} hospital={hospital} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <MapPin className="mx-auto mb-2 text-gray-300 dark:text-gray-700 animate-pulse" size={36} />
              <p className="font-semibold text-sm">No hospital listings shown</p>
              <p className="text-xs text-gray-400 mt-1">Select state and city parameters, then search to discover local care facilities.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}