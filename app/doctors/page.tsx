"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: {
    specialization: string;
    photoUrl: string | null;
    hospital: string | null;
    experience: number | null;
    averageRating: number;
    totalReviews: number;
  };
}

// Uzmanlık alanları (Türkiye'deki tıp uzmanlık alanları)
const specializationOptions = [
  "Acil Tıp",
  "Adli Tıp",
  "Aile Hekimliği",
  "Anesteziyoloji ve Reanimasyon",
  "Anatomi",
  "Beyin ve Sinir Cerrahisi",
  "Çocuk Cerrahisi",
  "Çocuk Sağlığı ve Hastalıkları",
  "Dermatoloji",
  "Enfeksiyon Hastalıkları",
  "Fizik Tedavi ve Rehabilitasyon",
  "Genel Cerrahi",
  "Göğüs Cerrahisi",
  "Göğüs Hastalıkları",
  "Göz Hastalıkları",
  "Halk Sağlığı",
  "İç Hastalıkları",
  "Kadın Hastalıkları ve Doğum",
  "Kalp ve Damar Cerrahisi",
  "Kardiyoloji",
  "Kulak Burun Boğaz",
  "Nöroloji",
  "Nükleer Tıp",
  "Ortopedi ve Travmatoloji",
  "Plastik, Rekonstrüktif ve Estetik Cerrahi",
  "Psikiyatri",
  "Radyoloji",
  "Tıbbi Genetik",
  "Tıbbi Onkoloji",
  "Üroloji",
];

export default function DoctorsPage() {
  const { data: session } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [city, setCity] = useState("");
  const [hospital, setHospital] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [hospitals, setHospitals] = useState<string[]>([]);

  useEffect(() => {
    fetchDoctors();
  }, [specialization, search, city, hospital]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (specialization) params.append("specialization", specialization);
      if (search) params.append("search", search);
      if (city) params.append("city", city);
      if (hospital) params.append("hospital", hospital);

      const response = await fetch(`/api/doctors?${params.toString()}`);
      if (!response.ok) throw new Error("Doktorlar yüklenemedi");
      const data = await response.json();
      setDoctors(data.doctors);
      
      // Filtre seçeneklerini güncelle
      if (data.filters) {
        setCities(data.filters.cities || []);
        setHospitals(data.filters.hospitals || []);
      }
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 relative pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link
              href={session?.user.role === "PATIENT" ? "/patient/dashboard" : "/"}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              ← Geri Dön
            </Link>
            <h1 className="text-2xl font-bold text-primary-900">Doktorlar</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Arama ve Filtre */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Arama
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim, uzmanlık veya hastane ara..."
                className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Uzmanlık Alanı
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
              >
                <option value="">Tüm Uzmanlık Alanları</option>
                {specializationOptions.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Şehir
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
              >
                <option value="">Tüm Şehirler</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Hastane
              </label>
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
              >
                <option value="">Tüm Hastaneler</option>
                {hospitals.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Doktor Listesi */}
        {loading ? (
          <div className="text-center py-12 text-primary-600">Yükleniyor...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-12 text-primary-600">
            Doktor bulunamadı
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col items-center text-center">
                  {doctor.profile.photoUrl ? (
                    <img
                      src={doctor.profile.photoUrl}
                      alt={doctor.name}
                      className="w-24 h-24 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                      <span className="text-3xl text-primary-600">
                        {doctor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-primary-900 mb-2">
                    {doctor.name}
                  </h3>
                  <p className="text-primary-600 mb-2">{doctor.profile.specialization}</p>
                  {doctor.profile.hospital && (
                    <p className="text-sm text-primary-500 mb-2">
                      🏥 {doctor.profile.hospital}
                    </p>
                  )}
                  {doctor.profile.experience && (
                    <p className="text-sm text-primary-500 mb-2">
                      💼 {doctor.profile.experience} yıl deneyim
                    </p>
                  )}
                  {doctor.profile.averageRating > 0 && (
                    <div className="mt-2">
                      <span className="text-yellow-500">
                        {"★".repeat(Math.round(doctor.profile.averageRating))}
                      </span>
                      <span className="text-primary-600 ml-2 text-sm">
                        {doctor.profile.averageRating.toFixed(1)} ({doctor.profile.totalReviews})
                      </span>
                    </div>
                  )}
                  <span className="mt-4 text-primary-600 hover:text-primary-700 font-semibold">
                    Profili Görüntüle →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3">
        <div className="flex justify-center items-center px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600">
            © 2025 Online Muayene
          </p>
        </div>
      </footer>
    </div>
  );
}

