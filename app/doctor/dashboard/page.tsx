"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  lastAppointment?: {
    id: string;
    appointmentDate: string;
    status: string;
  };
  patientProfile?: {
    id: string;
    tcKimlikNo?: string;
    bloodType?: string;
    allergies?: string;
    chronicDiseases?: string;
    medications?: string;
  };
}

interface PatientDetails {
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    patientProfile?: {
      id: string;
      tcKimlikNo?: string;
      dateOfBirth?: string;
      gender?: string;
      bloodType?: string;
      allergies?: string;
      chronicDiseases?: string;
      medications?: string;
      documents: Array<{
        id: string;
        title: string;
        documentType: string;
        fileUrl: string;
        documentDate?: string;
        createdAt: string;
      }>;
      medicalHistory: Array<{
        id: string;
        diagnosis: string;
        treatment?: string;
        notes?: string;
        visitDate: string;
      }>;
    };
  };
  statistics: {
    totalDocuments: number;
    totalMedicalHistory: number;
    totalAppointments: number;
  };
}

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [searchEmail, setSearchEmail] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchTcKimlikNo, setSearchTcKimlikNo] = useState("");
  const [searchType, setSearchType] = useState<"email" | "name" | "tc">("email");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "search" | "appointments" | "details" | "messages" | "followed">("overview");
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [showTodayAppointments, setShowTodayAppointments] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [loadingTodayAppointments, setLoadingTodayAppointments] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [loadingAllPatients, setLoadingAllPatients] = useState(false);
  const [showWeeklyAppointments, setShowWeeklyAppointments] = useState(false);
  const [weeklyAppointments, setWeeklyAppointments] = useState<any[]>([]);
  const [loadingWeeklyAppointments, setLoadingWeeklyAppointments] = useState(false);
  const [showPendingReports, setShowPendingReports] = useState(false);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [loadingPendingReports, setLoadingPendingReports] = useState(false);
  const [processingReport, setProcessingReport] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReportForReject, setSelectedReportForReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionContent, setRejectionContent] = useState("");
  const [rejectionDoctorNotes, setRejectionDoctorNotes] = useState("");
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showWriteReportModal, setShowWriteReportModal] = useState(false);
  const [showWritePrescriptionModal, setShowWritePrescriptionModal] = useState(false);
  const [showOnlineMeetingModal, setShowOnlineMeetingModal] = useState(false);
  const [appointmentPatientSearch, setAppointmentPatientSearch] = useState("");
  const [appointmentPatientResults, setAppointmentPatientResults] = useState<any[]>([]);
  const [selectedAppointmentPatient, setSelectedAppointmentPatient] = useState<any>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [reportPatientSearch, setReportPatientSearch] = useState("");
  const [reportPatientResults, setReportPatientResults] = useState<any[]>([]);
  const [selectedReportPatient, setSelectedReportPatient] = useState<any>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportType, setReportType] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [creatingReport, setCreatingReport] = useState(false);
  const [prescriptionPatientSearch, setPrescriptionPatientSearch] = useState("");
  const [prescriptionPatientResults, setPrescriptionPatientResults] = useState<any[]>([]);
  const [selectedPrescriptionPatient, setSelectedPrescriptionPatient] = useState<any>(null);
  const [prescriptionAppointments, setPrescriptionAppointments] = useState<any[]>([]);
  const [selectedPrescriptionAppointment, setSelectedPrescriptionAppointment] = useState<any>(null);
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState("");
  const [prescriptionMedications, setPrescriptionMedications] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [selectedMeetingAppointment, setSelectedMeetingAppointment] = useState<any>(null);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [stats, setStats] = useState({
    todayAppointments: 0,
    weeklyAppointments: 0,
    totalPatients: 0,
    pendingReports: 0,
    todayCompleted: 0,
    todayPending: 0,
  });
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [followedPatients, setFollowedPatients] = useState<any[]>([]);
  const [loadingFollowedPatients, setLoadingFollowedPatients] = useState(false);
  const [isFollowingPatient, setIsFollowingPatient] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "DOCTOR") {
      router.push("/auth/login?role=doctor");
    } else if (session && session.user.role === "DOCTOR") {
      fetchVerificationStatus();
      fetchStats();
      fetchTodayAppointments();
      fetchActivities();
      fetchFollowedPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  const fetchVerificationStatus = async () => {
    try {
      if (!session?.user?.id) return;

      const response = await fetch("/api/doctors/profile", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.profile?.verificationStatus || null);
      }
    } catch (err) {
      console.error("Error fetching verification status:", err);
    }
  };

  const fetchStats = async () => {
    try {
      if (!session?.user?.id) {
        console.log("❌ Session veya user ID yok");
        return;
      }

      const response = await fetch("/api/doctors/stats", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Bilinmeyen hata" }));
        console.error("❌ Stats API hatası:", response.status, errorData);
        setError(errorData.error || "İstatistikler alınamadı");
        return;
      }

      const data = await response.json();
      console.log("✅ Stats data:", data);
      setStats({
        todayAppointments: data.todayAppointments || 0,
        weeklyAppointments: data.weeklyAppointments || 0,
        totalPatients: data.totalPatients || 0,
        pendingReports: data.pendingReports || 0,
        todayCompleted: data.todayCompleted || 0,
        todayPending: data.todayPending || 0,
      });
    } catch (err: any) {
      console.error("❌ Error fetching stats:", err);
      setError(err.message || "Bir hata oluştu");
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingTodayAppointments(true);
      const response = await fetch("/api/doctors/appointments/today", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Randevular alınamadı");
      }

      const data = await response.json();
      setTodayAppointments(data.appointments || []);
      // Modal otomatik açılmasın, sadece kullanıcı "Tümünü Gör" butonuna tıkladığında açılsın
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoadingTodayAppointments(false);
    }
  };

  const fetchActivities = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingActivities(true);
      const response = await fetch("/api/doctors/activities", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Aktiviteler alınamadı");
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      // Hata durumunda sessizce devam et, aktiviteler boş kalabilir
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchFollowedPatients = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingFollowedPatients(true);
      const response = await fetch("/api/doctors/followed-patients", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Takip edilen hastalar alınamadı");
      }

      const data = await response.json();
      setFollowedPatients(data.patients || []);
      
      // Takip durumunu kontrol et
      const followingMap: { [key: string]: boolean } = {};
      (data.patients || []).forEach((p: any) => {
        followingMap[p.patientId] = true;
      });
      setIsFollowingPatient(followingMap);
    } catch (err: any) {
      console.error("Error fetching followed patients:", err);
    } finally {
      setLoadingFollowedPatients(false);
    }
  };

  const followPatient = async (patientId: string) => {
    try {
      if (!session?.user?.id) return;

      const response = await fetch("/api/doctors/followed-patients", {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hasta takip edilemedi");
      }

      showSuccess("Hasta takip listesine eklendi");
      await fetchFollowedPatients();
    } catch (err: any) {
      showError(err.message || "Hasta takip edilirken bir hata oluştu");
    }
  };

  const unfollowPatient = async (patientId: string) => {
    try {
      if (!session?.user?.id) return;

      const response = await fetch(
        `/api/doctors/followed-patients?patientId=${patientId}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": session.user.id,
            "x-user-role": session.user.role,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Takip kaldırılamadı");
      }

      showSuccess("Hasta takip listesinden çıkarıldı");
      await fetchFollowedPatients();
    } catch (err: any) {
      showError(err.message || "Takip kaldırılırken bir hata oluştu");
    }
  };

  const fetchMessages = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingMessages(true);
      const response = await fetch("/api/doctors/messages", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Mesajlar alınamadı");
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message || "Mesajlar alınırken bir hata oluştu");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleStartConversation = async (messageId: string) => {
    try {
      if (!session?.user?.id) return;

      setProcessingMessage(messageId);
      const response = await fetch(`/api/doctors/messages/${messageId}/start`, {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Görüşme başlatılamadı");
      }

      showSuccess("Görüşme başlatıldı");
      await fetchMessages();
    } catch (err: any) {
      showError(err.message || "Bir hata oluştu");
    } finally {
      setProcessingMessage(null);
    }
  };

  const handleCloseConversation = async (messageId: string) => {
    if (!confirm("Görüşmeyi kapatmak istediğinize emin misiniz? Hasta artık size yazamayacak.")) {
      return;
    }

    try {
      if (!session?.user?.id) return;

      setProcessingMessage(messageId);
      const response = await fetch(`/api/doctors/messages/${messageId}/close`, {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Görüşme kapatılamadı");
      }

      showSuccess("Görüşme kapatıldı");
      await fetchMessages();
    } catch (err: any) {
      showError(err.message || "Bir hata oluştu");
    } finally {
      setProcessingMessage(null);
    }
  };

  const handleBlockPatient = async (messageId: string) => {
    if (!confirm("Bu hastayı engellemek istediğinize emin misiniz? Hasta artık size mesaj gönderemeyecek.")) {
      return;
    }

    try {
      if (!session?.user?.id) return;

      setProcessingMessage(messageId);
      const response = await fetch(`/api/doctors/messages/${messageId}/block`, {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Hasta engellenemedi");
      }

      showSuccess("Hasta engellendi");
      await fetchMessages();
    } catch (err: any) {
      showError(err.message || "Bir hata oluştu");
    } finally {
      setProcessingMessage(null);
    }
  };

  const fetchAllPatients = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingAllPatients(true);
      const response = await fetch("/api/doctors/patients", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Hastalar alınamadı");
      }

      const data = await response.json();
      setAllPatients(data.patients || []);
      setShowAllPatients(true);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoadingAllPatients(false);
    }
  };

  const fetchWeeklyAppointments = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingWeeklyAppointments(true);
      const response = await fetch("/api/doctors/appointments/week", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Randevular alınamadı");
      }

      const data = await response.json();
      setWeeklyAppointments(data.appointments || []);
      setShowWeeklyAppointments(true);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoadingWeeklyAppointments(false);
    }
  };

  const fetchPendingReports = async () => {
    try {
      if (!session?.user?.id) return;

      setLoadingPendingReports(true);
      const response = await fetch("/api/doctors/reports/pending", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Raporlar alınamadı");
      }

      const data = await response.json();
      setPendingReports(data.reports || []);
      setShowPendingReports(true);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoadingPendingReports(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    setProcessingReport(reportId);
    setError("");

    try {
      if (!session?.user?.id) return;

      const response = await fetch(`/api/doctors/reports/${reportId}/approve`, {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Onay işlemi başarısız");
      }

      // Listeyi yenile
      await fetchPendingReports();
      // İstatistikleri de yenile
      await fetchStats();
      setProcessingReport(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setProcessingReport(null);
    }
  };

  const handleRejectReport = async () => {
    if (!selectedReportForReject || !rejectionReason.trim()) {
      setError("Red sebebi gereklidir");
      return;
    }

    setProcessingReport(selectedReportForReject);
    setError("");

    try {
      if (!session?.user?.id) return;

      const response = await fetch(`/api/doctors/reports/${selectedReportForReject}/reject`, {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          content: rejectionContent.trim() || selectedReportData?.content || "",
          doctorNotes: rejectionDoctorNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Red işlemi başarısız");
      }

      // Modal'ı kapat ve listeyi yenile
      setShowRejectModal(false);
      setRejectionReason("");
      setRejectionContent("");
      setRejectionDoctorNotes("");
      setSelectedReportForReject(null);
      setSelectedReportData(null);
      await fetchPendingReports();
      // İstatistikleri de yenile
      await fetchStats();
      setProcessingReport(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setProcessingReport(null);
    }
  };

  const openRejectModal = (reportId: string) => {
    const report = pendingReports.find(r => r.id === reportId);
    setSelectedReportForReject(reportId);
    setSelectedReportData(report);
    setShowRejectModal(true);
    setRejectionReason("");
    setRejectionContent(report?.content || "");
    setRejectionDoctorNotes("");
  };

  const handleSearchAppointmentPatient = async () => {
    if (!session?.user?.id || appointmentPatientSearch.length < 2) return;

    try {
      // Arama tipini belirle (email, name veya tc)
      const params = new URLSearchParams();
      if (appointmentPatientSearch.includes("@")) {
        params.append("email", appointmentPatientSearch);
      } else if (/^\d{11}$/.test(appointmentPatientSearch)) {
        params.append("tcKimlikNo", appointmentPatientSearch);
      } else {
        params.append("name", appointmentPatientSearch);
      }

      const response = await fetch(`/api/patients/search?${params.toString()}`, {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hasta aranırken bir hata oluştu");
      }

      const data = await response.json();
      setAppointmentPatientResults(data.patients || []);
    } catch (err: any) {
      setError(err.message || "Hasta aranırken bir hata oluştu");
      setAppointmentPatientResults([]);
    }
  };

  const handleSearchReportPatient = async () => {
    if (!session?.user?.id || reportPatientSearch.length < 2) return;

    try {
      const params = new URLSearchParams();
      if (reportPatientSearch.includes("@")) {
        params.append("email", reportPatientSearch);
      } else if (/^\d{11}$/.test(reportPatientSearch)) {
        params.append("tcKimlikNo", reportPatientSearch);
      } else {
        params.append("name", reportPatientSearch);
      }

      const response = await fetch(`/api/patients/search?${params.toString()}`, {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hasta aranırken bir hata oluştu");
      }

      const data = await response.json();
      setReportPatientResults(data.patients || []);
    } catch (err: any) {
      setError(err.message || "Hasta aranırken bir hata oluştu");
      setReportPatientResults([]);
    }
  };

  const handleSearchPrescriptionPatient = async () => {
    if (!session?.user?.id || prescriptionPatientSearch.length < 2) return;

    try {
      const params = new URLSearchParams();
      if (prescriptionPatientSearch.includes("@")) {
        params.append("email", prescriptionPatientSearch);
      } else if (/^\d{11}$/.test(prescriptionPatientSearch)) {
        params.append("tcKimlikNo", prescriptionPatientSearch);
      } else {
        params.append("name", prescriptionPatientSearch);
      }

      const response = await fetch(`/api/patients/search?${params.toString()}`, {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hasta aranırken bir hata oluştu");
      }

      const data = await response.json();
      setPrescriptionPatientResults(data.patients || []);
    } catch (err: any) {
      setError(err.message || "Hasta aranırken bir hata oluştu");
      setPrescriptionPatientResults([]);
    }
  };

  const handleLoadPrescriptionAppointments = async (patientId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Randevular alınamadı");
      }

      const data = await response.json();
      // Sadece CONFIRMED veya COMPLETED randevuları göster
      const validAppointments = (data.patient?.patientAppointments || []).filter(
        (apt: any) => apt.status === "CONFIRMED" || apt.status === "COMPLETED"
      );
      setPrescriptionAppointments(validAppointments);
    } catch (err: any) {
      setError(err.message || "Randevular alınırken bir hata oluştu");
      setPrescriptionAppointments([]);
    }
  };

  const fetchAvailableMeetings = async () => {
    if (!session?.user?.id) return;

    setLoadingMeetings(true);
    try {
      const response = await fetch("/api/doctors/appointments/available-for-meeting", {
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Randevular alınamadı");
      }

      const data = await response.json();
      setAvailableMeetings(data.appointments || []);
    } catch (err: any) {
      setError(err.message || "Randevular alınırken bir hata oluştu");
      setAvailableMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleStartMeeting = async (appointment: any) => {
    if (!session?.user?.id) return;

    setSelectedMeetingAppointment(appointment);
    setError("");

    try {
      // Jitsi Meet görüşme linki oluştur
      const meetingId = `muayene-${appointment.id}-${Date.now()}`;
      const meetingUrl = `${window.location.origin}/meeting/${meetingId}?appointmentId=${appointment.id}&doctorId=${session.user.id}&patientId=${appointment.patient.id}`;

      // Görüşmeyi başlat (API'ye kaydet)
      const response = await fetch("/api/doctors/meetings/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
        body: JSON.stringify({
          appointmentId: appointment.id,
          meetingLink: meetingUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Görüşme başlatılamadı");
      }

      const data = await response.json();
      setMeetingLink(meetingUrl);
      setMeetingStarted(true);

      // Yeni pencerede görüşmeyi aç
      window.open(meetingUrl, "_blank", "width=1200,height=800");
    } catch (err: any) {
      const errorMessage = err.message || "Görüşme başlatılırken bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleCreatePrescription = async () => {
    if (!session?.user?.id || !selectedPrescriptionPatient || !selectedPrescriptionAppointment || !prescriptionMedications) {
      const errorMessage = "Lütfen tüm zorunlu alanları doldurunuz";
      setError(errorMessage);
      showError(errorMessage);
      return;
    }

    setCreatingPrescription(true);
    setError("");

    try {
      const response = await fetch("/api/doctors/prescriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
        body: JSON.stringify({
          appointmentId: selectedPrescriptionAppointment.id,
          patientId: selectedPrescriptionPatient.id,
          diagnosis: prescriptionDiagnosis || null,
          medications: prescriptionMedications,
          notes: prescriptionNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Reçete oluşturulurken bir hata oluştu");
      }

      const data = await response.json();

      showSuccess("Reçete başarıyla oluşturuldu!");
      setShowWritePrescriptionModal(false);
      setSelectedPrescriptionPatient(null);
      setPrescriptionPatientSearch("");
      setPrescriptionPatientResults([]);
      setPrescriptionAppointments([]);
      setSelectedPrescriptionAppointment(null);
      setPrescriptionDiagnosis("");
      setPrescriptionMedications("");
      setPrescriptionNotes("");
      setError("");

      // İstatistikleri yenile
      fetchStats();
    } catch (err: any) {
      const errorMessage = err.message || "Reçete oluşturulurken bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setCreatingPrescription(false);
    }
  };

  const handleCreateReport = async () => {
    if (!session?.user?.id || !selectedReportPatient || !reportTitle || !reportType || !reportContent) {
      const errorMessage = "Lütfen tüm zorunlu alanları doldurunuz";
      setError(errorMessage);
      showError(errorMessage);
      return;
    }

    setCreatingReport(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("patientId", selectedReportPatient.id);
      formData.append("title", reportTitle);
      formData.append("reportType", reportType);
      formData.append("content", reportContent);
      if (reportFile) {
        formData.append("file", reportFile);
      }

      const response = await fetch("/api/doctors/reports/create", {
        method: "POST",
        headers: {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rapor oluşturulurken bir hata oluştu");
      }

      const data = await response.json();

      showSuccess("Rapor başarıyla oluşturuldu!");
      setShowWriteReportModal(false);
      setSelectedReportPatient(null);
      setReportPatientSearch("");
      setReportPatientResults([]);
      setReportTitle("");
      setReportType("");
      setReportContent("");
      setReportFile(null);
      setError("");

      // İstatistikleri yenile
      fetchStats();
    } catch (err: any) {
      const errorMessage = err.message || "Rapor oluşturulurken bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setCreatingReport(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!session?.user?.id || !selectedAppointmentPatient || !appointmentDate || !appointmentTime) {
      setError("Lütfen tüm zorunlu alanları doldurunuz");
      return;
    }

    setCreatingAppointment(true);
    setError("");

    try {
      // Tarih ve saati birleştir
      const dateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const isoDateTime = dateTime.toISOString();

      const response = await fetch("/api/doctors/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        },
        credentials: "include",
        body: JSON.stringify({
          patientId: selectedAppointmentPatient.id,
          appointmentDate: isoDateTime,
          notes: appointmentNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Randevu oluşturulurken bir hata oluştu");
      }

      const data = await response.json();

      // Başarılı - modal'ı kapat ve formu temizle
      showSuccess("Randevu başarıyla oluşturuldu! Hastaya email ve SMS bildirimi gönderildi.");
      setShowNewAppointmentModal(false);
      setSelectedAppointmentPatient(null);
      setAppointmentPatientSearch("");
      setAppointmentPatientResults([]);
      setAppointmentDate("");
      setAppointmentTime("");
      setAppointmentNotes("");
      setError("");

      // İstatistikleri yenile
      fetchStats();
      
      // Eğer online görüşme modalı açıksa, listeyi yenile
      if (showOnlineMeetingModal) {
        fetchAvailableMeetings();
      }
    } catch (err: any) {
      const errorMessage = err.message || "Randevu oluşturulurken bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setCreatingAppointment(false);
    }
  };

  const searchPatients = async () => {
    if (verificationStatus !== "APPROVED") {
      setError("Hasta araması yapabilmek için hesabınızın onaylanmış olması gerekmektedir.");
      return;
    }

    // Arama tipine göre validasyon
    if (searchType === "email" && searchEmail.length < 3) {
      setError("Email için en az 3 karakter giriniz");
      return;
    }

    if (searchType === "name" && searchName.length < 2) {
      setError("Ad/Soyad için en az 2 karakter giriniz");
      return;
    }

    if (searchType === "tc" && searchTcKimlikNo.length !== 11) {
      setError("T.C. Kimlik No 11 haneli olmalıdır");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Arama parametrelerini oluştur
      const params = new URLSearchParams();
      if (searchType === "email" && searchEmail) {
        params.append("email", searchEmail);
      }
      if (searchType === "name" && searchName) {
        params.append("name", searchName);
      }
      if (searchType === "tc" && searchTcKimlikNo) {
        params.append("tcKimlikNo", searchTcKimlikNo);
      }

      const response = await fetch(`/api/patients/search?${params.toString()}`, {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Arama başarısız");
      }

      const data = await response.json();
      setSearchResults(data.patients);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const viewPatientDetails = async (patientId: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
      });

      if (!response.ok) {
        throw new Error("Hasta bilgileri alınamadı");
      }

      const data = await response.json();
      setSelectedPatient(data);
      setActiveTab("details");
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div className="flex justify-center items-center min-h-screen">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative pb-12">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Doktor Paneli</h1>
              <p className="text-sm text-gray-600">Hoş geldiniz, {session?.user?.name}</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/doctor/profile"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Profilim
              </Link>
              <button
                onClick={() => router.push("/api/auth/signout")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Verification Status Banner */}
        {verificationStatus === "PENDING" && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 px-6 py-4 rounded-lg mb-6 flex items-center gap-4">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Hesabınız onay bekliyor</p>
              <p className="text-sm">Belgeleriniz admin tarafından incelendikten sonra hesabınız aktif olacaktır. Onay süreci genellikle 1-2 iş günü sürmektedir.</p>
            </div>
          </div>
        )}

        {verificationStatus === "REJECTED" && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg mb-6 flex items-center gap-4">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold">Hesabınız reddedildi</p>
              <p className="text-sm">Hesabınız admin tarafından reddedilmiştir. Detaylı bilgi için lütfen bizimle iletişime geçin.</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Genel Bakış
              </div>
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === "appointments"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Randevularım
              </div>
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === "search"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Hasta Arama
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("messages");
                fetchMessages();
              }}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === "messages"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Mesajlar
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("followed");
                fetchFollowedPatients();
              }}
              className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                activeTab === "followed"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Takip Edilen Hastalarım
              </div>
            </button>
            {selectedPatient && (
              <button
                onClick={() => setActiveTab("details")}
                className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                  activeTab === "details"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hasta Detayları
                </div>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <button
                onClick={fetchTodayAppointments}
                disabled={loadingTodayAppointments}
                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Bugünkü Randevular</p>
                    <p className="text-3xl font-bold mt-2">{stats.todayAppointments}</p>
                    <p className="text-blue-100 text-xs mt-2">
                      {stats.todayCompleted} tamamlandı, {stats.todayPending} bekliyor
                    </p>
                    <p className="text-blue-200 text-xs mt-3 font-semibold">
                      {loadingTodayAppointments ? "Yükleniyor..." : "Detayları görmek için tıklayın →"}
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </button>

              <button
                onClick={fetchAllPatients}
                disabled={loadingAllPatients}
                className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:from-green-600 hover:to-green-700 transition-all cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Toplam Hasta</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalPatients}</p>
                    <p className="text-green-100 text-xs mt-2">Aktif hastalar</p>
                    <p className="text-green-200 text-xs mt-3 font-semibold">
                      {loadingAllPatients ? "Yükleniyor..." : "Detayları görmek için tıklayın →"}
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </button>

              <button
                onClick={fetchWeeklyAppointments}
                disabled={loadingWeeklyAppointments}
                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white hover:from-purple-600 hover:to-purple-700 transition-all cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Bu Hafta</p>
                    <p className="text-3xl font-bold mt-2">{stats.weeklyAppointments}</p>
                    <p className="text-purple-100 text-xs mt-2">Randevu planlandı</p>
                    <p className="text-purple-200 text-xs mt-3 font-semibold">
                      {loadingWeeklyAppointments ? "Yükleniyor..." : "Detayları görmek için tıklayın →"}
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </button>

              <button
                onClick={fetchPendingReports}
                disabled={loadingPendingReports}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Bekleyen Raporlar</p>
                    <p className="text-3xl font-bold mt-2">{stats.pendingReports}</p>
                    <p className="text-orange-100 text-xs mt-2">Onay bekliyor</p>
                    <p className="text-orange-200 text-xs mt-3 font-semibold">
                      {loadingPendingReports ? "Yükleniyor..." : "Detayları görmek için tıklayın →"}
                    </p>
                  </div>
                  <svg className="w-12 h-12 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Hızlı Erişim ve Son Aktiviteler */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hızlı İşlemler */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Hızlı İşlemler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowNewAppointmentModal(true)}
                    className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                  >
                    <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Yeni Randevu</span>
                  </button>
                  <button 
                    onClick={() => setShowWriteReportModal(true)}
                    className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition cursor-pointer"
                  >
                    <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Rapor Yaz</span>
                  </button>
                  <button 
                    onClick={() => setShowWritePrescriptionModal(true)}
                    className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition cursor-pointer"
                  >
                    <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Reçete Yaz</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowOnlineMeetingModal(true);
                      fetchAvailableMeetings();
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition cursor-pointer"
                  >
                    <svg className="w-8 h-8 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Online Görüşme</span>
                  </button>
                </div>
              </div>

              {/* Son Aktiviteler */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Son Aktiviteler</h3>
                <div className="space-y-3">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500 text-sm">Henüz aktivite bulunmuyor</p>
                    </div>
                  ) : (
                    activities.slice(0, 4).map((activity, index) => {
                      const getColorClass = (color: string) => {
                        switch (color) {
                          case "blue":
                            return "bg-blue-500";
                          case "green":
                            return "bg-green-500";
                          case "purple":
                            return "bg-purple-500";
                          case "orange":
                            return "bg-orange-500";
                          default:
                            return "bg-gray-500";
                        }
                      };

                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`w-2 h-2 ${getColorClass(activity.color)} rounded-full mt-2`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Bugünkü Randevular */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Bugünkü Randevular</h3>
                <button 
                  onClick={() => {
                    fetchTodayAppointments();
                    setShowTodayAppointments(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tümünü Gör →
                </button>
              </div>
              <div className="overflow-x-auto">
                {loadingTodayAppointments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">Bugün için randevu bulunmuyor</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Saat</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Hasta</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Tür</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Durum</th>
                        <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAppointments.map((appointment) => {
                        // Tarih parse kontrolü
                        const appointmentDate = appointment.appointmentDate 
                          ? new Date(appointment.appointmentDate) 
                          : null;
                        const timeString = appointmentDate && !isNaN(appointmentDate.getTime())
                          ? appointmentDate.toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-";
                        
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case "COMPLETED":
                              return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Tamamlandı</span>;
                            case "IN_PROGRESS":
                              return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Devam Ediyor</span>;
                            case "CONFIRMED":
                              return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Bekliyor</span>;
                            case "CANCELLED":
                              return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">İptal Edildi</span>;
                            default:
                              return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{status}</span>;
                          }
                        };

                        const getActionButton = (status: string) => {
                          switch (status) {
                            case "COMPLETED":
                              return <button className="text-blue-600 hover:text-blue-800 text-sm">Detay</button>;
                            case "IN_PROGRESS":
                              return <button className="text-blue-600 hover:text-blue-800 text-sm">Devam Et</button>;
                            case "CONFIRMED":
                              return <button className="text-blue-600 hover:text-blue-800 text-sm">Başlat</button>;
                            default:
                              return <button className="text-blue-600 hover:text-blue-800 text-sm">Detay</button>;
                          }
                        };

                        // Randevu tipini belirle (Online veya Yüz Yüze)
                        const appointmentType = appointment.meetingLink ? "Online" : "Yüz Yüze";
                        
                        return (
                          <tr key={appointment.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{timeString || "-"}</td>
                            <td className="py-3 px-4 text-sm font-medium">{appointment.patient?.name || appointment.patient?.email || "Bilinmeyen Hasta"}</td>
                            <td className="py-3 px-4 text-sm">{appointmentType}</td>
                            <td className="py-3 px-4">{getStatusBadge(appointment.status || "PENDING")}</td>
                            <td className="py-3 px-4">{getActionButton(appointment.status || "PENDING")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Randevu Takvimi</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Yeni Randevu Oluştur
              </button>
            </div>
            
            {/* Takvim görünümü placeholder */}
            <div className="border rounded-lg p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Randevu takvimi burada görüntülenecek</p>
              <p className="text-sm text-gray-400 mt-2">Yakında eklenecek</p>
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hasta Arama</h2>
            
            {/* Search Form */}
            <div className="mb-6 space-y-4">
              {/* Arama Tipi Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arama Tipi
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("email");
                      setSearchEmail("");
                      setSearchName("");
                      setSearchTcKimlikNo("");
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      searchType === "email"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("name");
                      setSearchEmail("");
                      setSearchName("");
                      setSearchTcKimlikNo("");
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      searchType === "name"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Ad/Soyad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("tc");
                      setSearchEmail("");
                      setSearchName("");
                      setSearchTcKimlikNo("");
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      searchType === "tc"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    T.C. Kimlik No
                  </button>
                </div>
              </div>

              {/* Arama Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchType === "email" && "Email Adresi ile Ara"}
                  {searchType === "name" && "Ad/Soyad ile Ara"}
                  {searchType === "tc" && "T.C. Kimlik No ile Ara"}
                </label>
                <div className="flex gap-4">
                  {searchType === "email" && (
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                      placeholder="hasta@email.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  )}
                  {searchType === "name" && (
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                      placeholder="Ahmet Yılmaz"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  )}
                  {searchType === "tc" && (
                    <input
                      type="text"
                      value={searchTcKimlikNo}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ""); // Sadece rakam
                        if (value.length <= 11) {
                          setSearchTcKimlikNo(value);
                        }
                      }}
                      onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                      placeholder="12345678901"
                      maxLength={11}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  )}
                  <button
                    onClick={searchPatients}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {loading ? "Aranıyor..." : "Ara"}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Arama Sonuçları</h3>
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => viewPatientDetails(patient.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        {patient.patientProfile?.tcKimlikNo && (
                          <p className="text-sm text-gray-600">T.C. Kimlik No: {patient.patientProfile.tcKimlikNo}</p>
                        )}
                        {patient.phone && (
                          <p className="text-sm text-gray-600">Tel: {patient.phone}</p>
                        )}
                        
                        {patient.patientProfile && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {patient.patientProfile.bloodType && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                Kan: {patient.patientProfile.bloodType}
                              </span>
                            )}
                            {patient.patientProfile.allergies && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                                Alerji var
                              </span>
                            )}
                            {patient.patientProfile.chronicDiseases && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                Kronik hastalık var
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        {patient.lastAppointment && (
                          <div className="text-sm">
                            <p className="text-gray-600">Son Randevu:</p>
                            <p className="font-medium">
                              {new Date(patient.lastAppointment.appointmentDate).toLocaleDateString("tr-TR")}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded ${
                              patient.lastAppointment.status === "COMPLETED" 
                                ? "bg-green-100 text-green-700"
                                : patient.lastAppointment.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {patient.lastAppointment.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Takip Edilen Hastalarım Tab */}
        {activeTab === "followed" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Takip Edilen Hastalarım</h2>
                <button
                  onClick={fetchFollowedPatients}
                  disabled={loadingFollowedPatients}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yenile
                </button>
              </div>

              {loadingFollowedPatients ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Hastalar yükleniyor...</p>
                </div>
              ) : followedPatients.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600 mb-2">Henüz takip edilen hasta bulunmuyor</p>
                  <p className="text-sm text-gray-500">Hasta detay sayfasından hastaları takip listesine ekleyebilirsiniz</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {followedPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{patient.patientName}</h3>
                          <p className="text-sm text-gray-600">{patient.patientEmail}</p>
                          {patient.patientPhone && (
                            <p className="text-sm text-gray-600">{patient.patientPhone}</p>
                          )}
                        </div>
                        <button
                          onClick={() => unfollowPatient(patient.patientId)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Takibi Bırak"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {patient.tcKimlikNo && (
                          <p><span className="font-medium text-gray-700">T.C. Kimlik No:</span> <span className="text-gray-900">{patient.tcKimlikNo}</span></p>
                        )}
                        {patient.age !== null && (
                          <p><span className="font-medium text-gray-700">Yaş:</span> <span className="text-gray-900">{patient.age}</span></p>
                        )}
                        {patient.gender && (
                          <p><span className="font-medium text-gray-700">Cinsiyet:</span> <span className="text-gray-900">
                            {patient.gender === "MALE" ? "Erkek" : patient.gender === "FEMALE" ? "Kadın" : patient.gender}
                          </span></p>
                        )}
                        {patient.bloodType && (
                          <p><span className="font-medium text-gray-700">Kan Grubu:</span> <span className="text-gray-900">{patient.bloodType}</span></p>
                        )}
                      </div>

                      {patient.notes && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-medium text-gray-700 mb-1">Notlar:</p>
                          <p className="text-sm text-gray-600">{patient.notes}</p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={async () => {
                            // Hasta detaylarını getir
                            try {
                              const response = await fetch(`/api/patients/${patient.patientId}`, {
                                headers: {
                                  "x-user-id": session?.user?.id || "",
                                  "x-user-role": session?.user?.role || "",
                                },
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setSelectedPatient(data);
                                setActiveTab("details");
                              }
                            } catch (err) {
                              showError("Hasta bilgileri yüklenemedi");
                            }
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Detayları Gör
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-3">
                        {new Date(patient.followedAt).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })} tarihinde eklendi
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patient Details Tab */}
        {activeTab === "details" && selectedPatient && (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Hasta Bilgileri</h2>
                {selectedPatient && (
                  <button
                    onClick={() => {
                      if (isFollowingPatient[selectedPatient.patient.id]) {
                        unfollowPatient(selectedPatient.patient.id);
                      } else {
                        followPatient(selectedPatient.patient.id);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      isFollowingPatient[selectedPatient.patient.id]
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isFollowingPatient[selectedPatient.patient.id] ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Takibi Bırak
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Hastayı Takip Et
                      </div>
                    )}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Kişisel Bilgiler</h3>
                  <div className="space-y-2 text-sm text-gray-900">
                    <p><span className="font-medium text-gray-700">Ad Soyad:</span> <span className="text-gray-900">{selectedPatient.patient.name}</span></p>
                    <p><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-900">{selectedPatient.patient.email}</span></p>
                    <p><span className="font-medium text-gray-700">Telefon:</span> <span className="text-gray-900">{selectedPatient.patient.phone || "-"}</span></p>
                    {selectedPatient.patient.patientProfile && (
                      <>
                        <p><span className="font-medium text-gray-700">Cinsiyet:</span> <span className="text-gray-900">{
                          selectedPatient.patient.patientProfile.gender === "MALE"
                            ? "Erkek"
                            : selectedPatient.patient.patientProfile.gender === "FEMALE"
                            ? "Kadın"
                            : selectedPatient.patient.patientProfile.gender || "-"
                        }</span></p>
                        <p><span className="font-medium text-gray-700">Doğum Tarihi:</span> <span className="text-gray-900">{
                          selectedPatient.patient.patientProfile.dateOfBirth 
                            ? new Date(selectedPatient.patient.patientProfile.dateOfBirth).toLocaleDateString("tr-TR")
                            : "-"
                        }</span></p>
                        {selectedPatient.patient.patientProfile.tcKimlikNo && (
                          <p><span className="font-medium text-gray-700">T.C. Kimlik No:</span> <span className="text-gray-900">{selectedPatient.patient.patientProfile.tcKimlikNo}</span></p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Tıbbi Bilgiler</h3>
                  <div className="space-y-2 text-sm text-gray-900">
                    {selectedPatient.patient.patientProfile && (
                      <>
                        <p><span className="font-medium text-gray-700">Kan Grubu:</span> <span className="text-gray-900">{selectedPatient.patient.patientProfile.bloodType || "-"}</span></p>
                        <p><span className="font-medium text-gray-700">Kullandığı İlaçlar:</span> <span className="text-gray-900">{selectedPatient.patient.patientProfile.medications || "-"}</span></p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Alerjiler ve Kronik Rahatsızlıklar - Önemli Bilgiler */}
              {selectedPatient.patient.patientProfile && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  {/* Alerjiler */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-200">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-red-900">Alerjik Durumlar</h3>
                    </div>
                    {selectedPatient.patient.patientProfile.allergies ? (
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-gray-900 font-medium whitespace-pre-wrap">
                          {selectedPatient.patient.patientProfile.allergies}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-gray-500 italic">Hasta alerji bilgisi girmemiş</p>
                      </div>
                    )}
                  </div>

                  {/* Kronik Rahatsızlıklar */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-bold text-purple-900">Kronik Rahatsızlıklar</h3>
                    </div>
                    {selectedPatient.patient.patientProfile.chronicDiseases ? (
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <p className="text-gray-900 font-medium whitespace-pre-wrap">
                          {selectedPatient.patient.patientProfile.chronicDiseases}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <p className="text-gray-500 italic">Hasta kronik rahatsızlık bilgisi girmemiş</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedPatient.statistics.totalDocuments}</p>
                  <p className="text-sm text-gray-600">Belge</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedPatient.statistics.totalMedicalHistory}</p>
                  <p className="text-sm text-gray-600">Tıbbi Kayıt</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{selectedPatient.statistics.totalAppointments}</p>
                  <p className="text-sm text-gray-600">Randevu</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            {selectedPatient.patient.patientProfile?.documents && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Belgeler</h3>
                
                {selectedPatient.patient.patientProfile.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedPatient.patient.patientProfile.documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {doc.documentType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {doc.documentDate 
                            ? new Date(doc.documentDate).toLocaleDateString("tr-TR")
                            : new Date(doc.createdAt).toLocaleDateString("tr-TR")
                          }
                        </p>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Görüntüle
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Henüz belge yüklenmemiş</p>
                )}
              </div>
            )}

            {/* Medical History */}
            {selectedPatient.patient.patientProfile?.medicalHistory && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tıbbi Geçmiş</h3>
                
                {selectedPatient.patient.patientProfile.medicalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPatient.patient.patientProfile.medicalHistory.map((history) => (
                      <div key={history.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{history.diagnosis}</h4>
                            {history.treatment && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Tedavi:</span> {history.treatment}
                              </p>
                            )}
                            {history.notes && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Notlar:</span> {history.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(history.visitDate).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Henüz tıbbi kayıt bulunmuyor</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mesajlar Tab */}
        {activeTab === "messages" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Hasta Mesajları</h2>
                <button
                  onClick={fetchMessages}
                  disabled={loadingMessages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yenile
                </button>
              </div>

              {loadingMessages ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Mesajlar yükleniyor...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-600 mb-2">Henüz mesaj bulunmuyor</p>
                  <p className="text-sm text-gray-500">Hastalar size mesaj gönderdiğinde burada görünecek</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`border rounded-lg p-6 ${
                        message.status === "PENDING"
                          ? "border-yellow-300 bg-yellow-50"
                          : message.status === "ACTIVE"
                          ? "border-green-300 bg-green-50"
                          : message.status === "CLOSED"
                          ? "border-gray-300 bg-gray-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-lg text-blue-600 font-semibold">
                                {message.patient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{message.patient.name}</h3>
                              <p className="text-sm text-gray-600">{message.patient.email}</p>
                              {message.patient.phone && (
                                <p className="text-sm text-gray-600">{message.patient.phone}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                          </div>
                          {/* Mesaj Ekleri */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Eklenen Belgeler:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {message.attachments.map((attachment: any) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all"
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
                          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              Gönderildi: {new Date(message.createdAt).toLocaleString("tr-TR")}
                            </span>
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
                        <div className="ml-4">
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
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4">
                        {message.status === "PENDING" && (
                          <button
                            onClick={() => handleStartConversation(message.id)}
                            disabled={processingMessage === message.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {processingMessage === message.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşleniyor...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                Görüşmeyi Başlat
                              </>
                            )}
                          </button>
                        )}
                        {message.status === "ACTIVE" && (
                          <button
                            onClick={() => handleCloseConversation(message.id)}
                            disabled={processingMessage === message.id}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {processingMessage === message.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşleniyor...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Görüşmeyi Bitir
                              </>
                            )}
                          </button>
                        )}
                        {(message.status === "PENDING" || message.status === "ACTIVE") && (
                          <button
                            onClick={() => handleBlockPatient(message.id)}
                            disabled={processingMessage === message.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {processingMessage === message.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                İşleniyor...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Engelle
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bugünkü Randevular Modal */}
        {showTodayAppointments && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Bugünkü Randevular</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {new Date().toLocaleDateString("tr-TR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTodayAppointments(false);
                    setTodayAppointments([]);
                  }}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingTodayAppointments ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">Bugün için randevu bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {todayAppointments.map((appointment) => {
                      const appointmentDate = new Date(appointment.appointmentDate);
                      const timeString = appointmentDate.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={appointment.id}
                          className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all"
                        >
                          {/* Randevu Başlığı */}
                          <div className="flex justify-between items-start mb-4 pb-4 border-b">
                            <div className="flex items-center gap-4">
                              <div className="bg-blue-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{timeString}</h3>
                                <p className="text-sm text-gray-500">
                                  {appointmentDate.toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                  })}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                appointment.status === "COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : appointment.status === "CONFIRMED"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {appointment.status === "COMPLETED"
                                ? "Tamamlandı"
                                : appointment.status === "CONFIRMED"
                                ? "Onaylandı"
                                : "Bekliyor"}
                            </span>
                          </div>

                          {/* Hasta Bilgileri */}
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Sol Kolon - Temel Bilgiler */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Hasta Bilgileri</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                                  <p className="font-semibold text-gray-900">{appointment.patient.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Yaş</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.age !== null ? `${appointment.patient.age} yaşında` : "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">T.C. Kimlik No</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.tcKimlikNo || "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Doğum Tarihi</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.dateOfBirth
                                      ? new Date(appointment.patient.dateOfBirth).toLocaleDateString("tr-TR")
                                      : "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cinsiyet</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.gender === "MALE"
                                      ? "Erkek"
                                      : appointment.patient.gender === "FEMALE"
                                      ? "Kadın"
                                      : "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Kan Grubu</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.bloodType || "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Telefon</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.phone || "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Email</p>
                                  <p className="font-semibold text-gray-900 text-sm break-all">
                                    {appointment.patient.email}
                                  </p>
                                </div>
                              </div>

                              {appointment.patient.address && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Adres</p>
                                  <p className="font-semibold text-gray-900 text-sm">{appointment.patient.address}</p>
                                </div>
                              )}

                              {(appointment.patient.emergencyContact || appointment.patient.emergencyPhone) && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-xs text-gray-500 mb-1">Acil Durum İletişim</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.emergencyContact || "Belirtilmemiş"}
                                  </p>
                                  {appointment.patient.emergencyPhone && (
                                    <p className="text-sm text-gray-700 mt-1">
                                      Tel: {appointment.patient.emergencyPhone}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Sağ Kolon - Tıbbi Bilgiler */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Tıbbi Bilgiler</h4>

                              {/* Alerjiler */}
                              <div>
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Alerjiler</p>
                                {appointment.patient.allergies ? (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {appointment.patient.allergies}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Alerji bilgisi bulunmuyor</p>
                                )}
                              </div>

                              {/* Kronik Rahatsızlıklar */}
                              <div>
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Kronik Rahatsızlıklar</p>
                                {appointment.patient.chronicDiseases ? (
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {appointment.patient.chronicDiseases}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Kronik rahatsızlık bilgisi bulunmuyor</p>
                                )}
                              </div>

                              {/* Kullanılan İlaçlar */}
                              {appointment.patient.medications && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2 font-semibold">Kullanılan İlaçlar</p>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {appointment.patient.medications}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Randevu Notları */}
                              {appointment.notes && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2 font-semibold">Hasta Şikayeti / Notlar</p>
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
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

        {/* Tüm Hastalar Modal */}
        {showAllPatients && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Tüm Hastalar</h2>
                  <p className="text-green-100 text-sm mt-1">
                    Toplam {allPatients.length} hasta
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAllPatients(false);
                    setAllPatients([]);
                  }}
                  className="text-white hover:text-green-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingAllPatients ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  </div>
                ) : allPatients.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg">Henüz hasta bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allPatients.map((patient) => (
                      <div
                        key={patient.id}
                        className="border-2 border-gray-200 rounded-xl p-6 hover:border-green-300 transition-all cursor-pointer"
                        onClick={() => {
                          setShowAllPatients(false);
                          viewPatientDetails(patient.id);
                          setActiveTab("details");
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="bg-green-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                                <p className="text-sm text-gray-500">{patient.email}</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mt-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">T.C. Kimlik No</p>
                                <p className="font-semibold text-gray-900">{patient.tcKimlikNo || "Belirtilmemiş"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Yaş</p>
                                <p className="font-semibold text-gray-900">
                                  {patient.age !== null ? `${patient.age} yaşında` : "Belirtilmemiş"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Telefon</p>
                                <p className="font-semibold text-gray-900">{patient.phone || "Belirtilmemiş"}</p>
                              </div>
                              {patient.bloodType && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Kan Grubu</p>
                                  <p className="font-semibold text-gray-900">{patient.bloodType}</p>
                                </div>
                              )}
                              {patient.allergies && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Alerjiler</p>
                                  <p className="font-semibold text-red-600 text-sm line-clamp-1">{patient.allergies}</p>
                                </div>
                              )}
                              {patient.chronicDiseases && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Kronik Rahatsızlıklar</p>
                                  <p className="font-semibold text-orange-600 text-sm line-clamp-1">{patient.chronicDiseases}</p>
                                </div>
                              )}
                            </div>

                            {patient.lastAppointment && (
                              <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-gray-500 mb-1">Son Randevu</p>
                                <p className="text-sm text-gray-700">
                                  {new Date(patient.lastAppointment.date).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {" - "}
                                  <span className={`font-semibold ${
                                    patient.lastAppointment.status === "COMPLETED"
                                      ? "text-green-600"
                                      : patient.lastAppointment.status === "CONFIRMED"
                                      ? "text-blue-600"
                                      : "text-yellow-600"
                                  }`}>
                                    {patient.lastAppointment.status === "COMPLETED"
                                      ? "Tamamlandı"
                                      : patient.lastAppointment.status === "CONFIRMED"
                                      ? "Onaylandı"
                                      : "Bekliyor"}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
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

        {/* Bu Haftaki Randevular Modal */}
        {showWeeklyAppointments && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Bu Haftaki Randevular</h2>
                  <p className="text-purple-100 text-sm mt-1">
                    Bu hafta toplam {weeklyAppointments.length} randevu
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowWeeklyAppointments(false);
                    setWeeklyAppointments([]);
                  }}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingWeeklyAppointments ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : weeklyAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-gray-500 text-lg">Bu hafta için randevu bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {weeklyAppointments.map((appointment) => {
                      const appointmentDate = new Date(appointment.appointmentDate);
                      const timeString = appointmentDate.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const dateString = appointmentDate.toLocaleDateString("tr-TR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={appointment.id}
                          className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-all"
                        >
                          {/* Randevu Başlığı */}
                          <div className="flex justify-between items-start mb-4 pb-4 border-b">
                            <div className="flex items-center gap-4">
                              <div className="bg-purple-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{dateString}</h3>
                                <p className="text-sm text-gray-500">{timeString}</p>
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                appointment.status === "COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : appointment.status === "CONFIRMED"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {appointment.status === "COMPLETED"
                                ? "Tamamlandı"
                                : appointment.status === "CONFIRMED"
                                ? "Onaylandı"
                                : "Bekliyor"}
                            </span>
                          </div>

                          {/* Hasta Bilgileri */}
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Sol Kolon - Temel Bilgiler */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Hasta Bilgileri</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                                  <p className="font-semibold text-gray-900">{appointment.patient.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Yaş</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.age !== null ? `${appointment.patient.age} yaşında` : "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">T.C. Kimlik No</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.tcKimlikNo || "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Telefon</p>
                                  <p className="font-semibold text-gray-900">
                                    {appointment.patient.phone || "Belirtilmemiş"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Email</p>
                                  <p className="font-semibold text-gray-900 text-sm break-all">
                                    {appointment.patient.email}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Sağ Kolon - Tıbbi Bilgiler */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Tıbbi Bilgiler</h4>

                              {/* Alerjiler */}
                              <div>
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Alerjiler</p>
                                {appointment.patient.allergies ? (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {appointment.patient.allergies}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Alerji bilgisi bulunmuyor</p>
                                )}
                              </div>

                              {/* Kronik Rahatsızlıklar */}
                              <div>
                                <p className="text-xs text-gray-500 mb-2 font-semibold">Kronik Rahatsızlıklar</p>
                                {appointment.patient.chronicDiseases ? (
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {appointment.patient.chronicDiseases}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Kronik rahatsızlık bilgisi bulunmuyor</p>
                                )}
                              </div>

                              {/* Randevu Notları */}
                              {appointment.notes && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2 font-semibold">Hasta Şikayeti / Notlar</p>
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{appointment.notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
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

        {/* Bekleyen Raporlar Modal */}
        {showPendingReports && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Bekleyen Raporlar</h2>
                  <p className="text-orange-100 text-sm mt-1">
                    Toplam {pendingReports.length} rapor
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPendingReports(false);
                    setPendingReports([]);
                  }}
                  className="text-white hover:text-orange-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingPendingReports ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  </div>
                ) : pendingReports.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg">Bekleyen rapor bulunmuyor</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingReports.map((report) => {
                      const reportDate = new Date(report.reportDate);
                      const dateString = reportDate.toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={report.id}
                          className="border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-all"
                        >
                          {/* Rapor Başlığı */}
                          <div className="flex justify-between items-start mb-4 pb-4 border-b">
                            <div className="flex items-center gap-4">
                              <div className="bg-orange-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{report.title || report.reportType}</h3>
                                <p className="text-sm text-gray-500">{dateString}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              {report.reportType}
                            </span>
                          </div>

                          {/* Rapor Detayları */}
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Sol Kolon - Hasta Bilgileri */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Hasta Bilgileri</h4>
                              
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ad Soyad</p>
                                  <p className="font-semibold text-gray-900">{report.patient.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Email</p>
                                  <p className="font-semibold text-gray-900 text-sm break-all">{report.patient.email}</p>
                                </div>
                                {report.patient.tcKimlikNo && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">T.C. Kimlik No</p>
                                    <p className="font-semibold text-gray-900">{report.patient.tcKimlikNo}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sağ Kolon - Rapor İçeriği */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-900 text-lg border-b pb-2">Rapor İçeriği</h4>

                              {report.content && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.content}</p>
                                </div>
                              )}

                              {report.fileUrl && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2 font-semibold">Rapor Dosyası</p>
                                  <a
                                    href={report.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Dosyayı Görüntüle
                                  </a>
                                </div>
                              )}

                              {/* Onay/Red Butonları */}
                              <div className="mt-6 pt-4 border-t">
                                <p className="text-xs text-gray-500 mb-3 font-semibold">Rapor Onayı</p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleApproveReport(report.id)}
                                    disabled={processingReport === report.id}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    {processingReport === report.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Onaylanıyor...</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Onayla</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(report.id)}
                                    disabled={processingReport === report.id}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Reddet</span>
                                  </button>
                                </div>
                              </div>
                            </div>
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

        {/* Red Modal */}
        {showRejectModal && selectedReportData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Raporu Reddet ve Düzenle</h3>
              <p className="text-sm text-gray-600 mb-6">
                Bu raporu reddetmek için lütfen bir sebep belirtin. İsterseniz rapor içeriğini düzenleyebilir ve kendi yorumunuzu ekleyebilirsiniz.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Red Sebebi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Red Sebebi *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Raporu neden reddediyorsunuz?"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900 bg-white resize-none"
                    rows={3}
                    required
                  />
                </div>

                {/* Rapor İçeriği Düzenleme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rapor İçeriği (Düzenleyebilirsiniz)
                  </label>
                  <textarea
                    value={rejectionContent}
                    onChange={(e) => setRejectionContent(e.target.value)}
                    placeholder="Rapor içeriğini buradan düzenleyebilirsiniz..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white resize-none"
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    AI tarafından oluşturulan içerik. İsterseniz düzenleyebilirsiniz.
                  </p>
                </div>

                {/* Doktor Notları */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doktor Notları (Opsiyonel)
                  </label>
                  <textarea
                    value={rejectionDoctorNotes}
                    onChange={(e) => setRejectionDoctorNotes(e.target.value)}
                    placeholder="Ek notlarınızı buraya yazabilirsiniz..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white resize-none"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                    setRejectionContent("");
                    setRejectionDoctorNotes("");
                    setSelectedReportForReject(null);
                    setSelectedReportData(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  disabled={processingReport !== null}
                >
                  İptal
                </button>
                <button
                  onClick={handleRejectReport}
                  disabled={!rejectionReason.trim() || processingReport !== null}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingReport ? "Reddediliyor..." : "Reddet ve Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Yeni Randevu Modal */}
        {showNewAppointmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Yeni Randevu Oluştur</h3>
                <button
                  onClick={() => {
                    setShowNewAppointmentModal(false);
                    setSelectedAppointmentPatient(null);
                    setAppointmentPatientSearch("");
                    setAppointmentPatientResults([]);
                    setAppointmentDate("");
                    setAppointmentTime("");
                    setAppointmentNotes("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Hasta Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasta Seçiniz <span className="text-red-500">*</span>
                  </label>
                  {!selectedAppointmentPatient ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={appointmentPatientSearch}
                          onChange={(e) => setAppointmentPatientSearch(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && appointmentPatientSearch.length >= 2) {
                              handleSearchAppointmentPatient();
                            }
                          }}
                          placeholder="Hasta adı, email veya T.C. Kimlik No ile ara..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                        <button
                          onClick={handleSearchAppointmentPatient}
                          disabled={appointmentPatientSearch.length < 2}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          Ara
                        </button>
                      </div>
                      {appointmentPatientResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {appointmentPatientResults.map((patient) => (
                            <button
                              key={patient.id}
                              onClick={() => setSelectedAppointmentPatient(patient)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                            >
                              <div className="font-medium text-gray-900">{patient.name}</div>
                              <div className="text-sm text-gray-600">{patient.email}</div>
                              {patient.patientProfile?.tcKimlikNo && (
                                <div className="text-xs text-gray-500">TC: {patient.patientProfile.tcKimlikNo}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{selectedAppointmentPatient.name}</div>
                          <div className="text-sm text-gray-600">{selectedAppointmentPatient.email}</div>
                          {selectedAppointmentPatient.patientProfile?.tcKimlikNo && (
                            <div className="text-xs text-gray-500">TC: {selectedAppointmentPatient.patientProfile.tcKimlikNo}</div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedAppointmentPatient(null)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Değiştir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tarih ve Saat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saat <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                {/* Notlar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar (Opsiyonel)
                  </label>
                  <textarea
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    rows={3}
                    placeholder="Randevu ile ilgili notlar..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>

                {/* Hata Mesajı */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Butonlar */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowNewAppointmentModal(false);
                      setSelectedAppointmentPatient(null);
                      setAppointmentPatientSearch("");
                      setAppointmentPatientResults([]);
                      setAppointmentDate("");
                      setAppointmentTime("");
                      setAppointmentNotes("");
                      setError("");
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                    disabled={creatingAppointment}
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleCreateAppointment}
                    disabled={creatingAppointment || !selectedAppointmentPatient || !appointmentDate || !appointmentTime}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {creatingAppointment ? "Oluşturuluyor..." : "Randevu Oluştur"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rapor Yaz Modal */}
        {showWriteReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Rapor Yaz</h3>
                <button
                  onClick={() => {
                    setShowWriteReportModal(false);
                    setSelectedReportPatient(null);
                    setReportPatientSearch("");
                    setReportPatientResults([]);
                    setReportTitle("");
                    setReportType("");
                    setReportContent("");
                    setReportFile(null);
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Hasta Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasta Seçiniz <span className="text-red-500">*</span>
                  </label>
                  {!selectedReportPatient ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={reportPatientSearch}
                          onChange={(e) => setReportPatientSearch(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && reportPatientSearch.length >= 2) {
                              handleSearchReportPatient();
                            }
                          }}
                          placeholder="Hasta adı, email veya T.C. Kimlik No ile ara..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                        <button
                          onClick={handleSearchReportPatient}
                          disabled={reportPatientSearch.length < 2}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          Ara
                        </button>
                      </div>
                      {reportPatientResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {reportPatientResults.map((patient) => (
                            <button
                              key={patient.id}
                              onClick={() => setSelectedReportPatient(patient)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                            >
                              <div className="font-medium text-gray-900">{patient.name}</div>
                              <div className="text-sm text-gray-600">{patient.email}</div>
                              {patient.patientProfile?.tcKimlikNo && (
                                <div className="text-xs text-gray-500">TC: {patient.patientProfile.tcKimlikNo}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{selectedReportPatient.name}</div>
                          <div className="text-sm text-gray-600">{selectedReportPatient.email}</div>
                          {selectedReportPatient.patientProfile?.tcKimlikNo && (
                            <div className="text-xs text-gray-500">TC: {selectedReportPatient.patientProfile.tcKimlikNo}</div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedReportPatient(null)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Değiştir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rapor Formu */}
                {selectedReportPatient && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rapor Başlığı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="Örn: Kan Testi Sonuçları, Genel Muayene Raporu..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rapor Tipi <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">Rapor tipi seçin</option>
                        <option value="GENEL_MUAYENE">Genel Muayene Raporu</option>
                        <option value="KAN_TESTI">Kan Testi Raporu</option>
                        <option value="GORUNTULEME">Görüntüleme Raporu (MR, BT, Röntgen)</option>
                        <option value="PATOLOJI">Patoloji Raporu</option>
                        <option value="AMELIYAT">Ameliyat Raporu</option>
                        <option value="EPIKRIZ">Epikriz Raporu</option>
                        <option value="DIGER">Diğer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rapor İçeriği <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reportContent}
                        onChange={(e) => setReportContent(e.target.value)}
                        rows={8}
                        placeholder="Rapor içeriğini detaylı olarak yazın..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dosya Yükle (Opsiyonel)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setReportFile(e.target.files ? e.target.files[0] : null)}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-1 text-sm text-gray-500">PDF, JPG, PNG formatında dosya yükleyebilirsiniz.</p>
                    </div>

                    {/* Hata Mesajı */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* Butonlar */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowWriteReportModal(false);
                          setSelectedReportPatient(null);
                          setReportPatientSearch("");
                          setReportPatientResults([]);
                          setReportTitle("");
                          setReportType("");
                          setReportContent("");
                          setReportFile(null);
                          setError("");
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                        disabled={creatingReport}
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleCreateReport}
                        disabled={creatingReport || !selectedReportPatient || !reportTitle || !reportType || !reportContent}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                      >
                        {creatingReport ? "Oluşturuluyor..." : "Rapor Oluştur"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reçete Yaz Modal */}
        {showWritePrescriptionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Reçete Yaz</h3>
                <button
                  onClick={() => {
                    setShowWritePrescriptionModal(false);
                    setSelectedPrescriptionPatient(null);
                    setPrescriptionPatientSearch("");
                    setPrescriptionPatientResults([]);
                    setPrescriptionAppointments([]);
                    setSelectedPrescriptionAppointment(null);
                    setPrescriptionDiagnosis("");
                    setPrescriptionMedications("");
                    setPrescriptionNotes("");
                    setError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Hasta Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hasta Seçiniz <span className="text-red-500">*</span>
                  </label>
                  {!selectedPrescriptionPatient ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={prescriptionPatientSearch}
                          onChange={(e) => setPrescriptionPatientSearch(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && prescriptionPatientSearch.length >= 2) {
                              handleSearchPrescriptionPatient();
                            }
                          }}
                          placeholder="Hasta adı, email veya T.C. Kimlik No ile ara..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                        <button
                          onClick={handleSearchPrescriptionPatient}
                          disabled={prescriptionPatientSearch.length < 2}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          Ara
                        </button>
                      </div>
                      {prescriptionPatientResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {prescriptionPatientResults.map((patient) => (
                            <button
                              key={patient.id}
                              onClick={async () => {
                                setSelectedPrescriptionPatient(patient);
                                setPrescriptionPatientResults([]);
                                await handleLoadPrescriptionAppointments(patient.id);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
                            >
                              <div className="font-medium text-gray-900">{patient.name}</div>
                              <div className="text-sm text-gray-600">{patient.email}</div>
                              {patient.patientProfile?.tcKimlikNo && (
                                <div className="text-xs text-gray-500">TC: {patient.patientProfile.tcKimlikNo}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{selectedPrescriptionPatient.name}</div>
                          <div className="text-sm text-gray-600">{selectedPrescriptionPatient.email}</div>
                          {selectedPrescriptionPatient.patientProfile?.tcKimlikNo && (
                            <div className="text-xs text-gray-500">TC: {selectedPrescriptionPatient.patientProfile.tcKimlikNo}</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPrescriptionPatient(null);
                            setPrescriptionAppointments([]);
                            setSelectedPrescriptionAppointment(null);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Değiştir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Randevu Seçimi */}
                {selectedPrescriptionPatient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Randevu Seçiniz <span className="text-red-500">*</span>
                    </label>
                    {prescriptionAppointments.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <p className="text-yellow-800 text-sm">Bu hasta ile onaylanmış veya tamamlanmış randevu bulunamadı.</p>
                        <p className="text-yellow-600 text-xs mt-1">Önce bir randevu oluşturmanız gerekmektedir.</p>
                      </div>
                    ) : (
                      <select
                        value={selectedPrescriptionAppointment?.id || ""}
                        onChange={(e) => {
                          const appointment = prescriptionAppointments.find((apt) => apt.id === e.target.value);
                          setSelectedPrescriptionAppointment(appointment || null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">Randevu seçin</option>
                        {prescriptionAppointments.map((appointment) => (
                          <option key={appointment.id} value={appointment.id}>
                            {new Date(appointment.appointmentDate).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - {appointment.status === "COMPLETED" ? "Tamamlandı" : "Onaylandı"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Reçete Formu */}
                {selectedPrescriptionPatient && selectedPrescriptionAppointment && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanı (Opsiyonel)
                      </label>
                      <input
                        type="text"
                        value={prescriptionDiagnosis}
                        onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                        placeholder="Hastanın tanısını girin..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İlaçlar <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={prescriptionMedications}
                        onChange={(e) => setPrescriptionMedications(e.target.value)}
                        rows={6}
                        placeholder="İlaçları her satıra bir tane olacak şekilde yazın. Örn:&#10;Parol 500mg - Günde 3 kez, yemeklerden sonra&#10;Aspirin 100mg - Günde 1 kez, sabah&#10;..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                      <p className="mt-1 text-sm text-gray-500">Her ilacı ayrı satıra yazın. İlaç adı, dozaj ve kullanım talimatlarını belirtin.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notlar (Opsiyonel)
                      </label>
                      <textarea
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        rows={3}
                        placeholder="Reçete ile ilgili ek notlar..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      />
                    </div>

                    {/* Hata Mesajı */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* Butonlar */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowWritePrescriptionModal(false);
                          setSelectedPrescriptionPatient(null);
                          setPrescriptionPatientSearch("");
                          setPrescriptionPatientResults([]);
                          setPrescriptionAppointments([]);
                          setSelectedPrescriptionAppointment(null);
                          setPrescriptionDiagnosis("");
                          setPrescriptionMedications("");
                          setPrescriptionNotes("");
                          setError("");
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                        disabled={creatingPrescription}
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleCreatePrescription}
                        disabled={creatingPrescription || !selectedPrescriptionPatient || !selectedPrescriptionAppointment || !prescriptionMedications}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition"
                      >
                        {creatingPrescription ? "Oluşturuluyor..." : "Reçete Oluştur"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Online Görüşme Modal */}
        {showOnlineMeetingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Online Görüşme Başlat</h3>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAvailableMeetings}
                    disabled={loadingMeetings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm"
                  >
                    {loadingMeetings ? "Yenileniyor..." : "Yenile"}
                  </button>
                  <button
                    onClick={() => {
                      setShowOnlineMeetingModal(false);
                      setAvailableMeetings([]);
                      setSelectedMeetingAppointment(null);
                      setMeetingStarted(false);
                      setMeetingLink("");
                      setError("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {meetingStarted && selectedMeetingAppointment ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-green-800 mb-2">Görüşme Başlatıldı</h4>
                    <p className="text-sm text-green-700 mb-4">
                      Görüşme yeni bir pencerede açıldı. Eğer açılmadıysa aşağıdaki linke tıklayın.
                    </p>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-2">Görüşme Linki:</p>
                      <a
                        href={meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all text-sm"
                      >
                        {meetingLink}
                      </a>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-sm font-medium text-blue-900 mb-2">Hasta Bilgileri:</p>
                      <p className="text-sm text-blue-800"><strong>Ad Soyad:</strong> {selectedMeetingAppointment.patient.name}</p>
                      {selectedMeetingAppointment.patient.age && (
                        <p className="text-sm text-blue-800"><strong>Yaş:</strong> {selectedMeetingAppointment.patient.age}</p>
                      )}
                      {selectedMeetingAppointment.patient.tcKimlikNo && (
                        <p className="text-sm text-blue-800"><strong>T.C. Kimlik No:</strong> {selectedMeetingAppointment.patient.tcKimlikNo}</p>
                      )}
                      {selectedMeetingAppointment.patient.allergies && (
                        <p className="text-sm text-blue-800"><strong>Alerjiler:</strong> {selectedMeetingAppointment.patient.allergies}</p>
                      )}
                      {selectedMeetingAppointment.patient.chronicDiseases && (
                        <p className="text-sm text-blue-800"><strong>Kronik Rahatsızlıklar:</strong> {selectedMeetingAppointment.patient.chronicDiseases}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      ⏱️ Görüşme süresi: 15 dakika | Görüşme sonrası 5 dakika boşluk
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>📋 Bilgi:</strong> Her görüşme 15 dakika sürer. Görüşmeler arasında 5 dakika boşluk bırakılır.
                    </p>
                  </div>

                  {loadingMeetings ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Randevular yükleniyor...</p>
                    </div>
                  ) : availableMeetings.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600 mb-2">Görüşmeye başlanabilir randevu bulunamadı</p>
                      <p className="text-sm text-gray-400">Randevu saati gelmiş hastalar burada görünecektir</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableMeetings.map((appointment) => {
                        const appointmentDate = new Date(appointment.appointmentDate);
                        const availableFrom = new Date(appointment.availableFrom);
                        const canStart = appointment.canStartNow;

                        return (
                          <div
                            key={appointment.id}
                            className={`border rounded-lg p-4 ${canStart ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{appointment.patient.name}</h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Randevu Saati:</strong> {appointmentDate.toLocaleString("tr-TR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {appointment.patient.age && (
                                  <p className="text-xs text-gray-500">Yaş: {appointment.patient.age}</p>
                                )}
                                {appointment.patient.tcKimlikNo && (
                                  <p className="text-xs text-gray-500">TC: {appointment.patient.tcKimlikNo}</p>
                                )}
                                {appointment.patient.allergies && (
                                  <p className="text-xs text-gray-500 mt-1">⚠️ Alerjiler: {appointment.patient.allergies}</p>
                                )}
                                {appointment.patient.chronicDiseases && (
                                  <p className="text-xs text-gray-500">🏥 Kronik: {appointment.patient.chronicDiseases}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {canStart ? (
                                  <span className="inline-block bg-green-500 text-white text-xs px-2 py-1 rounded mb-2">Başlatılabilir</span>
                                ) : (
                                  <span className="inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded mb-2">
                                    {appointment.timeUntilStart > 0 ? `${appointment.timeUntilStart} dk sonra` : "Bekleniyor"}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleStartMeeting(appointment)}
                                  disabled={!canStart}
                                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                                    canStart
                                      ? "bg-orange-600 text-white hover:bg-orange-700"
                                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  Görüşmeyi Başlat
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                              ⏱️ Görüşme süresi: 15 dakika | Sonrası: 5 dakika boşluk
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
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