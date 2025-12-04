"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: {
    tcKimlikNo: string;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    bloodType: string | null;
    allergies: string | null;
    chronicDiseases: string | null;
    medications: string | null;
    shareDataWithSameHospital: boolean;
    shareDataWithOtherHospitals: boolean;
  };
}

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

export default function PatientProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  const [formData, setFormData] = useState({
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    bloodType: "",
    medications: "",
  });

  // Alerji state'leri
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [showOtherAllergy, setShowOtherAllergy] = useState(false);
  const [otherAllergyText, setOtherAllergyText] = useState("");

  // Kronik rahatsızlık state'leri
  const [selectedPersonalChronicDiseases, setSelectedPersonalChronicDiseases] = useState<string[]>([]);
  const [showOtherPersonalChronic, setShowOtherPersonalChronic] = useState(false);
  const [otherPersonalChronicText, setOtherPersonalChronicText] = useState("");

  const [selectedFamilyChronicDiseases, setSelectedFamilyChronicDiseases] = useState<string[]>([]);
  const [showOtherFamilyChronic, setShowOtherFamilyChronic] = useState(false);
  const [otherFamilyChronicText, setOtherFamilyChronicText] = useState("");

  // Veri paylaşımı izinleri
  const [shareDataWithSameHospital, setShareDataWithSameHospital] = useState(false);
  const [shareDataWithOtherHospitals, setShareDataWithOtherHospitals] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentType, setConsentType] = useState<"same" | "other" | null>(null);
  const [consentAction, setConsentAction] = useState<"enable" | "disable" | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?role=patient");
    } else if (status === "authenticated" && session?.user.role !== "PATIENT") {
      router.push("/");
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session && session.user.role === "PATIENT") {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const parseAllergies = (allergiesString: string | null) => {
    if (!allergiesString) return;
    
    if (allergiesString === "Yok") {
      setSelectedAllergies(["Yok"]);
      return;
    }

    const parts = allergiesString.split(", ");
    const regular: string[] = [];
    let otherText = "";

    parts.forEach((part) => {
      if (allergyOptions.includes(part)) {
        regular.push(part);
      } else if (part.trim()) {
        otherText = part.trim();
      }
    });

    if (regular.length > 0) {
      setSelectedAllergies(regular);
    }
    if (otherText) {
      setSelectedAllergies((prev) => [...prev, "Diğer"]);
      setShowOtherAllergy(true);
      setOtherAllergyText(otherText);
    }
  };

  const parseChronicDiseases = (chronicDiseasesString: string | null) => {
    if (!chronicDiseasesString) return;

    const parts = chronicDiseasesString.split(" | ");
    let personalPart = "";
    let familyPart = "";

    parts.forEach((part) => {
      if (part.startsWith("Kendisinde:")) {
        personalPart = part.replace("Kendisinde: ", "");
      } else if (part.startsWith("Ailesinde:")) {
        familyPart = part.replace("Ailesinde: ", "");
      }
    });

    // Kendisinde olanlar
    if (personalPart) {
      if (personalPart === "Yok") {
        setSelectedPersonalChronicDiseases(["Yok"]);
      } else {
        const personalParts = personalPart.split(", ");
        const regular: string[] = [];
        let otherText = "";

        personalParts.forEach((p) => {
          if (chronicDiseaseOptions.includes(p)) {
            regular.push(p);
          } else if (p.trim()) {
            otherText = p.trim();
          }
        });

        if (regular.length > 0) {
          setSelectedPersonalChronicDiseases(regular);
        }
        if (otherText) {
          setSelectedPersonalChronicDiseases((prev) => [...prev, "Diğer"]);
          setShowOtherPersonalChronic(true);
          setOtherPersonalChronicText(otherText);
        }
      }
    }

    // Ailesinde olanlar
    if (familyPart) {
      if (familyPart === "Yok") {
        setSelectedFamilyChronicDiseases(["Yok"]);
      } else {
        const familyParts = familyPart.split(", ");
        const regular: string[] = [];
        let otherText = "";

        familyParts.forEach((p) => {
          if (chronicDiseaseOptions.includes(p)) {
            regular.push(p);
          } else if (p.trim()) {
            otherText = p.trim();
          }
        });

        if (regular.length > 0) {
          setSelectedFamilyChronicDiseases(regular);
        }
        if (otherText) {
          setSelectedFamilyChronicDiseases((prev) => [...prev, "Diğer"]);
          setShowOtherFamilyChronic(true);
          setOtherFamilyChronicText(otherText);
        }
      }
    }
  };

  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) {
        setError("Oturum bilgisi bulunamadı");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/patients/profile", {
        credentials: "include",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || "Profil yüklenemedi";
        console.error("API Error:", errorData);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      const profileData: PatientProfile = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        profile: {
          tcKimlikNo: data.profile?.tcKimlikNo || "",
          dateOfBirth: data.profile?.dateOfBirth || null,
          gender: data.profile?.gender || null,
          address: data.profile?.address || null,
          emergencyContact: data.profile?.emergencyContact || null,
          emergencyPhone: data.profile?.emergencyPhone || null,
          bloodType: data.profile?.bloodType || null,
          allergies: data.profile?.allergies || null,
          chronicDiseases: data.profile?.chronicDiseases || null,
          medications: data.profile?.medications || null,
          shareDataWithSameHospital: data.profile?.shareDataWithSameHospital || false,
          shareDataWithOtherHospitals: data.profile?.shareDataWithOtherHospitals || false,
        },
      };

      setProfile(profileData);
      setFormData({
        phone: profileData.phone ?? "",
        dateOfBirth: profileData.profile.dateOfBirth 
          ? new Date(profileData.profile.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: profileData.profile.gender ?? "",
        address: profileData.profile.address ?? "",
        emergencyContact: profileData.profile.emergencyContact ?? "",
        emergencyPhone: profileData.profile.emergencyPhone ?? "",
        bloodType: profileData.profile.bloodType ?? "",
        medications: profileData.profile.medications ?? "",
      });

      // Alerjileri ve kronik rahatsızlıkları parse et
      parseAllergies(profileData.profile.allergies);
      parseChronicDiseases(profileData.profile.chronicDiseases);

      // Veri paylaşımı izinlerini set et
      setShareDataWithSameHospital(profileData.profile.shareDataWithSameHospital || false);
      setShareDataWithOtherHospitals(profileData.profile.shareDataWithOtherHospitals || false);

      setLoading(false);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Profil yüklenirken bir hata oluştu");
      setLoading(false);
    }
  };

  const handleAllergyChange = (allergy: string) => {
    if (allergy === "Yok") {
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
        const filtered = selectedAllergies.filter((a) => a !== "Yok");
        setSelectedAllergies([...filtered, "Diğer"]);
      }
      return;
    }

    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== allergy));
    } else {
      const filtered = selectedAllergies.filter((a) => a !== "Yok");
      setSelectedAllergies([...filtered, allergy]);
    }
  };

  const handleChronicDiseaseChange = (
    disease: string,
    type: "personal" | "family"
  ) => {
    if (disease === "Yok") {
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
          const filtered = selectedFamilyChronicDiseases.filter((d) => d !== "Yok");
          setSelectedFamilyChronicDiseases([...filtered, "Diğer"]);
        }
      }
      return;
    }

    if (type === "personal") {
      if (selectedPersonalChronicDiseases.includes(disease)) {
        setSelectedPersonalChronicDiseases(
          selectedPersonalChronicDiseases.filter((d) => d !== disease)
        );
      } else {
        const filtered = selectedPersonalChronicDiseases.filter((d) => d !== "Yok");
        setSelectedPersonalChronicDiseases([...filtered, disease]);
      }
    } else {
      if (selectedFamilyChronicDiseases.includes(disease)) {
        setSelectedFamilyChronicDiseases(
          selectedFamilyChronicDiseases.filter((d) => d !== disease)
        );
      } else {
        const filtered = selectedFamilyChronicDiseases.filter((d) => d !== "Yok");
        setSelectedFamilyChronicDiseases([...filtered, disease]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      if (!session?.user?.id) {
        setError("Oturum bilgisi bulunamadı");
        setSaving(false);
        return;
      }

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

      const response = await fetch("/api/patients/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        body: JSON.stringify({
          phone: formData.phone && formData.phone.trim() !== "" ? formData.phone : undefined,
          dateOfBirth: formData.dateOfBirth && formData.dateOfBirth.trim() !== "" ? formData.dateOfBirth : undefined,
          gender: formData.gender && formData.gender.trim() !== "" ? formData.gender : undefined,
          address: formData.address && formData.address.trim() !== "" ? formData.address : undefined,
          emergencyContact: formData.emergencyContact && formData.emergencyContact.trim() !== "" ? formData.emergencyContact : undefined,
          emergencyPhone: formData.emergencyPhone && formData.emergencyPhone.trim() !== "" ? formData.emergencyPhone : undefined,
          bloodType: formData.bloodType && formData.bloodType.trim() !== "" ? formData.bloodType : undefined,
          medications: formData.medications && formData.medications.trim() !== "" ? formData.medications : undefined,
          allergies: allergiesString || undefined,
          chronicDiseases: chronicDiseasesString || undefined,
          shareDataWithSameHospital: shareDataWithSameHospital,
          shareDataWithOtherHospitals: shareDataWithOtherHospitals,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "Profil güncellenemedi";
        if (data.details && Array.isArray(data.details)) {
          errorMessage += ": " + data.details.map((d: any) => `${d.field}: ${d.message}`).join(", ");
        }
        setError(errorMessage);
        setSaving(false);
        return;
      }

      setSuccess(true);
      await fetchProfile();
      setSaving(false);
      
      // Başarı modal'ını göster
      setShowSuccessModal(true);
      
      // 2 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        router.push("/patient/dashboard");
      }, 2000);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setSaving(false);
    }
  };

  const handleToggleShareData = (type: "same" | "other", currentValue: boolean) => {
    setConsentType(type);
    setConsentAction(currentValue ? "disable" : "enable");
    setShowConsentModal(true);
  };

  const confirmConsent = async () => {
    try {
      if (!session?.user?.id) {
        setError("Oturum bilgisi bulunamadı");
        setShowConsentModal(false);
        return;
      }

      const newValue = consentAction === "enable";
      const fieldName = consentType === "same" ? "shareDataWithSameHospital" : "shareDataWithOtherHospitals";

      const response = await fetch("/api/patients/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        body: JSON.stringify({
          [fieldName]: newValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "İzin güncellenemedi");
        setShowConsentModal(false);
        return;
      }

      // State'i güncelle
      if (consentType === "same") {
        setShareDataWithSameHospital(newValue);
      } else {
        setShareDataWithOtherHospitals(newValue);
      }

      setSuccess(true);
      await fetchProfile();
      setShowConsentModal(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setShowConsentModal(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "PATIENT") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative pb-12">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link
              href="/patient/dashboard"
              className="text-white/90 hover:text-white flex items-center gap-2 transition-colors font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard'a Dön
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profil Düzenle
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 11.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Profil başarıyla güncellendi!
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Profil Header Card */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-2xl p-8 text-white">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-40 h-40 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-2xl">
                  <svg className="w-20 h-20 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-bold mb-2">{profile.name}</h2>
                  <p className="text-blue-100 text-lg mb-4 flex items-center justify-center md:justify-start gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {profile.email}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-white/80">T.C. Kimlik No</p>
                      <p className="text-xl font-bold font-mono">{profile.profile.tcKimlikNo}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-white/80">Telefon</p>
                      <p className="text-xl font-bold">{profile.phone || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="mb-6 pb-4 border-b">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Profil Bilgilerini Düzenle
                </h3>
                <p className="text-gray-600 mt-2">Kişisel ve tıbbi bilgilerinizi güncelleyin</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Kişisel Bilgiler */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Kişisel Bilgiler
                  </h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Doğum Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Cinsiyet
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Kan Grubu
                      </label>
                      <select
                        value={formData.bloodType}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bloodType: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <option value="">Seçiniz</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="0+">0+</option>
                        <option value="0-">0-</option>
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
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                      placeholder="Tam adres bilgisi"
                    />
                  </div>
                </div>

                {/* Acil Durum İletişim */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Acil Durum İletişim Bilgileri
                  </h4>

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
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContact: e.target.value }))}
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
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, emergencyPhone: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                  </div>
                </div>

                {/* Alerjiler Bölümü */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Alerjik Durumlar
                  </h4>
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
                  <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Kronik Rahatsızlıklar
                  </h4>
                  <p className="text-sm text-gray-600 mb-6">Kendinizde veya ailenizde olan kronik rahatsızlıkları belirtiniz</p>

                  {/* Kendisinde Olan */}
                  <div className="mb-6">
                    <h5 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Kendisinde Olan Kronik Rahatsızlıklar
                    </h5>
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

                  {/* Ailesinde Olan */}
                  <div>
                    <h5 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Ailesinde Olan Kronik Rahatsızlıklar
                    </h5>
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

                {/* Kullandığı İlaçlar */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Kullandığı İlaçlar
                  </h4>
                  <textarea
                    value={formData.medications}
                    onChange={(e) => setFormData((prev) => ({ ...prev, medications: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white hover:bg-gray-50 transition-colors resize-none"
                    placeholder="Düzenli olarak kullandığınız ilaçları yazınız..."
                  />
                </div>

                {/* Veri Paylaşımı İzinleri */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Veri Paylaşımı İzinleri
                  </h4>
                  <p className="text-sm text-gray-600 mb-6">
                    Tıbbi bilgilerinizin (tahlil, rapor, doktor notları vb.) doktorlar tarafından görüntülenmesi için izin verin.
                  </p>

                  <div className="space-y-4">
                    {/* Aynı Hastane İzni */}
                    <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-purple-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Aynı Hastane İçindeki Doktorlara Paylaşım
                          </h5>
                          <p className="text-sm text-gray-600">
                            Aynı hastane içindeki doktorlar, önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını görebilir.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleShareData("same", shareDataWithSameHospital)}
                          className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ml-4 ${
                            shareDataWithSameHospital ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              shareDataWithSameHospital ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <div className={`mt-3 text-xs font-medium ${
                        shareDataWithSameHospital ? "text-green-700" : "text-gray-500"
                      }`}>
                        {shareDataWithSameHospital ? "✓ Aktif - Aynı hastane doktorları bilgilerinizi görebilir" : "✗ Pasif - Aynı hastane doktorları bilgilerinizi göremez"}
                      </div>
                    </div>

                    {/* Farklı Hastaneler İzni */}
                    <div className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-purple-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Farklı Hastanelerdeki Doktorlara Paylaşım
                          </h5>
                          <p className="text-sm text-gray-600">
                            Farklı hastanelerdeki doktorlar, önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını görebilir.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleShareData("other", shareDataWithOtherHospitals)}
                          className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ml-4 ${
                            shareDataWithOtherHospitals ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              shareDataWithOtherHospitals ? "translate-x-6" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <div className={`mt-3 text-xs font-medium ${
                        shareDataWithOtherHospitals ? "text-green-700" : "text-gray-500"
                      }`}>
                        {shareDataWithOtherHospitals ? "✓ Aktif - Farklı hastane doktorları bilgilerinizi görebilir" : "✗ Pasif - Farklı hastane doktorları bilgilerinizi göremez"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {saving ? (
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
                        Değişiklikleri Kaydet
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Onay Modal */}
        {showConsentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    consentAction === "enable" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <svg className={`w-6 h-6 ${
                      consentAction === "enable" ? "text-green-600" : "text-red-600"
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {consentAction === "enable" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {consentAction === "enable" ? "İzni Aktif Et" : "İzni Kapat"}
                  </h3>
                </div>

                <div className="mb-6">
                  {consentAction === "enable" ? (
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">
                          {consentType === "same" 
                            ? "Aynı hastane içindeki doktorlara" 
                            : "Farklı hastanelerdeki doktorlara"}
                        </strong> veri paylaşımı iznini aktif etmek istediğinize emin misiniz?
                      </p>
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ Aktif edildiğinde, {consentType === "same" 
                            ? "aynı hastane içindeki doktorlar" 
                            : "farklı hastanelerdeki doktorlar"} önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını görebilecektir.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">
                          {consentType === "same" 
                            ? "Aynı hastane içindeki doktorlara" 
                            : "Farklı hastanelerdeki doktorlara"}
                        </strong> veri paylaşımı iznini kapatmak istediğinize emin misiniz?
                      </p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">
                          ✗ Kapatıldığında, {consentType === "same" 
                            ? "aynı hastane içindeki doktorlar" 
                            : "farklı hastanelerdeki doktorlar"} önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını <strong>göremeyecektir</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConsentModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmConsent}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all ${
                      consentAction === "enable"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {consentAction === "enable" ? "Aktif Et" : "Kapat"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Başarı Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Değişiklikler Kaydedildi</h3>
                <p className="text-gray-600 mb-6">Ana sayfaya yönlendiriliyorsunuz...</p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              </div>
            </div>
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

