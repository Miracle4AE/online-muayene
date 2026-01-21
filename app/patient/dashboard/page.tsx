/* eslint-disable @next/next/no-img-element */
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  appointmentDate: string;
  status: string;
  notes?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
  doctor: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    specialization?: string;
    hospital?: string;
    photoUrl?: string;
  };
  documents?: Array<{
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    createdAt: string;
    aiAnalyzed: boolean;
    description?: string;
    documentDate?: string;
  }>;
  prescriptions?: Array<{
    id: string;
    medications: string;
    diagnosis?: string;
    notes?: string;
    prescriptionDate: string;
    createdAt: string;
  }>;
  videoRecordings?: Array<{
    id: string;
    videoUrl: string;
    recordingFileUrl?: string;
    duration?: number;
    recordingDate: string;
    notes?: string;
    consentGiven: boolean;
    consentDate?: string;
  }>;
  medicalReports?: Array<{
    id: string;
    reportType: string;
    title: string;
    content: string;
    fileUrl?: string;
    aiGenerated: boolean;
    doctorNotes?: string;
    approvalStatus: string;
    approvedAt?: string;
    rejectionReason?: string;
    reportDate: string;
    createdAt: string;
  }>;
}

export default function PatientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [success, setSuccess] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDocumentType, setUploadDocumentType] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [showPastAppointmentsModal, setShowPastAppointmentsModal] = useState(false);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [selectedPastAppointment, setSelectedPastAppointment] = useState<Appointment | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [appointmentDateFilter, setAppointmentDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED">("ALL");
  const [appointmentCustomDate, setAppointmentCustomDate] = useState("");
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedAppointmentForMeeting, setSelectedAppointmentForMeeting] = useState<Appointment | null>(null);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [showMyAppointmentsModal, setShowMyAppointmentsModal] = useState(false);
  const [patientDocuments, setPatientDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showAskDoctorModal, setShowAskDoctorModal] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchDoctorQuery, setSearchDoctorQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [patientMessages, setPatientMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [aiComplaint, setAiComplaint] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ specialization: string; explanation: string } | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const showToast = (type: "success" | "error" | "info", message: string, duration = 4000) => {
    setToast({ type, message });
    if (duration > 0) {
      setTimeout(() => setToast(null), duration);
    }
  };
  
  // Veri paylaşımı izinleri
  const [shareDataWithSameHospital, setShareDataWithSameHospital] = useState(false);
  const [shareDataWithOtherHospitals, setShareDataWithOtherHospitals] = useState(false);
  const [showConsentModalDashboard, setShowConsentModalDashboard] = useState(false);
  const [consentTypeDashboard, setConsentTypeDashboard] = useState<"same" | "other" | null>(null);
  const [consentActionDashboard, setConsentActionDashboard] = useState<"enable" | "disable" | null>(null);
  

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?role=patient");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && session.user?.id) {
      fetchAppointments();
      fetchPatientDocuments();
      fetchPatientProfilePermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (showFavoritesModal && session && session.user?.id) {
      fetchFavoriteDoctors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesModal, session]);

  useEffect(() => {
    if (session && session.user?.id) {
      fetchPatientMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Her 30 saniyede bir mesajları kontrol et (yeni yanıtlar için)
  useEffect(() => {
    if (!session || !session.user?.id) return;

    const interval = setInterval(() => {
      fetchPatientMessages();
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/patients/appointments", {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Randevular alınamadı");
      }

      const data = await response.json();
      const allAppointments = data.appointments || [];
      setAppointments(allAppointments);
      
      const now = new Date();
      const lateJoinWindowMinutes = 60;

      // Geçmiş randevuları filtrele (tamamlandı/iptal ya da geç katılım penceresi bitti)
      const past = allAppointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.appointmentDate);
        const joinWindowEnd = new Date(aptDate.getTime() + lateJoinWindowMinutes * 60 * 1000);
        return (
          apt.status === "COMPLETED" ||
          apt.status === "CANCELLED" ||
          now > joinWindowEnd
        );
      });
      setPastAppointments(past);

      // Yaklaşan randevuları filtrele (iptal/bitmiş değil ve geç katılım penceresi bitmemiş)
      const upcoming = allAppointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.appointmentDate);
        const joinWindowEnd = new Date(aptDate.getTime() + lateJoinWindowMinutes * 60 * 1000);
        return (
          apt.status !== "CANCELLED" &&
          apt.status !== "COMPLETED" &&
          now <= joinWindowEnd
        );
      });
      setUpcomingAppointments(upcoming);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientProfilePermissions = async () => {
    try {
      if (!session?.user?.id) return;

      const response = await fetch("/api/patients/profile", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setShareDataWithSameHospital(data.profile?.shareDataWithSameHospital || false);
        setShareDataWithOtherHospitals(data.profile?.shareDataWithOtherHospitals || false);
      }
    } catch (err) {
      console.error("Error fetching profile permissions:", err);
    }
  };

  const handleToggleShareDataDashboard = (type: "same" | "other", currentValue: boolean) => {
    setConsentTypeDashboard(type);
    setConsentActionDashboard(currentValue ? "disable" : "enable");
    setShowConsentModalDashboard(true);
  };

  const confirmConsentDashboard = async () => {
    try {
      if (!session?.user?.id) {
        setError("Oturum bilgisi bulunamadı");
        setShowConsentModalDashboard(false);
        return;
      }

      const newValue = consentActionDashboard === "enable";
      const fieldName = consentTypeDashboard === "same" ? "shareDataWithSameHospital" : "shareDataWithOtherHospitals";

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
        setShowConsentModalDashboard(false);
        return;
      }

      // State'i güncelle
      if (consentTypeDashboard === "same") {
        setShareDataWithSameHospital(newValue);
      } else {
        setShareDataWithOtherHospitals(newValue);
      }

      setShowConsentModalDashboard(false);
      showToast("success", "İzin başarıyla güncellendi!");
    } catch (err) {
      setShowConsentModalDashboard(false);
      showToast("error", "Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const fetchPatientDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await fetch("/api/patients/documents", {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Raporlar alınamadı");
      }

      const data = await response.json();
      setPatientDocuments(data.documents || []);
    } catch (err: any) {
      console.error("Raporlar alınırken hata:", err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchFavoriteDoctors = async () => {
    try {
      setLoadingFavorites(true);
      const response = await fetch("/api/patients/favorites", {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Favori doktorlar alınamadı");
      }

      const data = await response.json();
      setFavoriteDoctors(data.favorites || []);
    } catch (err: any) {
      console.error("Favori doktorlar alınırken hata:", err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleRemoveFavorite = async (doctorId: string) => {
    try {
      const response = await fetch("/api/patients/favorites/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: JSON.stringify({ doctorId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Favori çıkarılamadı");
      }

      // Listeyi yenile
      await fetchFavoriteDoctors();
      // Modal açıksa kapatma, sadece listeyi yenile
    } catch (err: any) {
      showToast("error", err.message || "Bir hata oluştu");
    }
  };

  const handleViewPastAppointments = () => {
    setShowPastAppointmentsModal(true);
  };

  const handleViewAppointmentDetails = (appointment: Appointment) => {
    setSelectedPastAppointment(appointment);
  };

  const fetchDoctors = async (query: string) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append("search", query);
      
      const response = await fetch(`/api/doctors?${params.toString()}`);
      if (!response.ok) {
        console.error("API response not ok:", response.status);
        throw new Error("Doktorlar yüklenemedi");
      }
      const data = await response.json();
      console.log("Doktorlar API'den geldi:", data);
      setDoctors(data.doctors || []);
    } catch (err: any) {
      console.error("Doktorlar alınırken hata:", err);
      setDoctors([]);
    }
  };

  const handleSearchDoctors = (query: string) => {
    setSearchDoctorQuery(query);
    if (query.length >= 2) {
      fetchDoctors(query);
    } else {
      setDoctors([]);
    }
  };

  const handleSelectDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    setSearchDoctorQuery("");
    setDoctors([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Dosya tipi kontrolü
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        showToast("error", `${file.name} geçersiz dosya tipi. Sadece PDF, resim ve Office dosyaları kabul edilir.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast("error", `${file.name} dosya boyutu çok büyük. Maksimum 10MB olmalıdır.`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleAISuggestion = async () => {
    if (!aiComplaint.trim() || aiComplaint.length < 10) {
      showToast("error", "Lütfen en az 10 karakterlik bir şikayet yazın");
      return;
    }

    try {
      setAiSuggesting(true);
      setAiSuggestion(null);

      const response = await fetch("/api/ai/suggest-specialization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: JSON.stringify({
          complaint: aiComplaint,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "AI önerisi alınamadı");
      }

      const data = await response.json();
      setAiSuggestion({
        specialization: data.specialization,
        explanation: data.explanation,
      });
    } catch (err: any) {
      showToast("error", err.message || "AI önerisi alınırken bir hata oluştu");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDoctor || !messageText.trim() || messageText.length < 10) {
      showToast("error", "Lütfen en az 10 karakterlik bir mesaj yazın");
      return;
    }

    if (!consentAccepted) {
      showToast("error", "Mesaj göndermek için lütfen onam metnini okuyup onaylayın");
      return;
    }

    try {
      setSendingMessage(true);
      setUploadingFiles(true);

      // FormData oluştur
      const formData = new FormData();
      formData.append("doctorId", selectedDoctor.id);
      formData.append("message", messageText);
      
      // Dosyaları ekle
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/patients/messages/send", {
        method: "POST",
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Mesaj gönderilemedi");
      }

      const data = await response.json();
      showToast("success", data.info || "Mesajınız doktora iletildi!");
      
      // Modalı kapat ve formu temizle
      setShowAskDoctorModal(false);
      setSelectedDoctor(null);
      setMessageText("");
      setSearchDoctorQuery("");
      setDoctors([]);
      setSelectedFiles([]);
      setConsentAccepted(false);
      
      // Mesajları yenile
      await fetchPatientMessages();
    } catch (err: any) {
      showToast("error", err.message || "Mesaj gönderilirken bir hata oluştu");
    } finally {
      setSendingMessage(false);
      setUploadingFiles(false);
    }
  };

  const fetchPatientMessages = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingMessages(true);
      const response = await fetch("/api/patients/messages", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role || "",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Mesajlar alınamadı");
      }

      const data = await response.json();
      setPatientMessages(data.messages || []);
      
      // Okunmamış mesaj sayısını hesapla (ACTIVE durumunda ve doktor yanıt vermişse)
      const unread = (data.messages || []).filter((msg: any) => {
        // Mesaj ACTIVE durumunda, içinde "DOKTOR YANITI" varsa ve updatedAt createdAt'ten sonraysa okunmamış sayılır
        if (msg.status === "ACTIVE" && msg.message.includes("--- DOKTOR YANITI ---")) {
          const updatedAt = new Date(msg.updatedAt);
          const createdAt = new Date(msg.createdAt);
          // Eğer güncelleme tarihi oluşturma tarihinden sonraysa doktor yanıt vermiştir
          return updatedAt > createdAt;
        }
        return false;
      }).length;
      setUnreadCount(unread);
    } catch (err: any) {
      console.error("Mesajlar alınırken hata:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Randevu saati geldi mi kontrol et (15 dakika öncesinden itibaren aktif, randevu saatinden sonra da 1 saat boyunca)
  const canJoinMeeting = (appointmentDate: string) => {
    const appointmentTime = new Date(appointmentDate);
    const now = new Date();
    const diffInMinutes = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
    // Randevu saatinden 15 dakika öncesinden itibaren veya randevu saatinden sonra 1 saat içinde katılabilir
    return diffInMinutes <= 15 && diffInMinutes >= -60;
  };

  const handleJoinMeeting = (appointment: Appointment) => {
    setSelectedAppointmentForMeeting(appointment);
    setShowConsentModal(true);
  };

  const handleConsentSubmit = async () => {
    if (!selectedAppointmentForMeeting) return;

    setSubmittingConsent(true);
    try {
      // IP adresini al
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const userIp = ipData.ip || "unknown";

      const response = await fetch("/api/meetings/give-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          appointmentId: selectedAppointmentForMeeting.id,
          patientId: session?.user?.id,
          consentGiven: true,
          consentIp: userIp,
        }),
      });

      if (!response.ok) {
        throw new Error("Rıza kaydedilemedi");
      }

      // Görüntülü görüşmeyi yeni pencerede aç
      const fallbackMeetingUrl = `/meeting/${selectedAppointmentForMeeting.id}?appointmentId=${selectedAppointmentForMeeting.id}&patientId=${session?.user?.id}`;
      const meetingUrl = selectedAppointmentForMeeting.meetingLink || fallbackMeetingUrl;
      window.open(meetingUrl, "_blank", "noopener,noreferrer,width=1280,height=800");
    } catch (error: any) {
      setError(error.message || "Rıza kaydedilirken bir hata oluştu");
    } finally {
      setSubmittingConsent(false);
    }
  };

  const handleUploadReport = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadTitle("");
    setUploadDocumentType("");
    setUploadDescription("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !uploadFile || !uploadTitle || !uploadDocumentType) {
      setError("Lütfen tüm alanları doldurun");
      setSuccess("");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("documentType", uploadDocumentType);
      if (uploadDescription) {
        formData.append("description", uploadDescription);
      }

      const response = await fetch(`/api/appointments/${selectedAppointment.id}/upload-report`, {
        method: "POST",
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rapor yüklenemedi");
      }

      const data = await response.json();
      setSuccess(data.message || "Rapor başarıyla yüklendi. Yapay zeka analizi yapılıyor...");
      setUploadFile(null);
      setUploadTitle("");
      setUploadDocumentType("");
      setUploadDescription("");
      
      // Randevuları ve raporları yenile
      await fetchAppointments();
      await fetchPatientDocuments();
    } catch (err: any) {
      setError(err.message || "Rapor yüklenirken bir hata oluştu");
      setSuccess("");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "CONFIRMED") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Onaylandı
        </span>
      );
    }

    if (status === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          Bekliyor
        </span>
      );
    }

    if (status === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          İptal
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Tamamlandı
      </span>
    );
  };

  const applyAppointmentFilters = (items: Appointment[]) => {
    let filtered = items;

    if (appointmentStatusFilter !== "ALL") {
      filtered = filtered.filter((item) => item.status === appointmentStatusFilter);
    }

    if (appointmentCustomDate) {
      filtered = filtered.filter((item) => {
        const date = new Date(item.appointmentDate);
        const target = new Date(appointmentCustomDate);
        return date.toDateString() === target.toDateString();
      });
      return filtered;
    }

    if (appointmentDateFilter !== "ALL") {
      const now = new Date();
      filtered = filtered.filter((item) => {
        const date = new Date(item.appointmentDate);
        if (appointmentDateFilter === "TODAY") {
          return date.toDateString() === now.toDateString();
        }
        if (appointmentDateFilter === "WEEK") {
          const diffDays = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
    }

    return filtered;
  };

  const filteredUpcomingAppointments = applyAppointmentFilters(upcomingAppointments);
  const filteredPastAppointments = applyAppointmentFilters(pastAppointments);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 relative pb-12">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary-900">
                Hasta Paneli
              </h1>
              <p className="text-primary-600">Hoş geldiniz, {session.user?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mesaj Kutusu Butonu */}
              <button
                onClick={() => {
                  setShowMessagesModal(true);
                  fetchPatientMessages();
                }}
                className="relative px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Mesajlarım
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
        </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 text-sm font-medium">
                  Yaklaşan Randevular
                </p>
                <p className="text-3xl font-bold text-primary-900 mt-2">
                  {loading ? (
                    <span className="text-lg">Yükleniyor...</span>
                  ) : (
                    upcomingAppointments.length
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 text-sm font-medium">
                  Geçmiş Randevular
                </p>
                <p className="text-3xl font-bold text-primary-900 mt-2">
                  {loading ? (
                    <span className="text-lg">Yükleniyor...</span>
                  ) : (
                    pastAppointments.length
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-600 text-sm font-medium">
                  Toplam Randevu
                </p>
                <p className="text-3xl font-bold text-primary-900 mt-2">
                  {loading ? (
                    <span className="text-lg">Yükleniyor...</span>
                  ) : (
                    appointments.length
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Hızlı İşlemler ve Profil Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              Hızlı İşlemler
            </h3>
            <div className="space-y-3">
              <Link
                href="/doctors"
                className="block w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="font-semibold text-primary-900">Doktor Ara</div>
                <div className="text-sm text-primary-600">Uygun doktor bulun</div>
              </Link>
              <button 
                onClick={handleViewPastAppointments}
                className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="font-semibold text-primary-900">
                  Geçmiş Randevular
                </div>
                <div className="text-sm text-primary-600">
                  Tüm randevularınızı görüntüleyin
                </div>
              </button>
              <button 
                onClick={() => setShowFavoritesModal(true)}
                className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="font-semibold text-primary-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  Favori Doktorlarım
                </div>
                <div className="text-sm text-primary-600">
                  Beğendiğiniz doktorları görüntüleyin
                </div>
              </button>
              <button
                onClick={() => setShowAskDoctorModal(true)}
                className="w-full text-left px-4 py-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <div className="font-semibold text-primary-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Doktoruma Sor
                </div>
                <div className="text-sm text-primary-600">
                  Doktorunuza soru sorun
                </div>
              </button>
              <button
                onClick={() => setShowAIChatModal(true)}
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-colors border border-purple-200"
              >
                <div className="font-semibold text-primary-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Doktor Önerisi
                </div>
                <div className="text-sm text-primary-600">
                  Şikayetlerinize göre uygun doktor bulun
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              Profil Bilgileri
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-primary-600">Ad Soyad:</span>
                <span className="font-semibold text-primary-900">
                  {session?.user?.name || "Bilinmiyor"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-600">Email:</span>
                <span className="font-semibold text-primary-900">
                  {session?.user?.email || "Bilinmiyor"}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <Link
                  href="/patient/profile"
                  className="block w-full text-center px-4 py-2 border-2 border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Profili Düzenle
                </Link>
                
                {/* Veri Paylaşımı İzinleri */}
                <div className="border-t border-gray-300 pt-4 mt-4">
                  <p className="text-sm font-bold text-primary-900 mb-4">Veri Paylaşımı İzinleri</p>
                  
                  {/* Aynı Hastane İzni */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-primary-800">
                        Aynı Hastane
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleShareDataDashboard("same", shareDataWithSameHospital)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          shareDataWithSameHospital ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            shareDataWithSameHospital ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <p className={`text-sm font-medium ${
                      shareDataWithSameHospital ? "text-green-600" : "text-gray-600"
                    }`}>
                      {shareDataWithSameHospital ? "✓ Aktif" : "✗ Pasif"}
                    </p>
                  </div>

                  {/* Farklı Hastaneler İzni */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-primary-800">
                        Farklı Hastaneler
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleShareDataDashboard("other", shareDataWithOtherHospitals)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          shareDataWithOtherHospitals ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            shareDataWithOtherHospitals ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                    <p className={`text-sm font-medium ${
                      shareDataWithOtherHospitals ? "text-green-600" : "text-gray-600"
                    }`}>
                      {shareDataWithOtherHospitals ? "✓ Aktif" : "✗ Pasif"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Randevular */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary-900">Randevularım</h2>
            <Link
              href="/doctors"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Yeni Randevu Al
            </Link>
          </div>
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary-700">Tarih</span>
              <select
                value={appointmentDateFilter}
                onChange={(event) => setAppointmentDateFilter(event.target.value as "ALL" | "TODAY" | "WEEK" | "MONTH")}
                className="text-sm border border-primary-200 rounded-lg px-3 py-2 bg-white text-primary-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">Tümü</option>
                <option value="TODAY">Bugün</option>
                <option value="WEEK">Bu hafta</option>
                <option value="MONTH">Bu ay</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary-700">Seçili Tarih</span>
              <input
                type="date"
                value={appointmentCustomDate}
                onChange={(event) => setAppointmentCustomDate(event.target.value)}
                className="text-sm border border-primary-200 rounded-lg px-3 py-2 bg-white text-primary-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary-700">Durum</span>
              <select
                value={appointmentStatusFilter}
                onChange={(event) =>
                  setAppointmentStatusFilter(
                    event.target.value as "ALL" | "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED"
                  )
                }
                className="text-sm border border-primary-200 rounded-lg px-3 py-2 bg-white text-primary-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">Tümü</option>
                <option value="CONFIRMED">Onaylandı</option>
                <option value="PENDING">Bekliyor</option>
                <option value="COMPLETED">Tamamlandı</option>
                <option value="CANCELLED">İptal</option>
              </select>
            </div>
            {(appointmentDateFilter !== "ALL" || appointmentStatusFilter !== "ALL" || appointmentCustomDate) && (
              <button
                onClick={() => {
                  setAppointmentDateFilter("ALL");
                  setAppointmentStatusFilter("ALL");
                  setAppointmentCustomDate("");
                }}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Filtreyi sıfırla
              </button>
            )}
          </div>

          {filteredUpcomingAppointments.length === 0 && filteredPastAppointments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-primary-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-primary-600 mb-4">Henüz randevu bulunmuyor</p>
              <Link
                href="/doctors"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                İlk Randevunuzu Alın
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary-900">Yaklaşan Randevularım</h3>
                  {filteredUpcomingAppointments.length > 3 && (
                    <button
                      onClick={() => setShowMyAppointmentsModal(true)}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Daha fazla gör
                    </button>
                  )}
                </div>
                {filteredUpcomingAppointments.length === 0 ? (
                  <div className="text-sm text-primary-600 bg-primary-50 rounded-lg p-4">
                    Yaklaşan randevunuz bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUpcomingAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-primary-900">
                              {appointment.doctor.name}
                            </h3>
                            <p className="text-sm text-primary-600">
                              {appointment.doctor.email}
                            </p>
                            <p className="text-sm text-primary-500 mt-2">
                              {new Date(appointment.appointmentDate).toLocaleString("tr-TR")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(appointment.status)}
                            {appointment.meetingLink && (() => {
                              const canJoin = canJoinMeeting(appointment.appointmentDate);
                              const appointmentTime = new Date(appointment.appointmentDate);
                              const now = new Date();
                              const isPast = appointmentTime < now;

                              if (isPast) {
                                return (
                                  <button
                                    disabled
                                    className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm"
                                    title="Bu randevu tarihi geçmiş"
                                  >
                                    Görüşmeye Katıl
                                  </button>
                                );
                              } else if (canJoin) {
                                return (
                                  <button
                                    onClick={() => handleJoinMeeting(appointment)}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                                  >
                                    Görüşmeye Katıl
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    disabled
                                    className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm"
                                    title="Randevu saatinden 15 dakika önce aktif olacak"
                                  >
                                    Görüşmeye Katıl
                                  </button>
                                );
                              }
                            })()}
                            <button
                              onClick={() => handleUploadReport(appointment)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Rapor Yükle
                            </button>
                          </div>
                        </div>

                        {appointment.documents && appointment.documents.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-primary-200">
                            <p className="text-sm font-semibold text-primary-900 mb-2">
                              Yüklenen Raporlar:
                            </p>
                            <div className="space-y-2">
                              {appointment.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-2 bg-primary-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className="w-5 h-5 text-primary-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-primary-900">
                                        {doc.title}
                                      </p>
                                      <p className="text-xs text-primary-600">
                                        {doc.documentType} • {doc.aiAnalyzed ? "AI Analiz Edildi" : "Analiz Bekliyor"}
                                      </p>
                                    </div>
                                  </div>
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                  >
                                    Görüntüle
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-primary-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary-900">Geçmiş Randevularım</h3>
                  {filteredPastAppointments.length > 3 && (
                    <button
                      onClick={() => setShowPastAppointmentsModal(true)}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Daha fazla gör
                    </button>
                  )}
                </div>
                {filteredPastAppointments.length === 0 ? (
                  <div className="text-sm text-primary-600 bg-primary-50 rounded-lg p-4">
                    Geçmiş randevunuz bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPastAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-primary-900">
                              {appointment.doctor.name}
                            </h3>
                            <p className="text-sm text-primary-600">
                              {appointment.doctor.email}
                            </p>
                            <p className="text-sm text-primary-500 mt-2">
                              {new Date(appointment.appointmentDate).toLocaleString("tr-TR")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(appointment.status)}
                            {appointment.meetingLink && (
                              <button
                                disabled
                                className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm"
                                title="Bu randevu tarihi geçmiş"
                              >
                                Görüşmeye Katıl
                              </button>
                            )}
                            <button
                              onClick={() => handleUploadReport(appointment)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Rapor Yükle
                            </button>
                          </div>
                        </div>

                        {appointment.documents && appointment.documents.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-primary-200">
                            <p className="text-sm font-semibold text-primary-900 mb-2">
                              Yüklenen Raporlar:
                            </p>
                            <div className="space-y-2">
                              {appointment.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-2 bg-primary-50 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className="w-5 h-5 text-primary-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-primary-900">
                                        {doc.title}
                                      </p>
                                      <p className="text-xs text-primary-600">
                                        {doc.documentType} • {doc.aiAnalyzed ? "AI Analiz Edildi" : "Analiz Bekliyor"}
                                      </p>
                                    </div>
                                  </div>
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                                  >
                                    Görüntüle
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rapor Yükleme Modal */}
        {showUploadModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Rapor Yükle</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedAppointment(null);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmitUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rapor Başlığı *
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white placeholder:text-gray-500"
                    placeholder="Örn: Kan Tahlili Sonuçları"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rapor Tipi *
                  </label>
                  <select
                    value={uploadDocumentType}
                    onChange={(e) => setUploadDocumentType(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="Tahlil">Tahlil</option>
                    <option value="Röntgen">Röntgen</option>
                    <option value="MR">MR</option>
                    <option value="BT">BT</option>
                    <option value="Ultrason">Ultrason</option>
                    <option value="EKG">EKG</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosya * (PDF, JPG, PNG - Max 10MB)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                  {uploadFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Seçilen dosya: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama (Opsiyonel)
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900 bg-white placeholder:text-gray-500"
                    rows={3}
                    placeholder="Rapor hakkında ek bilgiler..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    disabled={uploading}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Yükleniyor..." : "Raporu Yükle"}
                  </button>
                </div>
              </form>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Not:</strong> Yüklediğiniz rapor yapay zeka tarafından otomatik olarak analiz edilecek ve doktorunuza iletilecektir.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Doktor ile Görüntülü Randevu */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary-900">
              Doktor ile Görüntülü Randevu
            </h2>
            <button
              onClick={() => setShowMyAppointmentsModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold"
            >
              Doktor Randevum
            </button>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-primary-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-primary-600">Henüz görüntülü randevu bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => {
                const canJoin = canJoinMeeting(appointment.appointmentDate);
                const appointmentTime = new Date(appointment.appointmentDate);
                const now = new Date();
                const diffInMinutes = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
                
                return (
                  <div
                    key={appointment.id}
                    className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {appointment.doctor.photoUrl ? (
                            <img
                              src={appointment.doctor.photoUrl}
                              alt={appointment.doctor.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-lg text-primary-600 font-semibold">
                                {appointment.doctor.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-primary-900">
                              {appointment.doctor.name}
                            </h4>
                            <p className="text-sm text-primary-600">
                              {appointment.doctor.specialization}
                              {appointment.doctor.hospital && ` • ${appointment.doctor.hospital}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-primary-500 mt-2">
                          {new Date(appointment.appointmentDate).toLocaleString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {!canJoin && diffInMinutes > 0 && (
                          <p className="text-sm text-yellow-600 mt-2">
                            Görüşme {Math.floor(diffInMinutes)} dakika sonra başlayacak
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Onaylandı
                        </span>
                        {canJoin ? (
                          <button
                            onClick={() => handleJoinMeeting(appointment)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Görüntülü Görüşmeye Katıl
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm font-semibold"
                          >
                            Henüz Zamanı Gelmedi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Yüklenen Raporlarım */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary-900">Yüklenen Raporlarım</h2>
            {patientDocuments.length > 3 && (
              <button
                onClick={() => setShowReportsModal(true)}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Daha fazla gör
              </button>
            )}
          </div>

          {loadingDocuments ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-primary-600">Raporlar yükleniyor...</p>
            </div>
          ) : patientDocuments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-primary-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-primary-600 mb-4">Henüz yüklenmiş rapor bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patientDocuments.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-primary-900 text-lg">
                              {doc.title}
                            </h4>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {doc.documentType}
                            </span>
                            {doc.aiAnalyzed && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                AI Analiz Edildi
                              </span>
                            )}
                          </div>
                          
                          {doc.appointment && doc.appointment.doctor && (
                            <div className="flex items-center gap-2 mb-2">
                              <svg
                                className="w-4 h-4 text-primary-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span className="text-sm text-primary-700 font-medium">
                                {doc.appointment.doctor.name}
                              </span>
                              {doc.appointment.doctor.specialization && (
                                <>
                                  <span className="text-primary-400">•</span>
                                  <span className="text-sm text-primary-600">
                                    {doc.appointment.doctor.specialization}
                                  </span>
                                </>
                              )}
                              {doc.appointment.doctor.hospital && (
                                <>
                                  <span className="text-primary-400">•</span>
                                  <span className="text-sm text-primary-600">
                                    {doc.appointment.doctor.hospital}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          {doc.description && (
                            <p className="text-sm text-primary-600 mb-2">{doc.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-primary-500 mt-2">
                            <span>
                              Yüklenme: {new Date(doc.createdAt).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                            {doc.documentDate && (
                              <span>
                                Belge Tarihi: {new Date(doc.documentDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                            {doc.appointment && (
                              <span>
                                Randevu: {new Date(doc.appointment.appointmentDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Görüntüle
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geçmiş Randevular Modal */}
        {showPastAppointmentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-6 border-b border-primary-200">
                <h3 className="text-2xl font-bold text-primary-900">Geçmiş Randevular</h3>
                <button
                  onClick={() => {
                    setShowPastAppointmentsModal(false);
                    setSelectedPastAppointment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {filteredPastAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-primary-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-primary-600">Henüz geçmiş randevu bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPastAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewAppointmentDetails(appointment)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {appointment.doctor.photoUrl ? (
                                <img
                                  src={appointment.doctor.photoUrl}
                                  alt={appointment.doctor.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span className="text-lg text-primary-600 font-semibold">
                                    {appointment.doctor.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-primary-900">
                                  {appointment.doctor.name}
                                </h4>
                                <p className="text-sm text-primary-600">
                                  {appointment.doctor.specialization}
                                  {appointment.doctor.hospital && ` • ${appointment.doctor.hospital}`}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-primary-500 mt-2">
                              {new Date(appointment.appointmentDate).toLocaleString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(appointment.status)}
                            <button className="text-primary-600 hover:text-primary-800 text-sm font-semibold">
                              Detayları Gör →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Yüklenen Raporlar Modal */}
        {showReportsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-6 border-b border-primary-200">
                <h3 className="text-2xl font-bold text-primary-900">Yüklenen Raporlarım</h3>
                <button
                  onClick={() => setShowReportsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {patientDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-primary-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-primary-600">Henüz yüklenmiş rapor bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg
                                  className="w-6 h-6 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-primary-900 text-lg">
                                    {doc.title}
                                  </h4>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {doc.documentType}
                                  </span>
                                  {doc.aiAnalyzed && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      AI Analiz Edildi
                                    </span>
                                  )}
                                </div>

                                {doc.appointment && doc.appointment.doctor && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg
                                      className="w-4 h-4 text-primary-500"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                      />
                                    </svg>
                                    <span className="text-sm text-primary-700 font-medium">
                                      {doc.appointment.doctor.name}
                                    </span>
                                    {doc.appointment.doctor.specialization && (
                                      <>
                                        <span className="text-primary-400">•</span>
                                        <span className="text-sm text-primary-600">
                                          {doc.appointment.doctor.specialization}
                                        </span>
                                      </>
                                    )}
                                    {doc.appointment.doctor.hospital && (
                                      <>
                                        <span className="text-primary-400">•</span>
                                        <span className="text-sm text-primary-600">
                                          {doc.appointment.doctor.hospital}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {doc.description && (
                                  <p className="text-sm text-primary-600 mb-2">{doc.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-primary-500 mt-2">
                                  <span>
                                    Yüklenme: {new Date(doc.createdAt).toLocaleDateString("tr-TR", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </span>
                                  {doc.documentDate && (
                                    <span>
                                      Belge Tarihi: {new Date(doc.documentDate).toLocaleDateString("tr-TR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              Görüntüle
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Favori Doktorlarım Modal */}
        {showFavoritesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-6 border-b border-primary-200">
                <h3 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Favori Doktorlarım
                </h3>
                <button
                  onClick={() => setShowFavoritesModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {loadingFavorites ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-primary-600">Favori doktorlar yükleniyor...</p>
                  </div>
                ) : favoriteDoctors.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-primary-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <p className="text-primary-600 mb-2">Henüz favori doktorunuz yok</p>
                    <p className="text-sm text-primary-500 mb-4">
                      Beğendiğiniz doktorları favorilerinize ekleyerek kolayca erişebilirsiniz
                    </p>
                    <Link
                      href="/doctors"
                      className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Doktor Ara
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteDoctors.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="border border-primary-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-primary-50"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {favorite.photoUrl ? (
                              <img
                                src={favorite.photoUrl}
                                alt={favorite.doctorName}
                                className="w-16 h-16 rounded-full object-cover border-2 border-primary-200"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center border-2 border-primary-200">
                                <span className="text-2xl text-primary-600 font-bold">
                                  {favorite.doctorName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-bold text-primary-900 text-lg mb-1">
                                {favorite.doctorName}
                              </h3>
                              <p className="text-primary-600 text-sm">{favorite.specialization}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFavorite(favorite.doctorId)}
                            className="text-red-500 hover:text-red-700 transition-colors p-2"
                            title="Favorilerden çıkar"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-2 mb-4">
                          {favorite.hospital && (
                            <div className="flex items-center gap-2 text-sm text-primary-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>{favorite.hospital}</span>
                            </div>
                          )}
                          {favorite.experience && (
                            <div className="flex items-center gap-2 text-sm text-primary-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{favorite.experience} yıl deneyim</span>
                            </div>
                          )}
                          {favorite.averageRating > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-yellow-500">
                                {"★".repeat(Math.round(favorite.averageRating))}
                                {"☆".repeat(5 - Math.round(favorite.averageRating))}
                              </span>
                              <span className="text-primary-700 font-semibold">
                                {favorite.averageRating.toFixed(1)} ({favorite.totalReviews} yorum)
                              </span>
                            </div>
                          )}
                          {favorite.appointmentPrice && (
                            <div className="flex items-center gap-2 text-sm text-primary-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold">{favorite.appointmentPrice} TL</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/doctors/${favorite.doctorId}`}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center text-sm"
                          >
                            Profili Gör
                          </Link>
                          <button
                            onClick={() => {
                              setShowFavoritesModal(false);
                              router.push(`/doctors/${favorite.doctorId}`);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                          >
                            Randevu Al
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doktoruma Sor Modal */}
        {showAskDoctorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ overflow: 'auto' }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-slideUp relative" style={{ overflow: 'visible' }}>
              {/* Modern Header with Gradient */}
              <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white p-6 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Doktoruma Sor</h3>
                      <p className="text-primary-100 text-sm mt-0.5">Uzman doktorunuzdan bilgi alın</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAskDoctorModal(false);
                      setSelectedDoctor(null);
                      setMessageText("");
                      setSearchDoctorQuery("");
                      setDoctors([]);
                      setSelectedFiles([]);
                      setConsentAccepted(false);
                    }}
                    className="w-10 h-10 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex items-center justify-center backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>
                {/* Fixed Top Section - Info Card and Search */}
                <div className="flex-shrink-0 p-6 pb-4 bg-gradient-to-br from-gray-50 to-white relative" style={{ overflow: 'visible', zIndex: 100 }}>
                  {/* Professional Info Card */}
                  <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                          <span>Önemli Bilgilendirme</span>
                        </h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          Doktorunuz görüşmeyi kabul etmesi durumunda görüşmeye devam edebilirsiniz. Şu an için sadece <strong>bir adet (1 adet)</strong> ileti gönderebilirsiniz. Lütfen iletiniz detaylı ve net anlatım içermesine özen gösteriniz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Doktor Seçimi */}
                  {!selectedDoctor ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Doktor Ara
                        </label>
                        <div className="relative" style={{ zIndex: 9999 }}>
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={searchDoctorQuery}
                            onChange={(e) => handleSearchDoctors(e.target.value)}
                            placeholder="Doktor adı, uzmanlık alanı veya hastane adı ile arayın..."
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all shadow-sm hover:shadow-md relative z-10"
                            style={{ color: '#111827' }}
                            autoComplete="off"
                          />
                          {searchDoctorQuery.length >= 2 && (
                            <div 
                              className="absolute w-full bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto" 
                              style={{ 
                                top: 'calc(100% + 0.75rem)', 
                                left: 0, 
                                right: 0, 
                                position: 'absolute',
                                zIndex: 9999,
                                marginTop: '0'
                              }}
                            >
                            {doctors.length === 0 ? (
                              <div className="px-5 py-4 text-center text-gray-500">
                                <p>Doktor bulunamadı</p>
                              </div>
                            ) : (
                              doctors.map((doctor) => (
                                <button
                                  key={doctor.id}
                                  onClick={() => handleSelectDoctor(doctor)}
                                  className="w-full text-left px-5 py-4 hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50 transition-all border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl group"
                                >
                                  <div className="flex items-center gap-4">
                                    {doctor.photoUrl ? (
                                      <img
                                        src={doctor.photoUrl}
                                        alt={doctor.name}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-gray-200 group-hover:border-primary-300 transition-all"
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-gray-200 group-hover:border-primary-300 transition-all">
                                        <span className="text-xl text-primary-700 font-bold">
                                          {doctor.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <p className="font-bold text-gray-900 text-base mb-1 group-hover:text-primary-700 transition-colors">{doctor.name}</p>
                                      <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <span className="font-medium">{doctor.specialization}</span>
                                        {doctor.hospital && (
                                          <>
                                            <span className="text-gray-400">•</span>
                                            <span>{doctor.hospital}</span>
                                          </>
                                        )}
                                      </p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </button>
                              ))
                            )}
                            </div>
                          )}
                        </div>
                        {searchDoctorQuery.length > 0 && searchDoctorQuery.length < 2 && (
                          <p className="text-xs text-gray-500 mt-2 ml-1">En az 2 karakter giriniz</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Scrollable Content Area */}
                {selectedDoctor && (
                  <div className="overflow-y-auto flex-1 p-6 pt-4 bg-gradient-to-br from-gray-50 to-white" style={{ overflowY: 'auto' }}>
                  <div className="space-y-6">
                    {/* Seçilen Doktor - Professional Card */}
                    <div className="bg-gradient-to-r from-primary-50 via-blue-50 to-primary-50 border-2 border-primary-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {selectedDoctor.photoUrl ? (
                            <img
                              src={selectedDoctor.photoUrl}
                              alt={selectedDoctor.name}
                              className="w-20 h-20 rounded-xl object-cover border-2 border-primary-300 shadow-md"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center border-2 border-primary-300 shadow-md">
                              <span className="text-3xl text-primary-700 font-bold">
                                {selectedDoctor.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 text-xl mb-1">{selectedDoctor.name}</p>
                            <p className="text-sm text-gray-600 font-medium mb-1">{selectedDoctor.specialization}</p>
                            {selectedDoctor.hospital && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {selectedDoctor.hospital}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDoctor(null);
                            setMessageText("");
                            setSelectedFiles([]);
                            setConsentAccepted(false);
                          }}
                          className="px-4 py-2 text-sm font-semibold text-primary-700 bg-white border-2 border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Değiştir
                        </button>
                      </div>
                    </div>

                    {/* Mesaj Yazma */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Mesajınız
                        <span className="text-xs font-normal text-gray-500">(En az 10 karakter)</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Sorunuzu detaylı ve net bir şekilde yazın. Doktorunuz size en iyi şekilde yardımcı olabilmesi için tüm önemli bilgileri eklemeyi unutmayın..."
                          rows={10}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-gray-900 bg-white transition-all shadow-sm hover:shadow-md"
                          maxLength={2000}
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          {messageText.length > 0 && messageText.length < 10 && (
                            <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                              En az 10 karakter
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            messageText.length > 1800 
                              ? 'text-red-600 bg-red-50' 
                              : messageText.length > 1500 
                              ? 'text-amber-600 bg-amber-50' 
                              : 'text-gray-500 bg-gray-100'
                          }`}>
                            {messageText.length}/2000
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dosya Yükleme */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Belge Ekle
                        <span className="text-xs font-normal text-gray-500">(İsteğe bağlı, maksimum 10MB)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary-400 hover:bg-primary-50 transition-all">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          onChange={handleFileSelect}
                          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            Dosya seçmek için tıklayın veya sürükleyip bırakın
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, resim veya Office dosyaları (Maksimum 10MB)
                          </p>
                        </label>
                      </div>

                      {/* Seçilen Dosyalar */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">
                            Seçilen Dosyalar ({selectedFiles.length})
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                                    {file.type.startsWith("image/") ? (
                                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    ) : file.type === "application/pdf" ? (
                                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveFile(index)}
                                  className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Onam Metni */}
                    <div className="space-y-3">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Kişisel Verilerin Korunması Kanunu (KVKK) Açık Rıza Metni
                        </h4>
                        <div className="text-sm text-blue-900 space-y-3 max-h-60 overflow-y-auto pr-2">
                          <p className="leading-relaxed">
                            <strong>Sayın Hasta,</strong>
                          </p>
                          <p className="leading-relaxed">
                            Tarafınıza sunulan sağlık hizmetleri kapsamında, doktorunuz ile aranızda gerçekleşen yazılı ve/veya elektronik mesajlaşma kayıtlarının saklanması ve işlenmesi gerekmektedir. Bu kayıtlar, tıbbi hizmetlerin kalitesini artırmak, tedavi süreçlerinizi izlemek ve yasal yükümlülükleri yerine getirmek amacıyla kullanılacaktır.
                          </p>
                          <p className="leading-relaxed">
                            6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, kişisel verilerinizin işlenmesi ve saklanması için açık rızanız gerekmektedir. Bu bağlamda, aşağıdaki hususları kabul ettiğinizi beyan etmenizi rica ederiz:
                          </p>
                          <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li className="leading-relaxed">
                              Doktorum ile aramda gerçekleşen tüm yazılı ve/veya elektronik mesajlaşma kayıtlarının, tıbbi hizmetlerin yürütülmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla saklanmasını ve işlenmesini kabul ediyorum.
                            </li>
                            <li className="leading-relaxed">
                              Kişisel verilerimin, ilgili mevzuat çerçevesinde belirlenen süreler boyunca güvenli bir şekilde saklanacağını ve yetkisiz erişimlere karşı korunacağını biliyorum.
                            </li>
                            <li className="leading-relaxed">
                              Kişisel verilerimin işlenmesiyle ilgili haklarım hakkında bilgilendirildim ve bu haklarımı her zaman kullanabileceğimi anlıyorum.
                            </li>
                          </ol>
                          <p className="leading-relaxed font-semibold">
                            Bu onam metnini okuyup anladığımı ve belirtilen koşulları kabul ettiğimi beyan ederim.
                          </p>
                        </div>
                        <div className="mt-4 flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="consent-checkbox"
                            checked={consentAccepted}
                            onChange={(e) => setConsentAccepted(e.target.checked)}
                            className="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                          />
                          <label htmlFor="consent-checkbox" className="text-sm font-semibold text-blue-900 cursor-pointer flex-1">
                            Yukarıdaki onam metnini okudum, anladım ve kabul ediyorum. Mesajlaşma kayıtlarının saklanmasına ve işlenmesine açık rıza veriyorum.
                          </label>
                        </div>
                        {!consentAccepted && (
                          <p className="text-xs text-red-600 mt-2 ml-8 font-medium">
                            Mesaj göndermek için onam metnini onaylamanız gerekmektedir.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Gönder Butonu */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setShowAskDoctorModal(false);
                          setSelectedDoctor(null);
                          setMessageText("");
                          setSearchDoctorQuery("");
                          setDoctors([]);
                      setSelectedFiles([]);
                      setConsentAccepted(false);
                    }}
                    className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    İptal
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || messageText.length < 10 || uploadingFiles || !consentAccepted}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                  >
                        {(sendingMessage || uploadingFiles) ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {uploadingFiles ? "Dosyalar yükleniyor..." : "Gönderiliyor..."}
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Mesajı Gönder
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mesajlarım Modal */}
        {showMessagesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-slideUp">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white p-6 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Mesajlarım</h3>
                      <p className="text-primary-100 text-sm mt-0.5">Doktorlarınızla olan mesajlaşmalarınız</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMessagesModal(false)}
                    className="w-10 h-10 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex items-center justify-center backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages Content */}
              <div className="overflow-y-auto flex-1 p-6 bg-gradient-to-br from-gray-50 to-white">
                {loadingMessages ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-primary-600">Mesajlar yükleniyor...</p>
                  </div>
                ) : patientMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-primary-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-primary-600 mb-2">Henüz mesajınız yok</p>
                    <p className="text-sm text-primary-500 mb-4">
                      Doktorlarınıza soru sormak için "Doktoruma Sor" butonunu kullanabilirsiniz
                    </p>
                    <button
                      onClick={() => {
                        setShowMessagesModal(false);
                        setShowAskDoctorModal(true);
                      }}
                      className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Doktoruma Sor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientMessages.map((message) => {
                      const hasDoctorReply = message.message.includes("--- DOKTOR YANITI ---");
                      const messageParts = hasDoctorReply ? message.message.split("--- DOKTOR YANITI ---") : [message.message];
                      
                      return (
                        <div
                          key={message.id}
                          className={`border-2 rounded-xl p-6 ${
                            message.status === "PENDING"
                              ? "border-yellow-300 bg-yellow-50"
                              : message.status === "ACTIVE"
                              ? hasDoctorReply
                                ? "border-green-300 bg-green-50"
                                : "border-blue-300 bg-blue-50"
                              : message.status === "CLOSED"
                              ? "border-gray-300 bg-gray-50"
                              : "border-red-300 bg-red-50"
                          }`}
                        >
                          {/* Doktor Bilgileri */}
                          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                            {message.doctor.doctorProfile?.photoUrl ? (
                              <img
                                src={message.doctor.doctorProfile.photoUrl}
                                alt={message.doctor.name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-primary-300"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-200 to-primary-300 flex items-center justify-center border-2 border-primary-300">
                                <span className="text-2xl text-primary-700 font-bold">
                                  {message.doctor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg mb-1">{message.doctor.name}</h4>
                              <p className="text-sm text-gray-600 mb-1">
                                {message.doctor.doctorProfile?.specialization}
                                {message.doctor.doctorProfile?.hospital && ` • ${message.doctor.doctorProfile.hospital}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleString("tr-TR")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  message.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : message.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : message.status === "CLOSED"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {message.status === "PENDING"
                                  ? "Beklemede"
                                  : message.status === "ACTIVE"
                                  ? "Aktif"
                                  : message.status === "CLOSED"
                                  ? "Kapatıldı"
                                  : "Engellendi"}
                              </span>
                              {hasDoctorReply && (
                                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                                  Yeni Yanıt
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hastanın Mesajı */}
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-sm font-semibold text-gray-700">Sizin Mesajınız</span>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <p className="text-gray-800 whitespace-pre-wrap">{messageParts[0].trim()}</p>
                              {/* Mesaj Ekleri */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <p className="text-sm font-semibold text-gray-700 mb-3">Eklenen Belgeler:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {message.attachments.map((attachment: any) => (
                                      <a
                                        key={attachment.id}
                                        href={attachment.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all"
                                      >
                                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                                          {attachment.fileType?.startsWith("image/") ? (
                                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          ) : attachment.fileType === "application/pdf" ? (
                                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                          ) : (
                                            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                                          {attachment.fileSize && (
                                            <p className="text-xs text-gray-500">
                                              {(attachment.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                          )}
                                        </div>
                                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Doktor Yanıtı */}
                          {hasDoctorReply && messageParts.length > 1 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold text-green-700">Doktor Yanıtı</span>
                              </div>
                              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                                <p className="text-gray-800 whitespace-pre-wrap">{messageParts[1].trim()}</p>
                                {message.updatedAt && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Yanıt Tarihi: {new Date(message.updatedAt).toLocaleString("tr-TR")}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Durum Bilgileri */}
                          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                            {message.startedAt && (
                              <span>
                                Başlatıldı: {new Date(message.startedAt).toLocaleString("tr-TR")}
                              </span>
                            )}
                            {message.closedAt && (
                              <span>
                                Kapatıldı: {new Date(message.closedAt).toLocaleString("tr-TR")}
                              </span>
                            )}
                            {message.blockedAt && (
                              <span className="text-red-600 font-semibold">
                                Engellendi: {new Date(message.blockedAt).toLocaleString("tr-TR")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onay Modal - Dashboard */}
        {showConsentModalDashboard && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    consentActionDashboard === "enable" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <svg className={`w-6 h-6 ${
                      consentActionDashboard === "enable" ? "text-green-600" : "text-red-600"
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {consentActionDashboard === "enable" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {consentActionDashboard === "enable" ? "İzni Aktif Et" : "İzni Kapat"}
                  </h3>
                </div>

                <div className="mb-6">
                  {consentActionDashboard === "enable" ? (
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">
                          {consentTypeDashboard === "same" 
                            ? "Aynı hastane içindeki doktorlara" 
                            : "Farklı hastanelerdeki doktorlara"}
                        </strong> veri paylaşımı iznini aktif etmek istediğinize emin misiniz?
                      </p>
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ Aktif edildiğinde, {consentTypeDashboard === "same" 
                            ? "aynı hastane içindeki doktorlar" 
                            : "farklı hastanelerdeki doktorlar"} önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını görebilecektir.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">
                          {consentTypeDashboard === "same" 
                            ? "Aynı hastane içindeki doktorlara" 
                            : "Farklı hastanelerdeki doktorlara"}
                        </strong> veri paylaşımı iznini kapatmak istediğinize emin misiniz?
                      </p>
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">
                          ✗ Kapatıldığında, {consentTypeDashboard === "same" 
                            ? "aynı hastane içindeki doktorlar" 
                            : "farklı hastanelerdeki doktorlar"} önceki görüşmelerinizdeki tahlil, rapor ve doktor notlarını <strong>göremeyecektir</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConsentModalDashboard(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmConsentDashboard}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all ${
                      consentActionDashboard === "enable"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {consentActionDashboard === "enable" ? "Aktif Et" : "Kapat"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Randevularım Modal */}
        {showMyAppointmentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-6 border-b border-primary-200">
                <h3 className="text-2xl font-bold text-primary-900">Doktor Randevularım</h3>
                <button
                  onClick={() => setShowMyAppointmentsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {filteredUpcomingAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-primary-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-primary-600 mb-4">Henüz randevu bulunmuyor</p>
                    <Link
                      href="/doctors"
                      className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Yeni Randevu Al
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUpcomingAppointments.map((appointment) => {
                      const canJoin = canJoinMeeting(appointment.appointmentDate);
                      const appointmentTime = new Date(appointment.appointmentDate);
                      const now = new Date();
                      const diffInMinutes = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
                      
                      return (
                        <div
                          key={appointment.id}
                          className="border border-primary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {appointment.doctor.photoUrl ? (
                                  <img
                                    src={appointment.doctor.photoUrl}
                                    alt={appointment.doctor.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-lg text-primary-600 font-semibold">
                                      {appointment.doctor.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-semibold text-primary-900">
                                    {appointment.doctor.name}
                                  </h4>
                                  <p className="text-sm text-primary-600">
                                    {appointment.doctor.specialization}
                                    {appointment.doctor.hospital && ` • ${appointment.doctor.hospital}`}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-primary-500 mt-2">
                                {new Date(appointment.appointmentDate).toLocaleString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {!canJoin && diffInMinutes > 0 && (
                                <p className="text-sm text-yellow-600 mt-2">
                                  Görüşme {Math.floor(diffInMinutes)} dakika sonra başlayacak
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(appointment.status)}
                              {appointment.status === "CONFIRMED" && appointment.meetingLink && canJoin && (
                                <button
                                  onClick={() => {
                                    setShowMyAppointmentsModal(false);
                                    handleJoinMeeting(appointment);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Görüntülü Görüşmeye Katıl
                                </button>
                              )}
                              {appointment.status === "CONFIRMED" && appointment.meetingLink && !canJoin && (
                                <button
                                  disabled
                                  className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm font-semibold"
                                >
                                  Henüz Zamanı Gelmedi
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-primary-200">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMyAppointmentsModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Kapat
                  </button>
                  <Link
                    href="/doctors"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-center"
                  >
                    Yeni Randevu Al
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rıza Metni Modal */}
        {showConsentModal && selectedAppointmentForMeeting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900">Yasal Rıza ve Onam Metni</h2>
                <p className="text-sm text-gray-600 mt-2">Lütfen aşağıdaki metni dikkatle okuyunuz</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
                  {/* Giriş */}
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

                  {/* Veri Sorumlusu */}
                  <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                    <h3 className="font-semibold text-gray-900 mb-2 text-base">1. Veri Sorumlusu</h3>
                    <p className="text-gray-700">
                      Kişisel verilerinizin işlenmesinden sorumlu olan veri sorumlusu, bu online görüntülü görüşme 
                      hizmetini sunan sağlık kuruluşudur. Tüm kişisel verileriniz, bu kuruluş tarafından KVKK ve 
                      ilgili mevzuat hükümlerine uygun olarak işlenecektir.
                    </p>
                  </div>

                  {/* Kişisel Verilerin İşlenme Amaçları */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h3 className="font-semibold text-blue-900 mb-3 text-base">2. Kişisel Verilerin İşlenme Amaçları</h3>
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

                  {/* Görüşme Kaydı Hakkında Detaylı Bilgi */}
                  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
                    <h3 className="font-semibold text-indigo-900 mb-3 text-base">3. Görüşme Kaydı Hakkında Detaylı Bilgi</h3>
                    <p className="text-indigo-800 mb-3">
                      Online görüntülü görüşme sırasında gerçekleştirilecek kayıt işlemi hakkında aşağıdaki bilgileri 
                      lütfen dikkate alınız:
                    </p>
                    <div className="space-y-3 text-indigo-800">
                      <div>
                        <strong className="block mb-1">3.1. Kayıt Kapsamı:</strong>
                        <p className="ml-4">
                          Görüşme sırasında hem görüntü hem de ses kaydı yapılacaktır. Bu kayıtlar, görüşmenin başlangıcından 
                          bitişine kadar olan tüm süreyi kapsamaktadır. Kayıtlar, görüşme sırasında paylaşılan tüm bilgileri, 
                          görüntüleri ve sesleri içermektedir.
                        </p>
                      </div>
                      <div>
                        <strong className="block mb-1">3.2. Kayıt Erişimi:</strong>
                        <p className="ml-4">
                          Görüşme kayıtlarına yalnızca yetkili hastane yönetimi personeli ve yasal zorunluluklar gereği 
                          yetkili makamlar erişebilecektir. Kayıtlar, yüksek güvenlik standartları ile korunacak ve yetkisiz 
                          erişimlere karşı teknik ve idari tedbirler alınacaktır.
                        </p>
                      </div>
                      <div>
                        <strong className="block mb-1">3.3. Kayıt Saklama Süresi:</strong>
                        <p className="ml-4">
                          Görüşme kayıtları, Türk Tabipleri Birliği Tıbbi Deontoloji Tüzüğü ve ilgili mevzuat hükümleri 
                          gereğince en az 10 (on) yıl süreyle saklanacaktır. Bu süre, yasal saklama yükümlülüklerinin 
                          gerektirdiği sürelerle sınırlı olmayıp, hasta ve doktor haklarının korunması amacıyla da 
                          uzatılabilir.
                        </p>
                      </div>
                      <div>
                        <strong className="block mb-1">3.4. Kayıt Kullanım Alanları:</strong>
                        <p className="ml-4">
                          Görüşme kayıtları yalnızca aşağıdaki amaçlarla kullanılacaktır:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-6 mt-2">
                          <li>Yasal zorunlulukların yerine getirilmesi</li>
                          <li>Tıbbi kayıtların tutulması ve sağlık hizmeti sürekliliğinin sağlanması</li>
                          <li>Hasta ve doktor haklarının korunması amacıyla delil oluşturulması</li>
                          <li>Sağlık hizmeti kalitesinin değerlendirilmesi</li>
                          <li>Hasta güvenliğinin sağlanması ve tıbbi hata önleme çalışmaları</li>
                          <li>Eğitim amaçlı kullanım (yalnızca anonimleştirilmiş verilerle ve ayrıca rıza alınarak)</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="block mb-1">3.5. Kayıt Güvenliği:</strong>
                        <p className="ml-4">
                          Tüm görüşme kayıtları, şifreleme ve erişim kontrolü gibi teknik güvenlik önlemleri ile korunacaktır. 
                          Kayıtlar, yalnızca yetkili personel tarafından, yasal ve tıbbi gereklilikler çerçevesinde erişilebilir 
                          olacaktır.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Kişisel Verilerin Paylaşımı */}
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                    <h3 className="font-semibold text-purple-900 mb-3 text-base">4. Kişisel Verilerin Paylaşımı</h3>
                    <p className="text-purple-800 mb-2">
                      Kişisel verileriniz, aşağıdaki durumlar dışında üçüncü kişilerle paylaşılmayacaktır:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-purple-800 ml-2">
                      <li>Yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşlarına (Sağlık Bakanlığı, Adli Makamlar vb.)</li>
                      <li>Sağlık hizmeti sunumu için gerekli olan durumlarda, sizin açık rızanız ile diğer sağlık kuruluşlarına</li>
                      <li>Acil durumlarda, hayati tehlike söz konusu olduğunda, ilgili sağlık kuruluşlarına</li>
                      <li>Sigorta şirketleri ile fatura ve ödeme işlemlerinin gerçekleştirilmesi (yalnızca gerekli bilgilerle)</li>
                      <li>Yasal zorunluluklar gereği mahkeme kararları ve savcılık talimatları doğrultusunda</li>
                    </ul>
                  </div>

                  {/* Hastanın Hakları */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                    <h3 className="font-semibold text-yellow-900 mb-3 text-base">5. Hastanın Hakları (KVKK Madde 11)</h3>
                    <p className="text-yellow-800 mb-3">
                      6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 11. maddesi gereğince, kişisel verileriniz 
                      hakkında aşağıdaki haklara sahipsiniz:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-yellow-800 ml-2">
                      <li><strong>Bilgi talep etme hakkı:</strong> Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                      <li><strong>Erişim hakkı:</strong> İşlenen kişisel verileriniz hakkında bilgi talep etme</li>
                      <li><strong>Düzeltme hakkı:</strong> Yanlış veya eksik işlenen kişisel verilerinizin düzeltilmesini isteme</li>
                      <li><strong>Silme hakkı:</strong> Kanunda öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini isteme</li>
                      <li><strong>İtiraz etme hakkı:</strong> Kişisel verilerinizin işlenmesine itiraz etme</li>
                      <li><strong>Veri taşınabilirliği hakkı:</strong> Kişisel verilerinizin başka bir veri sorumlusuna aktarılmasını isteme</li>
                      <li><strong>İşleme itiraz etme hakkı:</strong> Kişisel verilerinizin kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
                    </ul>
                    <p className="text-yellow-800 mt-3">
                      Bu haklarınızı kullanmak için, yazılı olarak veri sorumlusuna başvurabilirsiniz. Başvurularınız, 
                      en geç 30 (otuz) gün içinde sonuçlandırılacaktır.
                    </p>
                  </div>

                  {/* Rıza ve Onam */}
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <h3 className="font-semibold text-green-900 mb-3 text-base">6. Rıza ve Onam</h3>
                    <p className="text-green-800 mb-2">
                      Bu metni onaylayarak:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-green-800 ml-2">
                      <li>Online görüntülü görüşme hizmetini kullanmayı kabul ettiğinizi</li>
                      <li>Görüşme sırasında görüntü ve ses kaydı yapılacağını bildiğinizi ve kabul ettiğinizi</li>
                      <li>Kişisel verilerinizin yukarıda belirtilen amaçlarla işlenmesine açık rıza verdiğinizi</li>
                      <li>Görüşme kayıtlarının yasal ve tıbbi amaçlarla saklanacağını ve kullanılacağını kabul ettiğinizi</li>
                      <li>Bu metinde belirtilen tüm bilgileri okuduğunuzu ve anladığınızı</li>
                      <li>Haklarınız hakkında bilgilendirildiğinizi</li>
                    </ul>
                    <p className="text-green-800 mt-3">
                      beyan ve taahhüt edersiniz.
                    </p>
                  </div>

                  {/* Önemli Uyarılar */}
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <h3 className="font-semibold text-red-900 mb-3 text-base">7. Önemli Uyarılar</h3>
                    <ul className="list-disc list-inside space-y-2 text-red-800 ml-2">
                      <li>Bu rıza metnini onaylamadan görüşmeye katılamazsınız. Rıza vermeden görüşmeye katılım sağlanamaz.</li>
                      <li>Rızanızı istediğiniz zaman geri alabilirsiniz. Ancak, rızanızı geri almanız durumunda, görüşme 
                          kayıtlarının yasal zorunluluklar gereğince saklanmaya devam edeceğini bilmelisiniz.</li>
                      <li>Görüşme sırasında paylaştığınız tüm bilgiler gizlilik kuralları çerçevesinde korunacaktır.</li>
                      <li>Görüşme kayıtları, yalnızca yasal ve tıbbi amaçlarla kullanılacak olup, ticari amaçlarla 
                          kullanılmayacaktır.</li>
                      <li>Bu rıza metni, Türkiye Cumhuriyeti yasalarına tabidir ve Türkçe dilinde hazırlanmıştır.</li>
                    </ul>
                  </div>

                  {/* İletişim Bilgileri */}
                  <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                    <h3 className="font-semibold text-gray-900 mb-2 text-base">8. İletişim ve Başvuru</h3>
                    <p className="text-gray-700">
                      Kişisel verileriniz hakkındaki haklarınızı kullanmak veya sorularınız için, veri sorumlusu 
                      sağlık kuruluşuna yazılı olarak başvurabilirsiniz. Başvurularınız, KVKK uyarınca en geç 
                      30 (otuz) gün içinde sonuçlandırılacaktır.
                    </p>
                  </div>

                  {/* Son Uyarı */}
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                    <p className="text-orange-800 font-semibold text-base mb-2">
                      ⚠️ ÖNEMLİ UYARI
                    </p>
                    <p className="text-orange-800">
                      Bu rıza metnini onaylamadan görüşmeye katılamazsınız. Lütfen tüm maddeleri dikkatle okuduktan 
                      sonra onaylayınız. Onayladığınız takdirde, yukarıda belirtilen tüm koşulları kabul etmiş 
                      sayılırsınız.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-8 mb-4 flex-shrink-0">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-200 p-8 flex-shrink-0">
                  <button
                    onClick={() => {
                      setShowConsentModal(false);
                      setSelectedAppointmentForMeeting(null);
                      setError("");
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    disabled={submittingConsent}
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleConsentSubmit}
                    disabled={submittingConsent}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                  >
                    {submittingConsent ? "Kaydediliyor..." : "Onaylıyorum ve Görüşmeye Katılıyorum"}
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Randevu Detay Modal */}
        {selectedPastAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 p-6 border-b border-primary-200">
                <h3 className="text-2xl font-bold text-primary-900">Randevu Detayları</h3>
                <button
                  onClick={() => setSelectedPastAppointment(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Doktor Bilgileri */}
                <div className="bg-primary-50 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-900 mb-3">Doktor Bilgileri</h4>
                  <div className="flex items-center gap-4">
                    {selectedPastAppointment.doctor.photoUrl ? (
                      <img
                        src={selectedPastAppointment.doctor.photoUrl}
                        alt={selectedPastAppointment.doctor.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-2xl text-primary-600 font-semibold">
                          {selectedPastAppointment.doctor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-primary-900 text-lg">
                        {selectedPastAppointment.doctor.name}
                      </p>
                      <p className="text-primary-600">{selectedPastAppointment.doctor.email}</p>
                      {selectedPastAppointment.doctor.phone && (
                        <p className="text-primary-600">{selectedPastAppointment.doctor.phone}</p>
                      )}
                      {selectedPastAppointment.doctor.specialization && (
                        <p className="text-primary-700 mt-1">
                          {selectedPastAppointment.doctor.specialization}
                        </p>
                      )}
                      {selectedPastAppointment.doctor.hospital && (
                        <p className="text-primary-700">🏥 {selectedPastAppointment.doctor.hospital}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Randevu Bilgileri */}
                <div className="bg-primary-50 rounded-lg p-4">
                  <h4 className="font-semibold text-primary-900 mb-3">Randevu Bilgileri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-primary-600">Tarih ve Saat</p>
                      <p className="font-semibold text-primary-900">
                        {new Date(selectedPastAppointment.appointmentDate).toLocaleString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-primary-600">Durum</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          selectedPastAppointment.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : selectedPastAppointment.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedPastAppointment.status === "COMPLETED"
                          ? "Tamamlandı"
                          : selectedPastAppointment.status === "CANCELLED"
                          ? "İptal Edildi"
                          : "Geçmiş"}
                      </span>
                    </div>
                    {selectedPastAppointment.notes && (
                      <div className="col-span-2">
                        <p className="text-sm text-primary-600">Notlar</p>
                        <p className="text-primary-900">{selectedPastAppointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Yüklenen Belgeler */}
                {selectedPastAppointment.documents && selectedPastAppointment.documents.length > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary-900 mb-3">Yüklenen Belgeler</h4>
                    <div className="space-y-2">
                      {selectedPastAppointment.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-primary-200"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="font-medium text-primary-900">{doc.title}</p>
                              <p className="text-sm text-primary-600">
                                {doc.documentType} • {doc.aiAnalyzed ? "AI Analiz Edildi" : "Analiz Bekliyor"}
                              </p>
                              {doc.description && (
                                <p className="text-xs text-primary-500 mt-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 text-sm font-semibold"
                          >
                            Görüntüle →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tıbbi Raporlar */}
                {selectedPastAppointment.medicalReports && selectedPastAppointment.medicalReports.length > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary-900 mb-3">Tıbbi Raporlar</h4>
                    <div className="space-y-3">
                      {selectedPastAppointment.medicalReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3 bg-white rounded-lg border border-primary-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-primary-900">{report.title}</p>
                              <p className="text-sm text-primary-600">
                                {report.reportType} • {report.aiGenerated ? "AI Tarafından Oluşturuldu" : "Doktor Tarafından Oluşturuldu"}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                report.approvalStatus === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : report.approvalStatus === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {report.approvalStatus === "APPROVED"
                                ? "Onaylandı"
                                : report.approvalStatus === "REJECTED"
                                ? "Reddedildi"
                                : "Bekliyor"}
                            </span>
                          </div>
                          <div className="mt-2 p-2 bg-primary-50 rounded text-sm text-primary-700 whitespace-pre-wrap">
                            {report.content}
                          </div>
                          {report.doctorNotes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                              <p className="font-semibold">Doktor Notları:</p>
                              <p>{report.doctorNotes}</p>
                            </div>
                          )}
                          {report.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                              <p className="font-semibold">Red Sebebi:</p>
                              <p>{report.rejectionReason}</p>
                            </div>
                          )}
                          {report.fileUrl && (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-primary-600 hover:text-primary-800 text-sm font-semibold"
                            >
                              Dosyayı Görüntüle →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reçeteler */}
                {selectedPastAppointment.prescriptions && selectedPastAppointment.prescriptions.length > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary-900 mb-3">Reçeteler</h4>
                    <div className="space-y-3">
                      {selectedPastAppointment.prescriptions.map((prescription) => (
                        <div
                          key={prescription.id}
                          className="p-3 bg-white rounded-lg border border-primary-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm text-primary-600">
                              {new Date(prescription.prescriptionDate).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                          {prescription.diagnosis && (
                            <div className="mb-2">
                              <p className="text-sm font-semibold text-primary-900">Tanı:</p>
                              <p className="text-primary-700">{prescription.diagnosis}</p>
                            </div>
                          )}
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-primary-900">İlaçlar:</p>
                            <p className="text-primary-700 whitespace-pre-wrap">{prescription.medications}</p>
                          </div>
                          {prescription.notes && (
                            <div>
                              <p className="text-sm font-semibold text-primary-900">Notlar:</p>
                              <p className="text-primary-700">{prescription.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Kayıtları */}
                {selectedPastAppointment.videoRecordings && selectedPastAppointment.videoRecordings.length > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary-900 mb-3">Görüşme Kayıtları</h4>
                    <div className="space-y-3">
                      {selectedPastAppointment.videoRecordings.map((recording) => (
                        <div
                          key={recording.id}
                          className="p-3 bg-white rounded-lg border border-primary-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-primary-900">Görüntülü Görüşme</p>
                              <p className="text-sm text-primary-600">
                                {new Date(recording.recordingDate).toLocaleString("tr-TR")}
                              </p>
                              {recording.duration && (
                                <p className="text-sm text-primary-600">
                                  Süre: {Math.floor(recording.duration / 60)} dakika {recording.duration % 60} saniye
                                </p>
                              )}
                              <p className="text-sm text-primary-600">
                                Rıza: {recording.consentGiven ? "✅ Verildi" : "❌ Verilmedi"}
                              </p>
                            </div>
                          </div>
                          {recording.notes && (
                            <p className="text-sm text-primary-700 mt-2">{recording.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-primary-200">
                <button
                  onClick={() => setSelectedPastAppointment(null)}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Doktor Önerisi Modal */}
        {showAIChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-slideUp">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 text-white p-6 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">AI Doktor Önerisi</h3>
                      <p className="text-purple-100 text-sm mt-0.5">Şikayetlerinize göre uygun doktor bulun</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAIChatModal(false);
                      setAiComplaint("");
                      setAiSuggestion(null);
                    }}
                    className="w-10 h-10 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all flex items-center justify-center backdrop-blur-sm"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-900 mb-2">Nasıl Çalışır?</h4>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          Şikayetlerinizi detaylı bir şekilde yazın. Yapay zeka şikayetlerinizi analiz ederek size en uygun doktor uzmanlık alanını önerecektir. Bu öneriye göre ilgili uzmanlık alanındaki doktorları görüntüleyip randevu alabilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Complaint Input */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Şikayetleriniz
                      <span className="text-xs font-normal text-gray-500">(En az 10 karakter)</span>
                    </label>
                    <textarea
                      value={aiComplaint}
                      onChange={(e) => setAiComplaint(e.target.value)}
                      placeholder="Örnek: Boğazlarım şiş, burnum tıkalı veya akıyor, biraz da ateşim var, soğuk soğuk terliyorum. Hangi alana gitmem lazım?"
                      rows={6}
                      className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900 bg-white transition-all shadow-sm hover:shadow-md"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Şikayetlerinizi mümkün olduğunca detaylı yazın
                      </p>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        aiComplaint.length > 800 
                          ? 'text-red-600 bg-red-50' 
                          : aiComplaint.length > 600 
                          ? 'text-amber-600 bg-amber-50' 
                          : 'text-gray-500 bg-gray-100'
                      }`}>
                        {aiComplaint.length}/1000
                      </span>
                    </div>
                  </div>

                  {/* AI Suggestion Result */}
                  {aiSuggestion && (
                    <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-2 border-green-300 rounded-xl p-6 animate-slideUp">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-green-900 mb-2">Önerilen Uzmanlık Alanı</h4>
                          <p className="text-2xl font-bold text-green-700 mb-3">{aiSuggestion.specialization}</p>
                          <p className="text-sm text-green-800 leading-relaxed">{aiSuggestion.explanation}</p>
                        </div>
                      </div>
                      <Link
                        href={`/doctors?specialization=${encodeURIComponent(aiSuggestion.specialization)}`}
                        className="block w-full text-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {aiSuggestion.specialization} Doktorlarını Görüntüle
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowAIChatModal(false);
                        setAiComplaint("");
                        setAiSuggestion(null);
                      }}
                      className="px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      İptal
                    </button>
                    <button
                      onClick={handleAISuggestion}
                      disabled={aiSuggesting || aiComplaint.length < 10}
                      className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                    >
                      {aiSuggesting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analiz ediliyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Analiz Et ve Öner
                        </>
                      )}
                    </button>
                  </div>
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

