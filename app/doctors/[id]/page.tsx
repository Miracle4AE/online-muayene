"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  patient: {
    id: string;
    name: string;
  };
}

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
    appointmentPrice: number | null;
    averageRating: number;
    totalReviews: number;
    reviews: Review[];
  };
}

export default function DoctorPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showSuccess, showError } = useToast();
  const doctorId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [error, setError] = useState("");

  // Yorum formu (sadece hasta için)
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Randevu formu
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentStep, setAppointmentStep] = useState(1); // 1: Randevu bilgileri, 2: Onay metni, 3: Ödeme
  const [appointmentForm, setAppointmentForm] = useState({
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  });
  const [appointmentFiles, setAppointmentFiles] = useState<Array<{
    file: File;
    title: string;
    type: string;
  }>>([]);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  
  // Ödeme formu
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Favori doktor state
  const [isFavorite, setIsFavorite] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(true);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  
  // Doktor ücreti (doktor profilinden alınır, yoksa varsayılan 500 TL)
  const appointmentPrice = doctor?.profile.appointmentPrice || 500;

  // 08:00 - 17:00 arası 15 dakikalık randevu slotları oluştur
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const nextMinute = minute + 15;
        const endHourValue = nextMinute >= 60 ? hour + 1 : hour;
        const endMinuteValue = nextMinute >= 60 ? nextMinute - 60 : nextMinute;
        const endTimeString = `${endHourValue.toString().padStart(2, "0")}:${endMinuteValue.toString().padStart(2, "0")}`;
        
        // 17:00'dan sonrasını ekleme
        if (hour === endHour - 1 && minute === 45) {
          slots.push({
            value: timeString,
            label: `${timeString} - ${endTimeString}`,
          });
          break;
        }
        
        slots.push({
          value: timeString,
          label: `${timeString} - ${endTimeString}`,
        });
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    fetchDoctorProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    if (session?.user?.role === "PATIENT" && doctorId) {
      checkFavoriteStatus();
    } else {
      setCheckingFavorite(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, doctorId]);

  const checkFavoriteStatus = async () => {
    if (!session?.user?.id) return;
    
    try {
      setCheckingFavorite(true);
      const response = await fetch("/api/patients/favorites", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role || "",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const isFav = data.favorites?.some((fav: any) => fav.doctorId === doctorId);
        setIsFavorite(isFav || false);
      }
    } catch (error) {
      console.error("Favori durumu kontrol edilemedi:", error);
    } finally {
      setCheckingFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!session?.user?.id || !session.user.role || session.user.role !== "PATIENT") {
      showError("Favorilere eklemek için hasta olarak giriş yapmalısınız");
      return;
    }

    setTogglingFavorite(true);
    try {
      const endpoint = isFavorite ? "/api/patients/favorites/remove" : "/api/patients/favorites/add";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
        body: JSON.stringify({
          doctorId: doctorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "İşlem başarısız");
      }

      setIsFavorite(!isFavorite);
      if (isFavorite) {
        showSuccess("Doktor favorilerden çıkarıldı");
      } else {
        showSuccess("Doktor favorilere eklendi");
      }
    } catch (error: any) {
      showError(error.message || "Bir hata oluştu");
    } finally {
      setTogglingFavorite(false);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      const response = await fetch(`/api/doctors/${doctorId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Doktor bulunamadı");
        } else {
          setError("Profil yüklenirken bir hata oluştu");
        }
        setLoading(false);
        return;
      }
      const data = await response.json();
      setDoctor(data);
      setLoading(false);
    } catch (err) {
      setError("Bir hata oluştu");
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || session.user.role !== "PATIENT") {
      router.push("/auth/login?role=patient");
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/doctors/${doctorId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || "Yorum eklenemedi");
        setSubmittingReview(false);
        return;
      }

      showSuccess("Yorumunuz başarıyla eklendi");
      setReviewForm({ rating: 5, comment: "" });
      setShowReviewForm(false);
      await fetchDoctorProfile(); // Profili yeniden yükle
      setSubmittingReview(false);
    } catch (err) {
      showError("Bir hata oluştu");
      setSubmittingReview(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentForm.appointmentDate || !appointmentForm.appointmentTime) {
      showError("Lütfen tarih ve saat seçin");
      return;
    }
    setAppointmentStep(2); // Onay metni adımına geç
  };

  const handleBackToStep1 = () => {
    setAppointmentStep(1);
  };

  const handleConsentSubmit = async () => {
    setSubmittingConsent(true);
    try {
      // IP adresini al
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const userIp = ipData.ip || "unknown";

      // Randevu oluşturulmadan önce rıza kaydedilemez, bu yüzden sadece state'i güncelle
      // Rıza, randevu oluşturulurken kaydedilecek
      setConsentGiven(true);
      setAppointmentStep(3); // Ödeme adımına geç
    } catch (error: any) {
      showError("Bir hata oluştu");
    } finally {
      setSubmittingConsent(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || session.user.role !== "PATIENT") {
      router.push("/auth/login?role=patient");
      return;
    }

    // Onay kontrolü
    if (!consentGiven) {
      showError("Lütfen önce onay metnini onaylayın");
      return;
    }

    // Kart bilgileri validasyonu
    if (!paymentForm.cardNumber || !paymentForm.cardName || !paymentForm.expiryDate || !paymentForm.cvv) {
      showError("Lütfen tüm kart bilgilerini doldurun");
      return;
    }

    // Basit kart numarası validasyonu (16 haneli)
    if (paymentForm.cardNumber.replace(/\s/g, "").length !== 16) {
      showError("Kart numarası 16 haneli olmalıdır");
      return;
    }

    // CVV validasyonu (3 haneli)
    if (paymentForm.cvv.length !== 3) {
      showError("CVV 3 haneli olmalıdır");
      return;
    }

    setProcessingPayment(true);
    try {
      // Ödeme işlemini simüle et (gerçek uygulamada Stripe veya başka bir ödeme gateway'i kullanılacak)
      // Simüle edilmiş ödeme API çağrısı
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 saniye bekle (ödeme işlemi simülasyonu)
      
      // Ödeme başarılı, randevuyu oluştur
      setCreatingAppointment(true);
      
      // Tarih ve saati birleştir
      const appointmentDateTime = new Date(
        `${appointmentForm.appointmentDate}T${appointmentForm.appointmentTime}`
      );

      // IP adresini al
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const userIp = ipData.ip || "unknown";

      const response = await fetch("/api/patients/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id || "",
          "x-user-role": session.user.role || "",
        },
        credentials: "include",
        body: JSON.stringify({
          doctorId: doctorId,
          appointmentDate: appointmentDateTime.toISOString(),
          notes: appointmentForm.notes || null,
          paymentAmount: appointmentPrice,
          paymentMethod: "CREDIT_CARD",
          consentGiven: consentGiven,
          consentIp: userIp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || "Randevu oluşturulamadı");
        setCreatingAppointment(false);
        return;
      }

      showSuccess("Ödeme başarılı! Randevu başarıyla oluşturuldu.");
      
      // Eğer dosyalar yüklendiyse, randevu ile ilişkilendir
      if (appointmentFiles.length > 0 && data.appointment?.id) {
        let successCount = 0;
        let errorCount = 0;

        for (const fileData of appointmentFiles) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", fileData.file);
            uploadFormData.append("title", fileData.title || "Randevu Belgesi");
            uploadFormData.append("documentType", fileData.type || "Tahlil");

            const uploadResponse = await fetch(`/api/appointments/${data.appointment.id}/upload-report`, {
              method: "POST",
              headers: {
                "x-user-id": session.user.id || "",
                "x-user-role": session.user.role || "",
              },
              credentials: "include",
              body: uploadFormData,
            });

            if (uploadResponse.ok) {
              successCount++;
            } else {
              errorCount++;
              const uploadData = await uploadResponse.json();
              console.error("Dosya yükleme hatası:", uploadData.error);
            }
          } catch (uploadErr) {
            console.error("Dosya yükleme hatası:", uploadErr);
            errorCount++;
          }
        }

        if (successCount > 0) {
          if (errorCount > 0) {
            showSuccess(`${successCount} belge yüklendi. ${errorCount} belge yüklenemedi.`);
          } else {
            showSuccess(`${successCount} belge başarıyla yüklendi!`);
          }
        } else if (errorCount > 0) {
          showError("Belgeler yüklenemedi");
        }
      }

      setAppointmentForm({ appointmentDate: "", appointmentTime: "", notes: "" });
      setAppointmentFiles([]);
      setPaymentForm({ cardNumber: "", cardName: "", expiryDate: "", cvv: "" });
      setConsentGiven(false);
      setAppointmentStep(1);
      setShowAppointmentModal(false);
      setCreatingAppointment(false);
      setProcessingPayment(false);
    } catch (err) {
      showError("Ödeme işlemi sırasında bir hata oluştu");
      setProcessingPayment(false);
      setCreatingAppointment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Doktor bulunamadı"}</p>
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  const hasUserReviewed = session?.user.role === "PATIENT" && doctor.profile.reviews.some(
    (r) => r.patient.id === session.user.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 relative pb-12">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            ← Geri Dön
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Doktor Bilgileri */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {doctor.profile.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={doctor.profile.photoUrl}
                alt={doctor.name}
                className="w-40 h-40 rounded-full object-cover"
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-5xl text-primary-600">
                  {doctor.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-primary-900 mb-2">
                {doctor.name}
              </h1>
              <p className="text-xl text-primary-600 mb-4">
                {doctor.profile.specialization}
              </p>
              {doctor.profile.hospital && (
                <p className="text-primary-700 mb-2">
                  🏥 {doctor.profile.hospital}
                </p>
              )}
              {doctor.profile.experience && (
                <p className="text-primary-700 mb-2">
                  💼 {doctor.profile.experience} yıl deneyim
                </p>
              )}
              {doctor.profile.averageRating > 0 && (
                <div className="mt-4">
                  <span className="text-yellow-500 text-2xl">
                    {"★".repeat(Math.round(doctor.profile.averageRating))}
                    {"☆".repeat(5 - Math.round(doctor.profile.averageRating))}
                  </span>
                  <span className="text-primary-700 ml-3 text-lg font-semibold">
                    {doctor.profile.averageRating.toFixed(1)} ({doctor.profile.totalReviews} yorum)
                  </span>
                </div>
              )}
              {session?.user.role === "PATIENT" && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowAppointmentModal(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Randevu Al
                  </button>
                  <button
                    onClick={handleToggleFavorite}
                    disabled={checkingFavorite || togglingFavorite}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      isFavorite
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {togglingFavorite ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        İşleniyor...
                      </>
                    ) : isFavorite ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        Favorilerden Çıkar
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Favorilere Ekle
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {doctor.profile.bio && (
            <div className="border-t border-primary-200 pt-6">
              <h2 className="text-xl font-bold text-primary-900 mb-3">Hakkında</h2>
              <p className="text-primary-700 whitespace-pre-line">{doctor.profile.bio}</p>
            </div>
          )}
        </div>

        {/* Yorumlar */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-primary-900">
              Yorumlar ({doctor.profile.totalReviews})
            </h2>
            {session?.user.role === "PATIENT" && !hasUserReviewed && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {showReviewForm ? "İptal" : "Yorum Yap"}
              </button>
            )}
          </div>

          {/* Yorum Formu */}
          {showReviewForm && session?.user.role === "PATIENT" && !hasUserReviewed && (
            <form onSubmit={handleReviewSubmit} className="mb-6 p-4 bg-primary-50 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Puan
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`text-3xl ${
                        star <= reviewForm.rating
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Yorumunuz
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  required
                  minLength={10}
                  rows={4}
                  className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                  placeholder="Doktor hakkındaki görüşlerinizi paylaşın..."
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submittingReview ? "Gönderiliyor..." : "Yorumu Gönder"}
              </button>
            </form>
          )}

          {/* Yorum Listesi */}
          {doctor.profile.reviews.length === 0 ? (
            <div className="text-center py-12 text-primary-600">
              Henüz yorum yapılmamış
            </div>
          ) : (
            <div className="space-y-4">
              {doctor.profile.reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-primary-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-primary-900">
                        {review.patient.name}
                      </p>
                      <p className="text-sm text-primary-500">
                        {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="text-yellow-500">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>
                  </div>
                  <p className="text-primary-700 mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Randevu Oluşturma Modal */}
        {showAppointmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-primary-900">Randevu Oluştur</h3>
                <button
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setAppointmentForm({ appointmentDate: "", appointmentTime: "", notes: "" });
                    setAppointmentFiles([]);
                    setPaymentForm({ cardNumber: "", cardName: "", expiryDate: "", cvv: "" });
                    setAppointmentStep(1);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Adım Göstergesi */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    appointmentStep >= 1 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}>
                    1
                  </div>
                  <div className={`w-16 h-1 ${appointmentStep >= 2 ? "bg-primary-600" : "bg-gray-200"}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    appointmentStep >= 2 ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}>
                    2
                  </div>
                </div>
              </div>

              {/* Adım 1: Randevu Bilgileri */}
              {appointmentStep === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    value={appointmentForm.appointmentDate}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Saat * (15 dakikalık slotlar)
                  </label>
                  <select
                    value={appointmentForm.appointmentTime}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                  >
                    <option value="">Saat seçiniz...</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-primary-500 mt-1">
                    Randevular 08:00 - 17:00 saatleri arasında, randevular 15 dakikalık süreler halinde alınabilir.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Hastalık Belirtileriniz
                  </label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                    placeholder="Hastalık belirtilerinizi, şikayetlerinizi yazın..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Tahlil/Rapor Belgesi (Opsiyonel)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          const newFiles = files.map((file) => ({
                            file,
                            title: file.name.replace(/\.[^/.]+$/, ""),
                            type: "",
                          }));
                          setAppointmentFiles([...appointmentFiles, ...newFiles]);
                        }
                        // Input'u sıfırla ki aynı dosya tekrar seçilebilsin
                        e.target.value = "";
                      }}
                      className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    {appointmentFiles.length > 0 && (
                      <div className="space-y-3">
                        {appointmentFiles.map((fileData, index) => (
                          <div key={index} className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-primary-700 truncate">{fileData.file.name}</p>
                                  <p className="text-xs text-primary-500">
                                    ({(fileData.file.size / 1024 / 1024).toFixed(2)} MB)
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAppointmentFiles(appointmentFiles.filter((_, i) => i !== index));
                                }}
                                className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="mt-2 space-y-2">
                              <div>
                                <label className="block text-xs font-medium text-primary-700 mb-1">
                                  Belge Başlığı
                                </label>
                                <input
                                  type="text"
                                  value={fileData.title}
                                  onChange={(e) => {
                                    const updated = [...appointmentFiles];
                                    updated[index].title = e.target.value;
                                    setAppointmentFiles(updated);
                                  }}
                                  placeholder="Örn: Kan Tahlili, Röntgen..."
                                  className="w-full px-3 py-2 text-sm border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-primary-700 mb-1">
                                  Belge Tipi
                                </label>
                                <select
                                  value={fileData.type}
                                  onChange={(e) => {
                                    const updated = [...appointmentFiles];
                                    updated[index].type = e.target.value;
                                    setAppointmentFiles(updated);
                                  }}
                                  className="w-full px-3 py-2 text-sm border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                                >
                                  <option value="">Seçiniz...</option>
                                  <option value="Tahlil">Tahlil</option>
                                  <option value="Röntgen">Röntgen</option>
                                  <option value="MR">MR</option>
                                  <option value="BT">BT</option>
                                  <option value="Ultrason">Ultrason</option>
                                  <option value="EKG">EKG</option>
                                  <option value="Muayene">Muayene</option>
                                  <option value="Diğer">Diğer</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-primary-500 mt-1">
                    PDF, JPG, JPEG veya PNG formatında, maksimum 10MB (Birden fazla dosya seçebilirsiniz)
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAppointmentModal(false);
                      setAppointmentForm({ appointmentDate: "", appointmentTime: "", notes: "" });
                      setAppointmentFiles([]);
                      setPaymentForm({ cardNumber: "", cardName: "", expiryDate: "", cvv: "" });
                      setConsentGiven(false);
                      setAppointmentStep(1);
                    }}
                    className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Sonraki
                  </button>
                </div>
              </form>
              )}

              {/* Adım 2: Onay Metni */}
              {appointmentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-primary-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-primary-900 mb-3">Randevu Özeti</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-600">Doktor:</span>
                      <span className="font-semibold text-primary-900">{doctor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">Tarih:</span>
                      <span className="font-semibold text-primary-900">
                        {new Date(appointmentForm.appointmentDate).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">Saat:</span>
                      <span className="font-semibold text-primary-900">
                        {appointmentForm.appointmentTime} - {(() => {
                          const [hour, minute] = appointmentForm.appointmentTime.split(":");
                          const endMinute = parseInt(minute) + 15;
                          const endHour = endMinute >= 60 ? parseInt(hour) + 1 : parseInt(hour);
                          const finalMinute = endMinute >= 60 ? endMinute - 60 : endMinute;
                          return `${endHour.toString().padStart(2, "0")}:${finalMinute.toString().padStart(2, "0")}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary-200">
                      <span className="text-primary-600 font-semibold">Toplam:</span>
                      <span className="font-bold text-primary-900 text-lg">{appointmentPrice} TL</span>
                    </div>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto border border-primary-200 rounded-lg p-6 bg-white">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Yasal Rıza ve Onam Metni</h3>
                  <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
                    <div>
                      <p className="mb-3">
                        <strong className="text-base">Sayın Hasta,</strong>
                      </p>
                      <p className="mb-3">
                        Bu belge, online görüntülü görüşme hizmeti kapsamında gerçekleştirilecek tıbbi konsültasyon 
                        öncesinde, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), Hasta Hakları Yönetmeliği 
                        ve ilgili mevzuat hükümleri gereğince sizleri bilgilendirmek amacıyla hazırlanmıştır.
                      </p>
                      <p>
                        Lütfen bu metni dikkatle okuyunuz. Onaylamadan önce tüm maddeleri anladığınızdan emin olunuz.
                      </p>
                    </div>

                    <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                      <h4 className="font-semibold text-gray-900 mb-2 text-base">1. Veri Sorumlusu</h4>
                      <p className="text-gray-700">
                        Kişisel verilerinizin işlenmesinden sorumlu olan veri sorumlusu, bu online görüntülü görüşme 
                        hizmetini sunan sağlık kuruluşudur. Tüm kişisel verileriniz, bu kuruluş tarafından KVKK ve 
                        ilgili mevzuat hükümlerine uygun olarak işlenecektir.
                      </p>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <h4 className="font-semibold text-blue-900 mb-3 text-base">2. Kişisel Verilerin İşlenme Amaçları</h4>
                      <p className="text-blue-800 mb-2">
                        Online görüntülü görüşme sırasında toplanan ve işlenen kişisel verileriniz aşağıdaki amaçlarla kullanılacaktır:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-blue-800 ml-2">
                        <li>Tıbbi konsültasyon hizmetinin sunulması ve sağlık hizmeti kalitesinin artırılması</li>
                        <li>Görüşme kayıtlarının oluşturulması ve saklanması (görüntü ve ses kayıtları dahil)</li>
                        <li>Hasta ve doktor haklarının korunması amacıyla yasal delil oluşturulması</li>
                        <li>Tıbbi kayıtların tutulması ve sağlık hizmeti sürekliliğinin sağlanması</li>
                        <li>Yasal yükümlülüklerin yerine getirilmesi (Tıbbi Deontoloji Tüzüğü, Hasta Hakları Yönetmeliği vb.)</li>
                        <li>Sağlık hizmeti kalitesinin değerlendirilmesi ve iyileştirilmesi</li>
                        <li>Hasta güvenliğinin sağlanması ve tıbbi hata önleme çalışmaları</li>
                        <li>Eğitim ve bilimsel araştırma amaçları (yalnızca anonimleştirilmiş verilerle)</li>
                      </ul>
                    </div>

                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
                      <h4 className="font-semibold text-indigo-900 mb-3 text-base">3. Görüşme Kaydı Hakkında Detaylı Bilgi</h4>
                      <p className="text-indigo-800 mb-3">
                        Online görüntülü görüşme sırasında gerçekleştirilecek kayıt işlemi hakkında aşağıdaki bilgileri 
                        lütfen dikkate alınız:
                      </p>
                      <div className="space-y-3 text-indigo-800">
                        <div>
                          <strong className="block mb-1">3.1. Kayıt Kapsamı:</strong>
                          <p className="ml-4">
                            Görüşme sırasında hem görüntü hem de ses kaydı yapılacaktır. Bu kayıtlar, görüşmenin başlangıcından 
                            bitişine kadar olan tüm süreyi kapsamaktadır.
                          </p>
                        </div>
                        <div>
                          <strong className="block mb-1">3.2. Kayıt Erişimi:</strong>
                          <p className="ml-4">
                            Görüşme kayıtlarına yalnızca yetkili hastane yönetimi personeli ve yasal zorunluluklar gereği 
                            yetkili makamlar erişebilecektir.
                          </p>
                        </div>
                        <div>
                          <strong className="block mb-1">3.3. Kayıt Saklama Süresi:</strong>
                          <p className="ml-4">
                            Görüşme kayıtları, Türk Tabipleri Birliği Tıbbi Deontoloji Tüzüğü ve ilgili mevzuat hükümleri 
                            gereğince en az 10 (on) yıl süreyle saklanacaktır.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <h4 className="font-semibold text-green-900 mb-3 text-base">4. Rıza ve Onam</h4>
                      <p className="text-green-800 mb-2">
                        Bu metni onaylayarak:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-green-800 ml-2">
                        <li>Online görüntülü görüşme hizmetini kullanmayı kabul ettiğinizi</li>
                        <li>Görüşme sırasında görüntü ve ses kaydı yapılacağını bildiğinizi ve kabul ettiğinizi</li>
                        <li>Kişisel verilerinizin yukarıda belirtilen amaçlarla işlenmesine açık rıza verdiğinizi</li>
                        <li>Bu metinde belirtilen tüm bilgileri okuduğunuzu ve anladığınızı</li>
                      </ul>
                      <p className="text-green-800 mt-3">
                        beyan ve taahhüt edersiniz.
                      </p>
                    </div>

                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <h4 className="font-semibold text-red-900 mb-3 text-base">5. Önemli Uyarılar</h4>
                      <ul className="list-disc list-inside space-y-2 text-red-800 ml-2">
                        <li>Bu rıza metnini onaylamadan ödeme yapamazsınız.</li>
                        <li>Rızanızı istediğiniz zaman geri alabilirsiniz.</li>
                        <li>Görüşme sırasında paylaştığınız tüm bilgiler gizlilik kuralları çerçevesinde korunacaktır.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={handleConsentSubmit}
                    disabled={submittingConsent}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingConsent ? "İşleniyor..." : "Onaylıyorum ve Devam Ediyorum"}
                  </button>
                </div>
              </div>
              )}

              {/* Adım 3: Ödeme Ekranı */}
              {appointmentStep === 3 && (
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                {/* Randevu Özeti */}
                <div className="bg-primary-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-primary-900 mb-3">Randevu Özeti</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-600">Doktor:</span>
                      <span className="font-semibold text-primary-900">{doctor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">Tarih:</span>
                      <span className="font-semibold text-primary-900">
                        {new Date(appointmentForm.appointmentDate).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-600">Saat:</span>
                      <span className="font-semibold text-primary-900">
                        {appointmentForm.appointmentTime} - {(() => {
                          const [hour, minute] = appointmentForm.appointmentTime.split(":");
                          const endMinute = parseInt(minute) + 15;
                          const endHour = endMinute >= 60 ? parseInt(hour) + 1 : parseInt(hour);
                          const finalMinute = endMinute >= 60 ? endMinute - 60 : endMinute;
                          return `${endHour.toString().padStart(2, "0")}:${finalMinute.toString().padStart(2, "0")}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary-200">
                      <span className="text-primary-600 font-semibold">Toplam:</span>
                      <span className="font-bold text-primary-900 text-lg">{appointmentPrice} TL</span>
                    </div>
                  </div>
                </div>

                {/* Kart Bilgileri */}
                <div>
                  <h4 className="font-semibold text-primary-900 mb-4">Kart Bilgileri</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Kart Numarası *
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, "").replace(/\D/g, "");
                          const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                          setPaymentForm({ ...paymentForm, cardNumber: formatted });
                        }}
                        maxLength={19}
                        placeholder="1234 5678 9012 3456"
                        required
                        className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">
                        Kart Üzerindeki İsim *
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cardName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value.toUpperCase() })}
                        placeholder="AD SOYAD"
                        required
                        className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          Son Kullanma Tarihi *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.expiryDate}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, "");
                            if (value.length >= 2) {
                              value = value.substring(0, 2) + "/" + value.substring(2, 4);
                            }
                            setPaymentForm({ ...paymentForm, expiryDate: value });
                          }}
                          maxLength={5}
                          placeholder="MM/YY"
                          required
                          className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={paymentForm.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").substring(0, 3);
                            setPaymentForm({ ...paymentForm, cvv: value });
                          }}
                          maxLength={3}
                          placeholder="123"
                          required
                          className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setAppointmentStep(2)}
                    className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Geri
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment || creatingAppointment || !consentGiven}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPayment || creatingAppointment ? "İşleniyor..." : `${appointmentPrice} TL Öde ve Randevu Oluştur`}
                  </button>
                </div>
              </form>
              )}
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

