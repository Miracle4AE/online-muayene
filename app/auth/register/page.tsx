"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role") || "doctor";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Doktor form state
  const [doctorForm, setDoctorForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    licenseNumber: "",
    tcKimlikNo: "",
    bio: "",
    experience: "",
    hospital: "",
    university: "",
    graduationYear: "",
    workStatus: "",
    city: "",
  });

  // Belge yükleme state'leri
  const [documents, setDocuments] = useState<{
    diploma: File | null;
    ttbBelgesi: File | null;
    uzmanlikBelgesi: File | null;
    kimlikOn: File | null;
    kimlikArka: File | null;
  }>({
    diploma: null,
    ttbBelgesi: null,
    uzmanlikBelgesi: null,
    kimlikOn: null,
    kimlikArka: null,
  });

  const [uploadingDocs, setUploadingDocs] = useState(false);

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

  // Çalışma durumu seçenekleri
  const workStatusOptions = [
    "Tam Zamanlı",
    "Yarı Zamanlı",
    "Serbest",
    "Emekli",
  ];

  // Hasta form state
  const [patientForm, setPatientForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    tcKimlikNo: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    allergies: "",
  });

  // Alerji seçenekleri
  const allergyOptions = [
    "Penicillin",
    "Lateks",
    "Aspirin",
    "İyot",
    "Kontrast Madde",
    "Yumurta",
    "Süt",
    "Fındık",
    "Balık",
    "Soya",
  ];

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [showOtherAllergy, setShowOtherAllergy] = useState(false);
  const [otherAllergyText, setOtherAllergyText] = useState("");

  // Kronik rahatsızlık seçenekleri
  const chronicDiseaseOptions = [
    "Diyabet (Şeker Hastalığı)",
    "Hipertansiyon (Yüksek Tansiyon)",
    "Kalp Hastalıkları",
    "Astım",
    "KOAH",
    "Böbrek Hastalıkları",
    "Karaciğer Hastalıkları",
    "Tiroid Hastalıkları",
    "Romatizmal Hastalıklar",
    "Kanser",
    "Epilepsi",
    "Depresyon/Anksiyete",
  ];

  const [selectedPersonalChronicDiseases, setSelectedPersonalChronicDiseases] = useState<string[]>([]);
  const [showOtherPersonalChronic, setShowOtherPersonalChronic] = useState(false);
  const [otherPersonalChronicText, setOtherPersonalChronicText] = useState("");

  const [selectedFamilyChronicDiseases, setSelectedFamilyChronicDiseases] = useState<string[]>([]);
  const [showOtherFamilyChronic, setShowOtherFamilyChronic] = useState(false);
  const [otherFamilyChronicText, setOtherFamilyChronicText] = useState("");

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setUploadingDocs(true);

    try {
      // Önce doktor kaydını yap
      const response = await fetch("/api/auth/register/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...doctorForm,
          experience: doctorForm.experience
            ? parseInt(doctorForm.experience)
            : undefined,
          graduationYear: doctorForm.graduationYear
            ? parseInt(doctorForm.graduationYear)
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Kayıt işlemi başarısız");
        setLoading(false);
        setUploadingDocs(false);
        return;
      }

      // Doktor User ID'sini al (belge yükleme için userId kullanıyoruz)
      const doctorUserId = data.user?.id;
      if (!doctorUserId) {
        setError("Doktor ID alınamadı");
        setLoading(false);
        setUploadingDocs(false);
        return;
      }

      // Belgeleri yükle
      const documentTypes = [
        { key: "diploma", type: "DIPLOMA" },
        { key: "ttbBelgesi", type: "TTB_BELGESI" },
        { key: "uzmanlikBelgesi", type: "UZMANLIK_BELGESI" },
        { key: "kimlikOn", type: "KIMLIK_ON" },
        { key: "kimlikArka", type: "KIMLIK_ARKA" },
      ];

      const uploadPromises = documentTypes
        .filter((doc) => documents[doc.key as keyof typeof documents])
        .map(async (doc) => {
          const file = documents[doc.key as keyof typeof documents];
          if (!file) return null;

          const formData = new FormData();
          formData.append("file", file);
          formData.append("documentType", doc.type);
          formData.append("doctorId", doctorUserId);

          const uploadResponse = await fetch("/api/doctors/documents/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error(`${doc.type} yüklenemedi`);
          }

          const uploadData = await uploadResponse.json();
          return {
            documentType: doc.type,
            fileUrl: uploadData.fileUrl,
            fileName: uploadData.fileName,
          };
        });

      await Promise.all(uploadPromises);

      setSuccess(true);
      setUploadingDocs(false);
      setTimeout(() => {
        router.push("/auth/login?role=doctor");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const handleAllergyChange = (allergy: string) => {
    if (allergy === "Yok") {
      // "Yok" seçildiğinde diğer tüm seçimleri temizle
      setSelectedAllergies(["Yok"]);
      setShowOtherAllergy(false);
      setOtherAllergyText("");
      return;
    }

    if (allergy === "Diğer") {
      setShowOtherAllergy(!showOtherAllergy);
      if (showOtherAllergy) {
        setOtherAllergyText("");
        setSelectedAllergies(selectedAllergies.filter((a) => a !== "Diğer"));
      } else {
        // "Yok" seçiliyse kaldır
        const filtered = selectedAllergies.filter((a) => a !== "Yok");
        setSelectedAllergies([...filtered, "Diğer"]);
      }
      return;
    }

    // Normal seçenekler
    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== allergy));
    } else {
      // "Yok" seçiliyse kaldır
      const filtered = selectedAllergies.filter((a) => a !== "Yok");
      setSelectedAllergies([...filtered, allergy]);
    }
  };

  const handleChronicDiseaseChange = (
    disease: string,
    type: "personal" | "family"
  ) => {
    if (disease === "Yok") {
      // "Yok" seçildiğinde diğer tüm seçimleri temizle
      if (type === "personal") {
        setSelectedPersonalChronicDiseases(["Yok"]);
        setShowOtherPersonalChronic(false);
        setOtherPersonalChronicText("");
      } else {
        setSelectedFamilyChronicDiseases(["Yok"]);
        setShowOtherFamilyChronic(false);
        setOtherFamilyChronicText("");
      }
      return;
    }

    if (disease === "Diğer") {
      if (type === "personal") {
        setShowOtherPersonalChronic(!showOtherPersonalChronic);
        if (showOtherPersonalChronic) {
          setOtherPersonalChronicText("");
          setSelectedPersonalChronicDiseases(
            selectedPersonalChronicDiseases.filter((d) => d !== "Diğer")
          );
        } else {
          // "Yok" seçiliyse kaldır
          const filtered = selectedPersonalChronicDiseases.filter((d) => d !== "Yok");
          setSelectedPersonalChronicDiseases([...filtered, "Diğer"]);
        }
      } else {
        setShowOtherFamilyChronic(!showOtherFamilyChronic);
        if (showOtherFamilyChronic) {
          setOtherFamilyChronicText("");
          setSelectedFamilyChronicDiseases(
            selectedFamilyChronicDiseases.filter((d) => d !== "Diğer")
          );
        } else {
          // "Yok" seçiliyse kaldır
          const filtered = selectedFamilyChronicDiseases.filter((d) => d !== "Yok");
          setSelectedFamilyChronicDiseases([...filtered, "Diğer"]);
        }
      }
      return;
    }

    // Normal seçenekler
    if (type === "personal") {
      if (selectedPersonalChronicDiseases.includes(disease)) {
        setSelectedPersonalChronicDiseases(
          selectedPersonalChronicDiseases.filter((d) => d !== disease)
        );
      } else {
        // "Yok" seçiliyse kaldır
        const filtered = selectedPersonalChronicDiseases.filter((d) => d !== "Yok");
        setSelectedPersonalChronicDiseases([...filtered, disease]);
      }
    } else {
      if (selectedFamilyChronicDiseases.includes(disease)) {
        setSelectedFamilyChronicDiseases(
          selectedFamilyChronicDiseases.filter((d) => d !== disease)
        );
      } else {
        // "Yok" seçiliyse kaldır
        const filtered = selectedFamilyChronicDiseases.filter((d) => d !== "Yok");
        setSelectedFamilyChronicDiseases([...filtered, disease]);
      }
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Alerjileri birleştir
      let allergiesString = "";
      if (selectedAllergies.includes("Yok")) {
        allergiesString = "Yok";
      } else {
        const regularAllergies = selectedAllergies.filter((a) => a !== "Diğer");
        if (regularAllergies.length > 0) {
          allergiesString = regularAllergies.join(", ");
        }
        if (showOtherAllergy && otherAllergyText.trim()) {
          if (allergiesString) {
            allergiesString += `, ${otherAllergyText.trim()}`;
          } else {
            allergiesString = otherAllergyText.trim();
          }
        }
      }

      // Kronik rahatsızlıkları birleştir
      let chronicDiseasesString = "";
      
      // Kendisinde olanlar
      const personalRegular = selectedPersonalChronicDiseases.filter((d) => d !== "Diğer" && d !== "Yok");
      let personalDiseases = "";
      if (personalRegular.length > 0) {
        personalDiseases = `Kendisinde: ${personalRegular.join(", ")}`;
      }
      if (showOtherPersonalChronic && otherPersonalChronicText.trim()) {
        if (personalDiseases) {
          personalDiseases += `, ${otherPersonalChronicText.trim()}`;
        } else {
          personalDiseases = `Kendisinde: ${otherPersonalChronicText.trim()}`;
        }
      }
      if (selectedPersonalChronicDiseases.includes("Yok")) {
        personalDiseases = "Kendisinde: Yok";
      }

      // Ailesinde olanlar
      const familyRegular = selectedFamilyChronicDiseases.filter((d) => d !== "Diğer" && d !== "Yok");
      let familyDiseases = "";
      if (familyRegular.length > 0) {
        familyDiseases = `Ailesinde: ${familyRegular.join(", ")}`;
      }
      if (showOtherFamilyChronic && otherFamilyChronicText.trim()) {
        if (familyDiseases) {
          familyDiseases += `, ${otherFamilyChronicText.trim()}`;
        } else {
          familyDiseases = `Ailesinde: ${otherFamilyChronicText.trim()}`;
        }
      }
      if (selectedFamilyChronicDiseases.includes("Yok")) {
        familyDiseases = "Ailesinde: Yok";
      }

      // Birleştir
      if (personalDiseases && familyDiseases) {
        chronicDiseasesString = `${personalDiseases} | ${familyDiseases}`;
      } else if (personalDiseases) {
        chronicDiseasesString = personalDiseases;
      } else if (familyDiseases) {
        chronicDiseasesString = familyDiseases;
      }

      const response = await fetch("/api/auth/register/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...patientForm,
          allergies: allergiesString || undefined,
          chronicDiseases: chronicDiseasesString || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Kayıt işlemi başarısız");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login?role=patient");
      }, 2000);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">
            Kayıt Başarılı!
          </h2>
          <p className="text-primary-600">
            Giriş sayfasına yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 relative pb-12">
      <div className="flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            {role === "doctor" ? "Doktor Üyeliği" : "Hasta Üyeliği"}
          </h1>
          <p className="text-primary-600">
            Hesabınızı oluşturun
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {role === "doctor" ? (
          <form onSubmit={handleDoctorSubmit} className="space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Kişisel Bilgiler
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={doctorForm.name}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Şifre *
                  </label>
                  <input
                    type="password"
                    value={doctorForm.password}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, password: e.target.value })
                    }
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="En az 6 karakter"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={doctorForm.phone}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Mesleki Bilgiler */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mesleki Bilgiler
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Uzmanlık Alanı *
                  </label>
                  <select
                    value={doctorForm.specialization}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, specialization: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <option value="">Uzmanlık alanınızı seçiniz</option>
                    {specializationOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Lisans Numarası *
                  </label>
                  <input
                    type="text"
                    value={doctorForm.licenseNumber}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Lisans numaranız"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  T.C. Kimlik Numarası *
                </label>
                <input
                  type="text"
                  value={doctorForm.tcKimlikNo}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setDoctorForm({ ...doctorForm, tcKimlikNo: value });
                  }}
                  required
                  maxLength={11}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors font-mono"
                  placeholder="11 haneli T.C. Kimlik No"
                />
                <p className="text-xs text-gray-500 mt-1">11 haneli T.C. Kimlik Numarası giriniz</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Deneyim (Yıl) *
                  </label>
                  <input
                    type="number"
                    value={doctorForm.experience}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, experience: e.target.value })
                    }
                    required
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Yıl cinsinden deneyim"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Hastane/Klinik
                  </label>
                  <input
                    type="text"
                    value={doctorForm.hospital}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, hospital: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Çalıştığınız hastane veya klinik"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Mezun Olduğu Üniversite
                  </label>
                  <input
                    type="text"
                    value={doctorForm.university}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, university: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Üniversite adı"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Mezuniyet Yılı
                  </label>
                  <input
                    type="number"
                    value={doctorForm.graduationYear}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, graduationYear: e.target.value })
                    }
                    min="1950"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Örn: 2010"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Çalışma Durumu
                  </label>
                  <select
                    value={doctorForm.workStatus}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, workStatus: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <option value="">Seçiniz</option>
                    {workStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={doctorForm.city}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, city: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Çalıştığınız şehir"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Biyografi / Hakkında
                </label>
                <textarea
                  value={doctorForm.bio}
                  onChange={(e) =>
                    setDoctorForm({ ...doctorForm, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                  placeholder="Kendiniz, uzmanlık alanınız ve deneyimleriniz hakkında bilgi veriniz..."
                />
              </div>
            </div>

            {/* Belge Yükleme Bölümü */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Doğrulama Belgeleri
              </h3>
              <p className="text-sm text-gray-600 mb-4">Lütfen kimlik doğrulaması için gerekli belgeleri yükleyiniz. Belgeler admin tarafından incelendikten sonra hesabınız onaylanacaktır.</p>

              <div className="space-y-4">
                {/* Tıp Fakültesi Diploması */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Tıp Fakültesi Diploması *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocuments({ ...documents, diploma: file });
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {documents.diploma && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {documents.diploma.name}
                    </p>
                  )}
                </div>

                {/* TTB Üyelik Belgesi */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    TTB Üyelik Belgesi *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocuments({ ...documents, ttbBelgesi: file });
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {documents.ttbBelgesi && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {documents.ttbBelgesi.name}
                    </p>
                  )}
                </div>

                {/* Uzmanlık Belgesi (Opsiyonel) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Uzmanlık Belgesi (Varsa)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocuments({ ...documents, uzmanlikBelgesi: file });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {documents.uzmanlikBelgesi && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {documents.uzmanlikBelgesi.name}
                    </p>
                  )}
                </div>

                {/* Nüfus Cüzdanı / T.C. Kimlik Kartı - Ön Yüz */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Nüfus Cüzdanı / T.C. Kimlik Kartı (Ön Yüz) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocuments({ ...documents, kimlikOn: file });
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {documents.kimlikOn && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {documents.kimlikOn.name}
                    </p>
                  )}
                </div>

                {/* Nüfus Cüzdanı / T.C. Kimlik Kartı - Arka Yüz */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Nüfus Cüzdanı / T.C. Kimlik Kartı (Arka Yüz) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDocuments({ ...documents, kimlikArka: file });
                    }}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {documents.kimlikArka && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {documents.kimlikArka.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Doktor Kaydını Oluştur
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePatientSubmit} className="space-y-6">
            {/* Kişisel Bilgiler Bölümü */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Kişisel Bilgiler
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Şifre *
                  </label>
                  <input
                    type="password"
                    value={patientForm.password}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, password: e.target.value })
                    }
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="En az 6 karakter"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={patientForm.phone}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>

              {/* T.C. Kimlik Numarası */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  T.C. Kimlik Numarası *
                </label>
                <input
                  type="text"
                  value={patientForm.tcKimlikNo}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setPatientForm({ ...patientForm, tcKimlikNo: value });
                  }}
                  required
                  maxLength={11}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors font-mono text-lg tracking-wider"
                  placeholder="11 haneli T.C. Kimlik No"
                />
                <p className="text-xs text-gray-500 mt-1">11 haneli T.C. Kimlik Numarası giriniz</p>
              </div>
            </div>

            {/* Demografik Bilgiler */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Demografik Bilgiler
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Doğum Tarihi
                  </label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        dateOfBirth: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Cinsiyet
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, gender: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Adres
                </label>
                <textarea
                  value={patientForm.address}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, address: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                  placeholder="Tam adres bilgisi"
                />
              </div>
            </div>

            {/* Alerjiler Bölümü */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alerjik Durumlar
              </h3>
              <p className="text-sm text-gray-600 mb-4">Varsa lütfen alerjik durumlarınızı seçiniz</p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {allergyOptions.map((allergy) => (
                  <label
                    key={allergy}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAllergies.includes(allergy)
                        ? "bg-red-100 border-red-500 text-red-700"
                        : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAllergies.includes(allergy)}
                      onChange={() => handleAllergyChange(allergy)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">{allergy}</span>
                  </label>
                ))}
                
                {/* Diğer Seçeneği */}
                <label
                  className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAllergies.includes("Diğer")
                      ? "bg-red-100 border-red-500 text-red-700"
                      : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergies.includes("Diğer")}
                    onChange={() => handleAllergyChange("Diğer")}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Diğer</span>
                </label>

                {/* Yok Seçeneği */}
                <label
                  className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAllergies.includes("Yok")
                      ? "bg-green-100 border-green-500 text-green-700"
                      : "bg-white border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergies.includes("Yok")}
                    onChange={() => handleAllergyChange("Yok")}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Yok</span>
                </label>
              </div>

              {/* Diğer Alerji Textarea */}
              {showOtherAllergy && (
                <div className="mt-4 animate-fadeIn">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Diğer Alerji Detayı *
                  </label>
                  <textarea
                    value={otherAllergyText}
                    onChange={(e) => setOtherAllergyText(e.target.value)}
                    rows={3}
                    required={showOtherAllergy}
                    className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                    placeholder="Lütfen alerjinizi detaylı olarak yazınız..."
                  />
                </div>
              )}
            </div>

            {/* Kronik Rahatsızlıklar */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Kronik Rahatsızlıklar
              </h3>
              <p className="text-sm text-gray-600 mb-6">Kendinizde veya ailenizde olan kronik rahatsızlıkları belirtiniz</p>

              {/* Kendisinde Olan Kronik Rahatsızlıklar */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Kendisinde Olan Kronik Rahatsızlıklar
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {chronicDiseaseOptions.map((disease) => (
                    <label
                      key={`personal-${disease}`}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPersonalChronicDiseases.includes(disease)
                          ? "bg-purple-100 border-purple-500 text-purple-700"
                          : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPersonalChronicDiseases.includes(disease)}
                        onChange={() => handleChronicDiseaseChange(disease, "personal")}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">{disease}</span>
                    </label>
                  ))}
                  
                  {/* Diğer Seçeneği */}
                  <label
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPersonalChronicDiseases.includes("Diğer")
                        ? "bg-purple-100 border-purple-500 text-purple-700"
                        : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonalChronicDiseases.includes("Diğer")}
                      onChange={() => handleChronicDiseaseChange("Diğer", "personal")}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Diğer</span>
                  </label>

                  {/* Yok Seçeneği */}
                  <label
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPersonalChronicDiseases.includes("Yok")
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-white border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersonalChronicDiseases.includes("Yok")}
                      onChange={() => handleChronicDiseaseChange("Yok", "personal")}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Yok</span>
                  </label>
                </div>

                {/* Diğer Kronik Rahatsızlık Textarea (Kendisinde) */}
                {showOtherPersonalChronic && (
                  <div className="mt-4 animate-fadeIn">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Diğer Kronik Rahatsızlık Detayı (Kendisinde) *
                    </label>
                    <textarea
                      value={otherPersonalChronicText}
                      onChange={(e) => setOtherPersonalChronicText(e.target.value)}
                      rows={3}
                      required={showOtherPersonalChronic}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                      placeholder="Lütfen kronik rahatsızlığınızı detaylı olarak yazınız..."
                    />
                  </div>
                )}
              </div>

              {/* Ailesinde Olan Kronik Rahatsızlıklar */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Ailesinde Olan Kronik Rahatsızlıklar
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {chronicDiseaseOptions.map((disease) => (
                    <label
                      key={`family-${disease}`}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFamilyChronicDiseases.includes(disease)
                          ? "bg-pink-100 border-pink-500 text-pink-700"
                          : "bg-white border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFamilyChronicDiseases.includes(disease)}
                        onChange={() => handleChronicDiseaseChange(disease, "family")}
                        className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">{disease}</span>
                    </label>
                  ))}
                  
                  {/* Diğer Seçeneği */}
                  <label
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFamilyChronicDiseases.includes("Diğer")
                        ? "bg-pink-100 border-pink-500 text-pink-700"
                        : "bg-white border-gray-200 hover:border-pink-300 hover:bg-pink-50 text-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFamilyChronicDiseases.includes("Diğer")}
                      onChange={() => handleChronicDiseaseChange("Diğer", "family")}
                      className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Diğer</span>
                  </label>

                  {/* Yok Seçeneği */}
                  <label
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFamilyChronicDiseases.includes("Yok")
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-white border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFamilyChronicDiseases.includes("Yok")}
                      onChange={() => handleChronicDiseaseChange("Yok", "family")}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-inherit flex-1 min-w-0 break-words leading-tight">Yok</span>
                  </label>
                </div>

                {/* Diğer Kronik Rahatsızlık Textarea (Ailesinde) */}
                {showOtherFamilyChronic && (
                  <div className="mt-4 animate-fadeIn">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Diğer Kronik Rahatsızlık Detayı (Ailesinde) *
                    </label>
                    <textarea
                      value={otherFamilyChronicText}
                      onChange={(e) => setOtherFamilyChronicText(e.target.value)}
                      rows={3}
                      required={showOtherFamilyChronic}
                      className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                      placeholder="Lütfen ailenizdeki kronik rahatsızlığı detaylı olarak yazınız..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Acil Durum İletişim */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Acil Durum İletişim Bilgileri
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Acil Durum İletişim Kişisi
                  </label>
                  <input
                    type="text"
                    value={patientForm.emergencyContact}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        emergencyContact: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="Ad Soyad"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Acil Durum Telefonu
                  </label>
                  <input
                    type="tel"
                    value={patientForm.emergencyPhone}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        emergencyPhone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Hasta Kaydını Oluştur
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-primary-600 mb-2">Zaten hesabınız var mı?</p>
          <Link
            href={`/auth/login?role=${role}`}
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Giriş Yap
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-primary-500 hover:text-primary-700 text-sm"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
      </div>
      
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

