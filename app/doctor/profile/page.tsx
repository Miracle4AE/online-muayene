"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile: {
    specialization: string;
    licenseNumber: string;
    bio: string | null;
    experience: number | null;
    photoUrl: string | null;
    hospital: string | null;
    averageRating: number;
    totalReviews: number;
  };
}

export default function DoctorProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    specialization: "",
    bio: "",
    experience: "",
    photoUrl: "",
    hospital: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?role=doctor");
    } else if (status === "authenticated" && session?.user.role !== "DOCTOR") {
      router.push("/");
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session && session.user.role === "DOCTOR") {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) {
        setError("Oturum bilgisi bulunamadı");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/doctors/profile", {
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
      setProfile(data);
      setFormData({
        specialization: data.profile.specialization ?? "",
        bio: data.profile.bio ?? "",
        experience: data.profile.experience?.toString() ?? "",
        photoUrl: data.profile.photoUrl ?? "",
        hospital: data.profile.hospital ?? "",
      });
      
      // Fotoğraf varsa preview'ı ayarla
      if (data.profile.photoUrl) {
        setPreview(data.profile.photoUrl);
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Profil yüklenirken bir hata oluştu");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!file.type.startsWith("image/")) {
      setError("Sadece resim dosyaları yüklenebilir");
      return;
    }

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Önizleme oluştur
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Dosyayı yükle
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dosya yüklenemedi");
      }

      // Başarılı - URL'i form'a ekle
      const newPhotoUrl = data.url || "";
      
      // FormData'yı güncelle
      const updatedFormData = {
        ...formData,
        photoUrl: newPhotoUrl
      };
      setFormData(updatedFormData);
      
      // Otomatik olarak profili güncelle (mevcut form verileriyle birlikte)
      if (session?.user?.id) {
        // Async olarak kaydet (await kullanmadan, arka planda çalışsın)
        fetch("/api/doctors/profile", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": session.user.id,
            "x-user-role": session.user.role,
          },
              body: JSON.stringify({
                specialization: updatedFormData.specialization && updatedFormData.specialization.trim() !== "" 
                  ? updatedFormData.specialization 
                  : undefined,
                bio: updatedFormData.bio && updatedFormData.bio.trim() !== "" 
                  ? updatedFormData.bio 
                  : undefined,
                experience: updatedFormData.experience && updatedFormData.experience.trim() !== "" 
                  ? (() => {
                      const num = parseInt(updatedFormData.experience, 10);
                      return isNaN(num) || num <= 0 ? undefined : num;
                    })()
                  : undefined,
                photoUrl: newPhotoUrl && newPhotoUrl.trim() !== "" 
                  ? newPhotoUrl 
                  : undefined,
                hospital: updatedFormData.hospital && updatedFormData.hospital.trim() !== "" 
                  ? updatedFormData.hospital 
                  : undefined,
              }),
        })
        .then(async (updateResponse) => {
          if (updateResponse.ok) {
            setSuccess(true);
            setError(""); // Hataları temizle
            // Profili yeniden yükle
            await fetchProfile();
            setTimeout(() => setSuccess(false), 3000);
          } else {
            const updateData = await updateResponse.json();
            let errorMsg = updateData.error || "Profil güncellenemedi";
            if (updateData.details && Array.isArray(updateData.details)) {
              errorMsg += ": " + updateData.details.map((d: any) => `${d.field}: ${d.message}`).join(", ");
            }
            setError(errorMsg);
          }
        })
        .catch((updateErr) => {
          console.error("Auto-save error:", updateErr);
          setError("Fotoğraf yüklendi ancak kaydedilirken bir hata oluştu. Lütfen 'Kaydet' butonuna basın.");
        });
      }
    } catch (err: any) {
      setError(err.message || "Dosya yüklenirken bir hata oluştu");
      setPreview(null);
    } finally {
      setUploading(false);
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

      const response = await fetch("/api/doctors/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        body: JSON.stringify({
          specialization: formData.specialization && formData.specialization.trim() !== "" 
            ? formData.specialization 
            : undefined,
          bio: formData.bio && formData.bio.trim() !== "" 
            ? formData.bio 
            : undefined,
          experience: formData.experience && formData.experience.trim() !== "" 
            ? (() => {
                const num = parseInt(formData.experience, 10);
                return isNaN(num) || num <= 0 ? undefined : num;
              })()
            : undefined,
          photoUrl: formData.photoUrl && formData.photoUrl.trim() !== "" 
            ? formData.photoUrl 
            : undefined,
          hospital: formData.hospital && formData.hospital.trim() !== "" 
            ? formData.hospital 
            : undefined,
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
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!session || session.user.role !== "DOCTOR") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative pb-12">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link
              href="/doctor/dashboard"
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
                {/* Profil Fotoğrafı */}
                <label htmlFor="photo-upload" className="relative group cursor-pointer flex-shrink-0">
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <div className="relative">
                    {preview || formData.photoUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview || formData.photoUrl || ""}
                          alt={profile.name}
                          className="w-40 h-40 rounded-2xl object-cover border-4 border-white/30 shadow-2xl transition-all group-hover:scale-105 group-hover:border-white/50"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-2xl transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                            <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-white/40 shadow-2xl transition-all group-hover:border-white/60 group-hover:bg-white/30">
                        {uploading ? (
                          <svg className="animate-spin h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <>
                            <svg className="w-16 h-16 text-white/80 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="text-sm text-white font-semibold">Fotoğraf Ekle</span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Silme Butonu */}
                    {(preview || formData.photoUrl) && !uploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreview(null);
                          setFormData((prev) => ({ ...prev, photoUrl: "" }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors shadow-xl z-10 border-2 border-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </label>

                {/* Profil Bilgileri */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-4xl font-bold mb-2">{profile.name}</h2>
                  <p className="text-blue-100 text-lg mb-4 flex items-center justify-center md:justify-start gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {profile.email}
                  </p>
                  
                  {profile.profile.averageRating > 0 && (
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-6 h-6 ${i < Math.round(profile.profile.averageRating) ? 'text-yellow-400' : 'text-white/30'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-white/90 font-semibold">
                        {profile.profile.averageRating.toFixed(1)}
                      </span>
                      <span className="text-white/70">
                        ({profile.profile.totalReviews} değerlendirme)
                      </span>
                    </div>
                  )}

                  {/* İstatistikler */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{profile.profile.totalReviews || 0}</p>
                      <p className="text-xs text-white/80">Yorum</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">{formData.experience || 0}</p>
                      <p className="text-xs text-white/80">Yıl Deneyim</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-2xl font-bold">248</p>
                      <p className="text-xs text-white/80">Hasta</p>
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
                <p className="text-gray-600 mt-2">Hesap bilgilerinizi ve profesyonel detaylarınızı güncelleyin</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Uzmanlık ve Deneyim */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Uzmanlık Alanı *
                    </label>
                    <input
                      type="text"
                      value={formData.specialization ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, specialization: e.target.value }))
                      }
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-gray-50 hover:bg-white transition-colors"
                      placeholder="Örn: Kardiyoloji, Nöroloji"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Deneyim (Yıl)
                    </label>
                    <input
                      type="number"
                      value={formData.experience ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, experience: e.target.value }))
                      }
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-gray-50 hover:bg-white transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Hastane */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Çalıştığı Hastane
                  </label>
                  <input
                    type="text"
                    value={formData.hospital ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hospital: e.target.value }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 bg-gray-50 hover:bg-white transition-colors"
                    placeholder="Örn: Acıbadem Hastanesi"
                  />
                </div>

                {/* Hakkımda */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Hakkımda
                  </label>
                  <textarea
                    value={formData.bio ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-gray-900 bg-gray-50 hover:bg-white transition-colors resize-none"
                    placeholder="Kendiniz hakkında detaylı bilgi verin. Eğitim geçmişiniz, uzmanlık alanlarınız, özel ilgi alanlarınız ve deneyimleriniz hakkında yazabilirsiniz..."
                  />
                  <p className="text-xs text-gray-500">Bu bilgiler hasta profilinizde görüntülenecektir</p>
                </div>

                {/* Action Buttons */}
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
                  <Link
                    href={`/doctors/${profile.id}`}
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Profilimi Görüntüle
                  </Link>
                </div>
              </form>
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

