"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";

interface DoctorDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  doctorProfile: {
    id: string;
    specialization: string;
    licenseNumber: string;
    tcKimlikNo: string | null;
    hospital: string | null;
    university: string | null;
    graduationYear: number | null;
    experience: number | null;
    appointmentPrice: number | null;
    verificationStatus: string;
    verifiedAt: string | null;
    rejectionReason: string | null;
    documents: DoctorDocument[];
  };
}

type TabType = "doctors" | "manage" | "prescriptions" | "reports" | "recordings" | "patients" | "budget" | "messages";

export default function AdminDoctorsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("doctors");
  
  // Doktorlar state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Doktor sayıları state
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  
  // Genel state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Reçeteler state
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedDoctorForPrescriptions, setSelectedDoctorForPrescriptions] = useState<string>("");
  const [prescriptionSearchId, setPrescriptionSearchId] = useState<string>("");
  const [doctorNameSearch, setDoctorNameSearch] = useState<string>("");
  const [patientTcKimlikNoSearch, setPatientTcKimlikNoSearch] = useState<string>("");
  const [patientNameSearch, setPatientNameSearch] = useState<string>("");
  
  // Raporlar state
  const [reports, setReports] = useState<any[]>([]);
  const [selectedDoctorForReports, setSelectedDoctorForReports] = useState<string>("");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [reportSearchId, setReportSearchId] = useState<string>("");
  const [doctorNameSearchReports, setDoctorNameSearchReports] = useState<string>("");
  const [patientTcKimlikNoSearchReports, setPatientTcKimlikNoSearchReports] = useState<string>("");
  const [patientNameSearchReports, setPatientNameSearchReports] = useState<string>("");
  
  // Görüntülü görüşmeler state
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedDoctorForRecordings, setSelectedDoctorForRecordings] = useState<string>("");
  const [selectedRecording, setSelectedRecording] = useState<any | null>(null);
  const [recordingSearchId, setRecordingSearchId] = useState<string>("");
  const [doctorNameSearchRecordings, setDoctorNameSearchRecordings] = useState<string>("");
  const [patientTcKimlikNoSearchRecordings, setPatientTcKimlikNoSearchRecordings] = useState<string>("");
  const [patientNameSearchRecordings, setPatientNameSearchRecordings] = useState<string>("");
  const [uploadingRecordingFile, setUploadingRecordingFile] = useState(false);
  const [recordingFileToUpload, setRecordingFileToUpload] = useState<File | null>(null);
  
  // Onaylanmış doktorlar (filtreleme için)
  const [approvedDoctors, setApprovedDoctors] = useState<Doctor[]>([]);
  
  // Admin hastane bilgisi
  const [adminHospital, setAdminHospital] = useState<string>("");
  
  // Hastalar state
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedDoctorForPatients, setSelectedDoctorForPatients] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [doctorNameSearchPatients, setDoctorNameSearchPatients] = useState<string>("");
  const [patientTcKimlikNoSearchPatients, setPatientTcKimlikNoSearchPatients] = useState<string>("");
  const [patientNameSearchPatients, setPatientNameSearchPatients] = useState<string>("");
  
  // Bütçe state
  const [budgetData, setBudgetData] = useState<any>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [selectedDoctorForBudget, setSelectedDoctorForBudget] = useState<string>("");
  const [budgetStartDate, setBudgetStartDate] = useState<string>("");
  const [budgetEndDate, setBudgetEndDate] = useState<string>("");
  const [doctorSearchBudget, setDoctorSearchBudget] = useState<string>("");
  
  // Mesajlaşma state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageSearchDoctor, setMessageSearchDoctor] = useState<string>("");
  const [messageSearchPatient, setMessageSearchPatient] = useState<string>("");
  const [messageSearchStatus, setMessageSearchStatus] = useState<string>("");
  
  // Doktor yönetimi state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [newDoctorForm, setNewDoctorForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    licenseNumber: "",
    tcKimlikNo: "",
    university: "",
    graduationYear: "",
    workStatus: "",
    city: "",
    experience: "",
    bio: "",
  });
  const [editDoctorForm, setEditDoctorForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    licenseNumber: "",
    tcKimlikNo: "",
    university: "",
    graduationYear: "",
    workStatus: "",
    city: "",
    experience: "",
    bio: "",
    appointmentPrice: "",
  });
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [updatingDoctor, setUpdatingDoctor] = useState(false);
  const [editingDoctorDocuments, setEditingDoctorDocuments] = useState<any[]>([]);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; fileName: string } | null>(null);
  const [showSetPriceModal, setShowSetPriceModal] = useState(false);
  const [doctorForPrice, setDoctorForPrice] = useState<Doctor | null>(null);
  const [appointmentPrice, setAppointmentPrice] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [loadingDoctorPrice, setLoadingDoctorPrice] = useState(false);
  const [editDocuments, setEditDocuments] = useState({
    diploma: null as File | null,
    ttbBelgesi: null as File | null,
    uzmanlikBelgesi: null as File | null,
    kimlikOn: null as File | null,
    kimlikArka: null as File | null,
  });
  const [documents, setDocuments] = useState({
    diploma: null as File | null,
    ttbBelgesi: null as File | null,
    uzmanlikBelgesi: null as File | null,
    kimlikOn: null as File | null,
    kimlikArka: null as File | null,
  });
  
  // Uzmanlık alanları
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
  
  const workStatusOptions = [
    "Tam Zamanlı",
    "Yarı Zamanlı",
    "Serbest",
    "Emekli",
  ];

  useEffect(() => {
    // Admin cookie kontrolü ve hastane bilgisini al
    const checkAdminAuth = async () => {
      try {
        // Admin bilgilerini al (hastane adı dahil)
        const infoResponse = await fetch("/api/admin/info", {
          credentials: "include",
        });
        
        if (infoResponse.ok) {
          const infoData = await infoResponse.json();
          if (infoData.hospital) {
            setAdminHospital(infoData.hospital);
          }
        }

        const response = await fetch("/api/admin/doctors?status=PENDING");
        if (response.status === 403) {
          router.push("/admin/login");
          return;
        }
        // Cookie varsa ve geçerliyse sayfa yüklenecek
      } catch (err) {
        router.push("/admin/login");
      }
    };
    checkAdminAuth();
  }, [router]);

  // Onaylanmış doktorları al (filtreleme için)
  const fetchApprovedDoctors = async () => {
    try {
      const response = await fetch("/api/admin/doctors?status=APPROVED", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setApprovedDoctors(data.doctors || []);
      }
    } catch (err) {
      console.error("Error fetching approved doctors:", err);
    }
  };

  // Bütçe verilerini getir
  const fetchBudgetData = async () => {
    try {
      setLoadingBudget(true);
      const params = new URLSearchParams();
      if (selectedDoctorForBudget) {
        params.append("doctorId", selectedDoctorForBudget);
      }
      if (budgetStartDate) {
        params.append("startDate", budgetStartDate);
      }
      if (budgetEndDate) {
        params.append("endDate", budgetEndDate);
      }

      const response = await fetch(`/api/admin/budget?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Bütçe verileri alınamadı");
      }

      const data = await response.json();
      setBudgetData(data.data);
      setLoadingBudget(false);
    } catch (err: any) {
      console.error("Error fetching budget data:", err);
      setError(err.message || "Bütçe verileri alınırken bir hata oluştu");
      setLoadingBudget(false);
    }
  };

  // Mesajlaşma kayıtlarını getir
  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await fetch("/api/admin/messages", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Mesajlar alınamadı");
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setLoadingMessages(false);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setError(err.message || "Mesajlar alınırken bir hata oluştu");
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeTab === "doctors") {
      fetchDoctors();
      // fetchDoctors içinde fetchDoctorCounts çağrılıyor, burada tekrar çağırmaya gerek yok
    } else if (activeTab === "manage") {
      fetchApprovedDoctors();
    } else if (activeTab === "prescriptions") {
      fetchApprovedDoctors();
      fetchPrescriptions();
    } else if (activeTab === "reports") {
      fetchApprovedDoctors();
      fetchReports();
    } else if (activeTab === "recordings") {
      fetchApprovedDoctors();
      fetchRecordings();
    } else if (activeTab === "patients") {
      fetchApprovedDoctors();
      fetchPatients();
    } else if (activeTab === "budget") {
      fetchApprovedDoctors();
      fetchBudgetData();
    } else if (activeTab === "messages") {
      fetchMessages();
    }
  }, [activeTab, selectedStatus, selectedDoctorForPrescriptions, selectedDoctorForReports, selectedReportType, selectedDoctorForRecordings, selectedDoctorForPatients, prescriptionSearchId, doctorNameSearch, patientTcKimlikNoSearch, patientNameSearch, reportSearchId, doctorNameSearchReports, patientTcKimlikNoSearchReports, patientNameSearchReports, recordingSearchId, doctorNameSearchRecordings, patientTcKimlikNoSearchRecordings, patientNameSearchRecordings, doctorNameSearchPatients, patientTcKimlikNoSearchPatients, patientNameSearchPatients, selectedDoctorForBudget, budgetStartDate, budgetEndDate]);
  
  // Sayfa ilk yüklendiğinde sayıları çek
  useEffect(() => {
    if (activeTab === "doctors") {
      fetchDoctorCounts();
    }
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/prescriptions";
      const params = new URLSearchParams();
      if (selectedDoctorForPrescriptions) params.append("doctorId", selectedDoctorForPrescriptions);
      if (prescriptionSearchId) params.append("prescriptionId", prescriptionSearchId);
      if (doctorNameSearch) params.append("doctorName", doctorNameSearch);
      if (patientTcKimlikNoSearch) params.append("patientTcKimlikNo", patientTcKimlikNoSearch);
      if (patientNameSearch) params.append("patientName", patientNameSearch);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error("Reçeteler alınamadı");
      }
      
      const data = await response.json();
      setPrescriptions(data.prescriptions || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/reports";
      const params = new URLSearchParams();
      if (selectedDoctorForReports) params.append("doctorId", selectedDoctorForReports);
      if (selectedReportType) params.append("reportType", selectedReportType);
      if (reportSearchId) params.append("reportId", reportSearchId);
      if (doctorNameSearchReports) params.append("doctorName", doctorNameSearchReports);
      if (patientTcKimlikNoSearchReports) params.append("patientTcKimlikNo", patientTcKimlikNoSearchReports);
      if (patientNameSearchReports) params.append("patientName", patientNameSearchReports);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error("Raporlar alınamadı");
      }
      
      const data = await response.json();
      setReports(data.reports || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setLoading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/video-recordings";
      const params = new URLSearchParams();
      if (selectedDoctorForRecordings) params.append("doctorId", selectedDoctorForRecordings);
      if (recordingSearchId) params.append("recordingId", recordingSearchId);
      if (doctorNameSearchRecordings) params.append("doctorName", doctorNameSearchRecordings);
      if (patientTcKimlikNoSearchRecordings) params.append("patientTcKimlikNo", patientTcKimlikNoSearchRecordings);
      if (patientNameSearchRecordings) params.append("patientName", patientNameSearchRecordings);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: "include" });
      
      if (!response.ok) {
        throw new Error("Görüntülü görüşme kayıtları alınamadı");
      }
      
      const data = await response.json();
      setRecordings(data.recordings || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/patients";
      const params = new URLSearchParams();
      if (selectedDoctorForPatients) params.append("doctorId", selectedDoctorForPatients);
      if (doctorNameSearchPatients) params.append("doctorName", doctorNameSearchPatients);
      if (patientTcKimlikNoSearchPatients) params.append("patientTcKimlikNo", patientTcKimlikNoSearchPatients);
      if (patientNameSearchPatients) params.append("patientName", patientNameSearchPatients);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Hastalar alınamadı");
      }
      
      const data = await response.json();
      setPatients(data.patients || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setLoading(false);
    }
  };

  // Tüm status'lar için sayıları çek
  const fetchDoctorCounts = async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch(`/api/admin/doctors?status=PENDING`, { credentials: "include" }),
        fetch(`/api/admin/doctors?status=APPROVED`, { credentials: "include" }),
        fetch(`/api/admin/doctors?status=REJECTED`, { credentials: "include" }),
      ]);

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingCount(pendingData.doctors?.length || 0);
      }
      if (approvedRes.ok) {
        const approvedData = await approvedRes.json();
        setApprovedCount(approvedData.doctors?.length || 0);
      }
      if (rejectedRes.ok) {
        const rejectedData = await rejectedRes.json();
        setRejectedCount(rejectedData.doctors?.length || 0);
      }
    } catch (err) {
      console.error("Error fetching doctor counts:", err);
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/doctors?status=${selectedStatus}`, {
        credentials: "include", // Cookie göndermek için
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setError("Bu sayfaya erişim yetkiniz yok. Admin email adresiniz .env dosyasında ADMIN_EMAILS değişkenine eklenmelidir.");
        } else {
          setError(errorData.error || "Doktorlar alınamadı");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setDoctors(data.doctors);
      setLoading(false);
      
      // Doktorlar yüklendikten sonra sayıları güncelle
      await fetchDoctorCounts();
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setLoading(false);
    }
  };

  const handleApprove = async (doctorId: string) => {
    setProcessing(doctorId);
    setError("");

    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Cookie göndermek için
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Onay işlemi başarısız");
      }

      // Listeyi yenile ve sayıları güncelle
      await fetchDoctors();
      await fetchDoctorCounts();
      setProcessing(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedDoctor || !rejectionReason.trim()) {
      setError("Red sebebi gereklidir");
      return;
    }

    setProcessing(selectedDoctor.id);
    setError("");

    try {
      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Cookie göndermek için
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Red işlemi başarısız");
      }

      // Modal'ı kapat ve listeyi yenile
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedDoctor(null);
      await fetchDoctors();
      await fetchDoctorCounts();
      setProcessing(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setProcessing(null);
    }
  };

  const openRejectModal = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const handleCreateDoctor = async () => {
    setCreatingDoctor(true);
    setError("");

    try {
      // Önce doktoru oluştur
      const createResponse = await fetch("/api/admin/doctors/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...newDoctorForm,
          graduationYear: newDoctorForm.graduationYear ? parseInt(newDoctorForm.graduationYear) : undefined,
          experience: newDoctorForm.experience ? parseInt(newDoctorForm.experience) : undefined,
          tcKimlikNo: newDoctorForm.tcKimlikNo || undefined,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || "Doktor oluşturulurken bir hata oluştu");
      }

      const doctorUserId = createData.doctor.id;

      // Belgeleri yükle
      const formData = new FormData();
      
      if (documents.diploma) {
        const formData1 = new FormData();
        formData1.append("file", documents.diploma);
        formData1.append("documentType", "DIPLOMA");
        formData1.append("doctorId", doctorUserId);
        
        const diplomaResponse = await fetch("/api/doctors/documents/upload", {
          method: "POST",
          credentials: "include",
          body: formData1,
        });
        
        if (!diplomaResponse.ok) {
          throw new Error("Diploma yüklenirken bir hata oluştu");
        }
      }

      if (documents.ttbBelgesi) {
        const formData2 = new FormData();
        formData2.append("file", documents.ttbBelgesi);
        formData2.append("documentType", "TTB_BELGESI");
        formData2.append("doctorId", doctorUserId);
        
        const ttbResponse = await fetch("/api/doctors/documents/upload", {
          method: "POST",
          credentials: "include",
          body: formData2,
        });
        
        if (!ttbResponse.ok) {
          throw new Error("TTB Belgesi yüklenirken bir hata oluştu");
        }
      }

      if (documents.uzmanlikBelgesi) {
        const formData3 = new FormData();
        formData3.append("file", documents.uzmanlikBelgesi);
        formData3.append("documentType", "UZMANLIK_BELGESI");
        formData3.append("doctorId", doctorUserId);
        
        const uzmanlikResponse = await fetch("/api/doctors/documents/upload", {
          method: "POST",
          credentials: "include",
          body: formData3,
        });
        
        if (!uzmanlikResponse.ok) {
          throw new Error("Uzmanlık Belgesi yüklenirken bir hata oluştu");
        }
      }

      if (documents.kimlikOn) {
        const formData4 = new FormData();
        formData4.append("file", documents.kimlikOn);
        formData4.append("documentType", "KIMLIK_ON");
        formData4.append("doctorId", doctorUserId);
        
        const kimlikOnResponse = await fetch("/api/doctors/documents/upload", {
          method: "POST",
          credentials: "include",
          body: formData4,
        });
        
        if (!kimlikOnResponse.ok) {
          throw new Error("Kimlik ön yüz yüklenirken bir hata oluştu");
        }
      }

      if (documents.kimlikArka) {
        const formData5 = new FormData();
        formData5.append("file", documents.kimlikArka);
        formData5.append("documentType", "KIMLIK_ARKA");
        formData5.append("doctorId", doctorUserId);
        
        const kimlikArkaResponse = await fetch("/api/doctors/documents/upload", {
          method: "POST",
          credentials: "include",
          body: formData5,
        });
        
        if (!kimlikArkaResponse.ok) {
          throw new Error("Kimlik arka yüz yüklenirken bir hata oluştu");
        }
      }

      // Formu temizle ve modal'ı kapat
      setNewDoctorForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialization: "",
        licenseNumber: "",
        tcKimlikNo: "",
        university: "",
        graduationYear: "",
        workStatus: "",
        city: "",
        experience: "",
        bio: "",
      });
      setDocuments({
        diploma: null,
        ttbBelgesi: null,
        uzmanlikBelgesi: null,
        kimlikOn: null,
        kimlikArka: null,
      });
      setShowAddDoctorModal(false);
      
      // Listeyi yenile
      await fetchApprovedDoctors();
      setCreatingDoctor(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setCreatingDoctor(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm("Bu doktoru silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    setProcessing(doctorId);
    setError("");

    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}/delete`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Doktor silinirken bir hata oluştu");
      }

      // Listeyi yenile
      await fetchApprovedDoctors();
      setProcessing(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setProcessing(null);
    }
  };

  const handleEditDoctorClick = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setEditDoctorForm({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone || "",
      specialization: doctor.doctorProfile.specialization,
      licenseNumber: doctor.doctorProfile.licenseNumber,
      tcKimlikNo: doctor.doctorProfile.tcKimlikNo || "",
      university: doctor.doctorProfile.university || "",
      graduationYear: doctor.doctorProfile.graduationYear?.toString() || "",
      workStatus: (doctor.doctorProfile as any).workStatus || "",
      city: (doctor.doctorProfile as any).city || "",
      experience: (doctor.doctorProfile as any).experience?.toString() || "",
      bio: (doctor.doctorProfile as any).bio || "",
      appointmentPrice: (doctor.doctorProfile as any).appointmentPrice?.toString() || "",
    });
    // Doktorun belgelerini set et
    setEditingDoctorDocuments(doctor.doctorProfile.documents || []);
    setShowEditDoctorModal(true);
  };

  const handleDeleteDocumentClick = (documentId: string, fileName: string) => {
    setDocumentToDelete({ id: documentId, fileName });
    setShowDeleteDocumentModal(true);
  };

  const handleDeleteDocumentConfirm = async () => {
    if (!documentToDelete) return;

    setDeletingDocumentId(documentToDelete.id);
    setError("");
    setShowDeleteDocumentModal(false);

    try {
      const response = await fetch(`/api/admin/doctors/documents/${documentToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Belge silinirken bir hata oluştu");
      }

      // Belge listesini güncelle
      setEditingDoctorDocuments((prev) => prev.filter((doc) => doc.id !== documentToDelete.id));
      
      // Doktor listesini yenile
      if (selectedStatus === "APPROVED") {
        await fetchApprovedDoctors();
      } else {
        await fetchDoctors();
      }
      
      setDeletingDocumentId(null);
      setDocumentToDelete(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setDeletingDocumentId(null);
      setDocumentToDelete(null);
    }
  };

  const handleUploadDocument = async (documentType: string, file: File) => {
    if (!editingDoctor) return;

    setUploadingDocumentType(documentType);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("doctorId", editingDoctor.id);

      const response = await fetch("/api/doctors/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Belge yüklenirken bir hata oluştu");
      }

      // Belge listesini güncelle - yeni belgeyi ekle
      const newDocument = {
        id: data.documentId,
        documentType: documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName || file.name,
      };
      setEditingDoctorDocuments((prev) => [...prev, newDocument]);

      // Doktor listesini yenile
      if (selectedStatus === "APPROVED") {
        await fetchApprovedDoctors();
      } else {
        await fetchDoctors();
      }

      // Dosya input'unu temizle
      setEditDocuments((prev) => ({ ...prev, [documentType.toLowerCase()]: null }));
      setUploadingDocumentType(null);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setUploadingDocumentType(null);
    }
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;

    setUpdatingDoctor(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/doctors/${editingDoctor.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...editDoctorForm,
          graduationYear: editDoctorForm.graduationYear ? parseInt(editDoctorForm.graduationYear) : undefined,
          experience: editDoctorForm.experience ? parseInt(editDoctorForm.experience) : undefined,
          tcKimlikNo: editDoctorForm.tcKimlikNo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Doktor güncellenirken bir hata oluştu");
      }

      // Modal'ı kapat ve formu temizle
      setShowEditDoctorModal(false);
      setEditingDoctor(null);
      setEditDoctorForm({
        name: "",
        email: "",
        phone: "",
        specialization: "",
        licenseNumber: "",
        tcKimlikNo: "",
        university: "",
        graduationYear: "",
        workStatus: "",
        city: "",
        experience: "",
        bio: "",
        appointmentPrice: "",
      });
      
      // Listeyi yenile
      await fetchApprovedDoctors();
      setUpdatingDoctor(false);
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
      setUpdatingDoctor(false);
    }
  };

  const handleSetPriceClick = async (doctor: Doctor) => {
    // Önce modal'ı aç ve loading state'ini aktif et
    setShowSetPriceModal(true);
    setLoadingDoctorPrice(true);
    setDoctorForPrice(doctor);
    setAppointmentPrice(""); // Önce temizle
    
    // Doktorun güncel bilgilerini API'den çek (cache bypass için timestamp ekle)
    try {
      const response = await fetch(`/api/admin/doctors?status=APPROVED&_t=${Date.now()}`, { 
        credentials: "include",
        cache: "no-store" // Cache'i bypass et
      });
      if (response.ok) {
        const data = await response.json();
        console.log("API Response - Tüm doktorlar:", data.doctors?.length);
        console.log("API Response - İlk doktor:", data.doctors?.[0]);
        console.log("API Response - İlk doktor appointmentPrice:", data.doctors?.[0]?.doctorProfile?.appointmentPrice);
        
        const updatedDoctor = data.doctors?.find((d: Doctor) => d.id === doctor.id);
        console.log("Bulunan doktor:", updatedDoctor);
        console.log("Bulunan doktor doctorProfile:", updatedDoctor?.doctorProfile);
        console.log("Bulunan doktor appointmentPrice:", updatedDoctor?.doctorProfile?.appointmentPrice);
        
        if (updatedDoctor) {
          setDoctorForPrice(updatedDoctor);
          const updatedPrice = updatedDoctor.doctorProfile?.appointmentPrice;
          console.log("Doktor güncel ücreti (raw):", updatedPrice, "type:", typeof updatedPrice);
          setAppointmentPrice(updatedPrice != null ? updatedPrice.toString() : "");
          console.log("Doktor güncel ücreti (string):", updatedPrice != null ? updatedPrice.toString() : "");
        } else {
          // Eğer approved listesinde bulunamazsa, mevcut doktor verisini kullan
          const currentPrice = doctor.doctorProfile?.appointmentPrice;
          setAppointmentPrice(currentPrice != null ? currentPrice.toString() : "");
          console.log("Doktor listede bulunamadı, mevcut ücret:", currentPrice);
        }
      } else {
        // Hata durumunda mevcut veriyi kullan
        const currentPrice = doctor.doctorProfile?.appointmentPrice;
        setAppointmentPrice(currentPrice != null ? currentPrice.toString() : "");
        console.log("API hatası, mevcut ücret:", currentPrice);
      }
    } catch (err) {
      console.error("Error fetching updated doctor info:", err);
      // Hata durumunda mevcut veriyi kullan
      const currentPrice = doctor.doctorProfile?.appointmentPrice;
      setAppointmentPrice(currentPrice != null ? currentPrice.toString() : "");
      console.log("Hata durumunda mevcut ücret:", currentPrice);
    } finally {
      setLoadingDoctorPrice(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!doctorForPrice) return;

    setUpdatingPrice(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/doctors/${doctorForPrice.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          appointmentPrice: appointmentPrice ? parseFloat(appointmentPrice) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ücret güncellenirken bir hata oluştu");
      }

      // Başarı mesajı göster
      showSuccess(`Doktor ücreti başarıyla ${appointmentPrice ? `${appointmentPrice} TL olarak` : "kaldırıldı"} güncellendi.`);

      // Listeyi yenile
      await fetchApprovedDoctors();
      
      // Modal'ı kapat ve formu temizle
      setShowSetPriceModal(false);
      setDoctorForPrice(null);
      setAppointmentPrice("");
      setError("");
      setUpdatingPrice(false);
    } catch (err: any) {
      const errorMessage = err.message || "Bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
      setUpdatingPrice(false);
    }
  };

  const handleUploadRecordingFile = async () => {
    if (!selectedRecording || !recordingFileToUpload) return;

    setUploadingRecordingFile(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", recordingFileToUpload);

      const response = await fetch(`/api/admin/video-recordings/${selectedRecording.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kayıt dosyası yüklenirken bir hata oluştu");
      }

      // Başarı mesajı göster
      showSuccess("Kayıt dosyası başarıyla yüklendi.");

      // Kayıtları yenile
      await fetchRecordings();

      // Seçili kaydı güncelle
      if (selectedRecording) {
        const updatedRecording = { ...selectedRecording, recordingFileUrl: data.recordingFileUrl };
        setSelectedRecording(updatedRecording);
      }

      // Dosya input'unu temizle
      setRecordingFileToUpload(null);
      setUploadingRecordingFile(false);
    } catch (err: any) {
      const errorMessage = err.message || "Bir hata oluştu";
      setError(errorMessage);
      showError(errorMessage);
      setUploadingRecordingFile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative pb-12">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="text-white/90 hover:text-white flex items-center gap-2 transition-colors font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Ana Sayfa
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {adminHospital ? `${adminHospital} Yönetim Paneli` : "Hastane Yönetim Paneli"}
            </h1>
            <button
              onClick={async () => {
                // Cookie'yi sil
                document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                router.push("/admin/login");
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 w-full">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-2 flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-1 overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab("doctors")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "doctors"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Doktorlar
            </button>
            <button
              onClick={() => setActiveTab("prescriptions")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "prescriptions"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reçeteler
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "reports"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Raporlar
            </button>
            <button
              onClick={() => setActiveTab("recordings")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "recordings"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Görüntülü Görüşmeler
            </button>
            <button
              onClick={() => setActiveTab("patients")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "patients"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Hastalar
            </button>
            <button
              onClick={() => setActiveTab("budget")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "budget"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bütçe
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "messages"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mesajlaşma Kayıtları
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-4 py-3 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === "manage"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Doktor Yönetimi
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "doctors" && (
          <>
        {/* Durum Filtreleri */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-1 mt-1">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedStatus("PENDING")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedStatus === "PENDING"
                  ? "bg-yellow-500 text-white shadow-lg"
                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              }`}
            >
              Onay Bekleyenler ({pendingCount})
            </button>
            <button
              onClick={() => setSelectedStatus("APPROVED")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedStatus === "APPROVED"
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              Onaylananlar ({approvedCount})
            </button>
            <button
              onClick={() => setSelectedStatus("REJECTED")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedStatus === "REJECTED"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              Reddedilenler ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Doktor Listesi */}
        <div className="space-y-6">
          {doctors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 text-lg">
                {selectedStatus === "PENDING"
                  ? "Onay bekleyen doktor bulunmuyor"
                  : selectedStatus === "APPROVED"
                  ? "Onaylanan doktor bulunmuyor"
                  : "Reddedilen doktor bulunmuyor"}
              </p>
            </div>
          ) : (
            doctors.map((doctor) => (
              <div key={doctor.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Sol Taraf - Doktor Bilgileri */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{doctor.name}</h3>
                        <p className="text-gray-600">{doctor.email}</p>
                        {doctor.phone && <p className="text-gray-600">Tel: {doctor.phone}</p>}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          doctor.doctorProfile.verificationStatus === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : doctor.doctorProfile.verificationStatus === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {doctor.doctorProfile.verificationStatus === "APPROVED"
                          ? "Onaylandı"
                          : doctor.doctorProfile.verificationStatus === "REJECTED"
                          ? "Reddedildi"
                          : "Onay Bekliyor"}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Uzmanlık Alanı</p>
                        <p className="font-semibold text-gray-900">{doctor.doctorProfile.specialization}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Lisans Numarası</p>
                        <p className="font-semibold text-gray-900 font-mono">{doctor.doctorProfile.licenseNumber}</p>
                      </div>
                      {doctor.doctorProfile.tcKimlikNo && (
                        <div>
                          <p className="text-sm text-gray-500">T.C. Kimlik No</p>
                          <p className="font-semibold text-gray-900 font-mono">{doctor.doctorProfile.tcKimlikNo}</p>
                        </div>
                      )}
                      {doctor.doctorProfile.experience && (
                        <div>
                          <p className="text-sm text-gray-500">Deneyim</p>
                          <p className="font-semibold text-gray-900">{doctor.doctorProfile.experience} yıl</p>
                        </div>
                      )}
                      {doctor.doctorProfile.hospital && (
                        <div>
                          <p className="text-sm text-gray-500">Hastane/Klinik</p>
                          <p className="font-semibold text-gray-900">{doctor.doctorProfile.hospital}</p>
                        </div>
                      )}
                      {doctor.doctorProfile.university && (
                        <div>
                          <p className="text-sm text-gray-500">Üniversite</p>
                          <p className="font-semibold text-gray-900">{doctor.doctorProfile.university}</p>
                        </div>
                      )}
                    </div>

                    {doctor.doctorProfile.rejectionReason && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
                        <p className="text-sm font-semibold text-red-700 mb-1">Red Sebebi:</p>
                        <p className="text-red-600">{doctor.doctorProfile.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Sağ Taraf - Belgeler ve İşlemler */}
                  <div className="lg:w-96">
                    <h4 className="font-semibold text-gray-900 mb-3">Yüklenen Belgeler</h4>
                    <div className="space-y-2 mb-4">
                      {doctor.doctorProfile.documents.length === 0 ? (
                        <p className="text-sm text-gray-500">Henüz belge yüklenmemiş</p>
                      ) : (
                        doctor.doctorProfile.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={`/api/admin/doctors/documents/${doc.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-500">{doc.documentType}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))
                      )}
                    </div>

                    {selectedStatus === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDoctorClick(doctor)}
                          disabled={processing === doctor.id || updatingDoctor}
                          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleApprove(doctor.id)}
                          disabled={processing === doctor.id}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {processing === doctor.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Onaylanıyor...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Onayla
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(doctor)}
                          disabled={processing === doctor.id}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        )}
      </main>

        {/* Reçeteler Tab */}
        {activeTab === "prescriptions" && (
          <div className="space-y-2 mt-1">
            {/* Doktor Filtresi ve Arama Bölümleri */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Reçeteler</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Seç (Opsiyonel)</label>
                  <select
                    value={selectedDoctorForPrescriptions}
                    onChange={(e) => setSelectedDoctorForPrescriptions(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Doktorlar</option>
                    {approvedDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.doctorProfile.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reçete No Ara</label>
                  <input
                    type="text"
                    value={prescriptionSearchId}
                    onChange={(e) => setPrescriptionSearchId(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPrescriptions();
                      }
                    }}
                    placeholder="Reçete ID'si girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Adı Ara</label>
                  <input
                    type="text"
                    value={doctorNameSearch}
                    onChange={(e) => setDoctorNameSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPrescriptions();
                      }
                    }}
                    placeholder="Doktor adı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientTcKimlikNoSearch}
                    onChange={(e) => setPatientTcKimlikNoSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPrescriptions();
                      }
                    }}
                    placeholder="T.C. Kimlik No girin..."
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim Soyisim ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientNameSearch}
                    onChange={(e) => setPatientNameSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPrescriptions();
                      }
                    }}
                    placeholder="Hasta adı veya soyadı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchPrescriptions}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ara
                </button>
                {(prescriptionSearchId || doctorNameSearch || patientTcKimlikNoSearch || patientNameSearch || selectedDoctorForPrescriptions) && (
                  <button
                    onClick={() => {
                      setPrescriptionSearchId("");
                      setDoctorNameSearch("");
                      setPatientTcKimlikNoSearch("");
                      setPatientNameSearch("");
                      setSelectedDoctorForPrescriptions("");
                      fetchPrescriptions();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Reçete Listesi */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Yükleniyor...</p>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">Henüz reçete bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {prescription.patient.name} - {prescription.doctor.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(prescription.prescriptionDate).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {prescription.diagnosis && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                          {prescription.diagnosis}
                        </span>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">İlaçlar:</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{prescription.medications}</p>
                      {prescription.notes && (
                        <>
                          <p className="text-sm font-semibold text-gray-700 mt-4 mb-2">Notlar:</p>
                          <p className="text-gray-600">{prescription.notes}</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raporlar Tab */}
        {activeTab === "reports" && (
          <div className="space-y-2 mt-1">
            {/* Filtreler ve Arama Bölümleri */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Raporlar</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Seç (Opsiyonel)</label>
                  <select
                    value={selectedDoctorForReports}
                    onChange={(e) => setSelectedDoctorForReports(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Doktorlar</option>
                    {approvedDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.doctorProfile.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rapor Tipi (Opsiyonel)</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Raporlar</option>
                    <option value="Muayene">Muayene</option>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rapor No Ara</label>
                  <input
                    type="text"
                    value={reportSearchId}
                    onChange={(e) => setReportSearchId(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchReports();
                      }
                    }}
                    placeholder="Rapor ID'si girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Adı Ara</label>
                  <input
                    type="text"
                    value={doctorNameSearchReports}
                    onChange={(e) => setDoctorNameSearchReports(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchReports();
                      }
                    }}
                    placeholder="Doktor adı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientTcKimlikNoSearchReports}
                    onChange={(e) => setPatientTcKimlikNoSearchReports(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchReports();
                      }
                    }}
                    placeholder="T.C. Kimlik No girin..."
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim Soyisim ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientNameSearchReports}
                    onChange={(e) => setPatientNameSearchReports(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchReports();
                      }
                    }}
                    placeholder="Hasta adı veya soyadı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchReports}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ara
                </button>
                {(reportSearchId || doctorNameSearchReports || patientTcKimlikNoSearchReports || patientNameSearchReports || selectedDoctorForReports || selectedReportType) && (
                  <button
                    onClick={() => {
                      setReportSearchId("");
                      setDoctorNameSearchReports("");
                      setPatientTcKimlikNoSearchReports("");
                      setPatientNameSearchReports("");
                      setSelectedDoctorForReports("");
                      setSelectedReportType("");
                      fetchReports();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Rapor Listesi */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Yükleniyor...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">Henüz rapor bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{report.title}</h3>
                        <p className="text-sm text-gray-600">
                          {report.patient.name} - {report.doctor.name} ({report.doctor.doctorProfile.specialization})
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(report.reportDate).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        {report.reportType}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{report.content}</p>
                      {report.fileUrl && (
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Rapor Dosyasını Görüntüle
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bütçe Tab */}
        {activeTab === "budget" && (
          <div className="space-y-2 mt-1">
            {/* Filtreler */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Bütçe Yönetimi</h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Seç (Opsiyonel)</label>
                  <select
                    value={selectedDoctorForBudget}
                    onChange={(e) => setSelectedDoctorForBudget(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Doktorlar</option>
                    {approvedDoctors
                      .filter((doctor) => 
                        !doctorSearchBudget || 
                        doctor.name.toLowerCase().includes(doctorSearchBudget.toLowerCase()) ||
                        doctor.doctorProfile.specialization.toLowerCase().includes(doctorSearchBudget.toLowerCase())
                      )
                      .map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.doctorProfile.specialization}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Ara</label>
                  <input
                    type="text"
                    value={doctorSearchBudget}
                    onChange={(e) => setDoctorSearchBudget(e.target.value)}
                    placeholder="Doktor adı veya uzmanlık..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={budgetStartDate}
                    onChange={(e) => setBudgetStartDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={budgetEndDate}
                    onChange={(e) => setBudgetEndDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={fetchBudgetData}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Filtrele
                </button>
                {(selectedDoctorForBudget || budgetStartDate || budgetEndDate) && (
                  <button
                    onClick={() => {
                      setSelectedDoctorForBudget("");
                      setBudgetStartDate("");
                      setBudgetEndDate("");
                      fetchBudgetData();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Bütçe Özeti */}
            {loadingBudget ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Bütçe verileri yükleniyor...</p>
              </div>
            ) : budgetData ? (
              <>
                {/* Toplam Gelir Kartları */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Toplam Gelir</h3>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold">{budgetData.totalRevenue.toFixed(2)} TL</p>
                    <p className="text-sm mt-2 opacity-90">{budgetData.totalAppointments} randevu</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Toplam Randevu</h3>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold">{budgetData.totalAppointments}</p>
                    <p className="text-sm mt-2 opacity-90">Ödenmiş randevular</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Ortalama Gelir</h3>
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold">
                      {budgetData.totalAppointments > 0 
                        ? (budgetData.totalRevenue / budgetData.totalAppointments).toFixed(2)
                        : "0.00"} TL
                    </p>
                    <p className="text-sm mt-2 opacity-90">Randevu başına</p>
                  </div>
                </div>

                {/* Doktor Bazlı Gelir */}
                {budgetData.revenueByDoctor && budgetData.revenueByDoctor.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Doktor Bazlı Gelir</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Doktor</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Uzmanlık</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Randevu Sayısı</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Toplam Gelir</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Ortalama</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetData.revenueByDoctor.map((doctor: any, index: number) => (
                            <tr key={doctor.doctorId} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-gray-900">{doctor.doctorName}</div>
                                <div className="text-sm text-gray-500">{doctor.doctorEmail}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">{doctor.specialization || "-"}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-900">{doctor.appointmentCount}</td>
                              <td className="py-3 px-4 text-right font-bold text-green-600">{doctor.revenue.toFixed(2)} TL</td>
                              <td className="py-3 px-4 text-right text-gray-700">
                                {doctor.appointmentCount > 0 
                                  ? (doctor.revenue / doctor.appointmentCount).toFixed(2)
                                  : "0.00"} TL
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Randevu Detayları */}
                {budgetData.appointments && budgetData.appointments.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Ödeme Detayları</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Tarih</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Doktor</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Hasta</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Tutar</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Ödeme Yöntemi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetData.appointments.map((apt: any) => (
                            <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-700">
                                {new Date(apt.paymentDate || apt.appointmentDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-gray-900">{apt.doctorName}</div>
                                <div className="text-sm text-gray-500">{apt.specialization || "-"}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-gray-900">{apt.patientName}</div>
                                <div className="text-sm text-gray-500">{apt.patientEmail}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-green-600">{apt.paymentAmount?.toFixed(2) || "0.00"} TL</td>
                              <td className="py-3 px-4 text-gray-700">
                                {apt.paymentMethod === "CREDIT_CARD" ? "Kredi Kartı" : 
                                 apt.paymentMethod === "DEBIT_CARD" ? "Banka Kartı" :
                                 apt.paymentMethod === "BANK_TRANSFER" ? "Banka Transferi" :
                                 apt.paymentMethod || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!budgetData.appointments || budgetData.appointments.length === 0) && (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-600 text-lg">Seçilen kriterlere uygun ödeme kaydı bulunamadı.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 text-lg">Bütçe verileri yüklenemedi.</p>
              </div>
            )}
          </div>
        )}

        {/* Mesajlaşma Kayıtları Tab */}
        {activeTab === "messages" && (
          <div className="space-y-2 mt-1">
            {/* Filtreler ve Arama Bölümleri */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Mesajlaşma Kayıtları</h2>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Ara</label>
                  <input
                    type="text"
                    value={messageSearchDoctor}
                    onChange={(e) => setMessageSearchDoctor(e.target.value)}
                    placeholder="Doktor adı veya email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta Ara</label>
                  <input
                    type="text"
                    value={messageSearchPatient}
                    onChange={(e) => setMessageSearchPatient(e.target.value)}
                    placeholder="Hasta adı veya email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Durum Filtresi</label>
                  <select
                    value={messageSearchStatus}
                    onChange={(e) => setMessageSearchStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="PENDING">Beklemede</option>
                    <option value="ACTIVE">Aktif</option>
                    <option value="CLOSED">Kapatıldı</option>
                    <option value="BLOCKED">Engellendi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mesaj Listesi */}
            {loadingMessages ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Mesajlar yükleniyor...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">Henüz mesaj kaydı bulunmuyor</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doktor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesaj</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ekler</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {messages
                        .filter((msg) => {
                          const doctorMatch = !messageSearchDoctor || 
                            (msg.doctor?.name?.toLowerCase().includes(messageSearchDoctor.toLowerCase()) ||
                             msg.doctor?.email?.toLowerCase().includes(messageSearchDoctor.toLowerCase()));
                          const patientMatch = !messageSearchPatient ||
                            (msg.patient?.name?.toLowerCase().includes(messageSearchPatient.toLowerCase()) ||
                             msg.patient?.email?.toLowerCase().includes(messageSearchPatient.toLowerCase()));
                          const statusMatch = !messageSearchStatus || msg.status === messageSearchStatus;
                          return doctorMatch && patientMatch && statusMatch;
                        })
                        .map((msg) => (
                          <tr key={msg.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(msg.createdAt).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {msg.doctor?.name || "Bilinmiyor"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {msg.doctor?.specialization || "-"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {msg.doctor?.email || "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {msg.patient?.name || "Bilinmiyor"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {msg.patient?.email || "-"}
                              </div>
                              {msg.patient?.tcKimlikNo && (
                                <div className="text-xs text-gray-400">
                                  TC: {msg.patient.tcKimlikNo}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={msg.message}>
                                {msg.message}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  msg.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : msg.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : msg.status === "CLOSED"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {msg.status === "PENDING"
                                  ? "Beklemede"
                                  : msg.status === "ACTIVE"
                                  ? "Aktif"
                                  : msg.status === "CLOSED"
                                  ? "Kapatıldı"
                                  : "Engellendi"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {msg.attachments && msg.attachments.length > 0 ? (
                                <span className="text-indigo-600 font-semibold">
                                  {msg.attachments.length} dosya
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => setSelectedMessage(msg)}
                                className="text-indigo-600 hover:text-indigo-900 font-semibold"
                              >
                                Detay
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mesaj Detay Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Mesaj Detayları</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Doktor Bilgileri */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Doktor Bilgileri</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Ad:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.doctor?.name || "Bilinmiyor"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.doctor?.email || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Uzmanlık:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.doctor?.specialization || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hastane:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.doctor?.hospital || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Hasta Bilgileri */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Hasta Bilgileri</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Ad:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.patient?.name || "Bilinmiyor"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedMessage.patient?.email || "-"}</span>
                    </div>
                    {selectedMessage.patient?.tcKimlikNo && (
                      <div>
                        <span className="text-gray-600">TC Kimlik No:</span>{" "}
                        <span className="font-medium text-gray-900">{selectedMessage.patient.tcKimlikNo}</span>
                      </div>
                    )}
                    {selectedMessage.patient?.phone && (
                      <div>
                        <span className="text-gray-600">Telefon:</span>{" "}
                        <span className="font-medium text-gray-900">{selectedMessage.patient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mesaj İçeriği */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Mesaj İçeriği</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Durum ve Tarih Bilgileri */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Durum</h4>
                    <span
                      className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                        selectedMessage.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedMessage.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : selectedMessage.status === "CLOSED"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedMessage.status === "PENDING"
                        ? "Beklemede"
                        : selectedMessage.status === "ACTIVE"
                        ? "Aktif"
                        : selectedMessage.status === "CLOSED"
                        ? "Kapatıldı"
                        : "Engellendi"}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Tarih Bilgileri</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-gray-600">Gönderilme:</span>{" "}
                        <span className="font-medium text-gray-900">
                          {new Date(selectedMessage.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {selectedMessage.startedAt && (
                        <div>
                          <span className="text-gray-600">Başlatılma:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {new Date(selectedMessage.startedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      )}
                      {selectedMessage.closedAt && (
                        <div>
                          <span className="text-gray-600">Kapatılma:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {new Date(selectedMessage.closedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      )}
                      {selectedMessage.blockedAt && (
                        <div>
                          <span className="text-gray-600">Engellenme:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {new Date(selectedMessage.blockedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ekler */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Ekler ({selectedMessage.attachments.length})</h4>
                    <div className="space-y-2">
                      {selectedMessage.attachments.map((att: any) => (
                        <div key={att.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="font-medium text-gray-900">{att.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {att.fileSize ? `${(att.fileSize / 1024).toFixed(2)} KB` : "Boyut bilinmiyor"} • {att.fileType || "Tip bilinmiyor"}
                              </p>
                            </div>
                          </div>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            İndir
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doktor Yönetimi Tab */}
        {activeTab === "manage" && (
          <div className="space-y-2 mt-1">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-gray-900">Doktor Yönetimi</h2>
                <button
                  onClick={() => setShowAddDoctorModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Yeni Doktor Ekle
                </button>
              </div>

              {/* Doktor Listesi */}
              {loading ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600">Yükleniyor...</p>
                </div>
              ) : approvedDoctors.length === 0 ? (
                <div className="text-center py-6">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-600">Henüz doktor bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedDoctors.map((doctor) => (
                    <div key={doctor.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.email}</p>
                        <p className="text-sm text-gray-500">{doctor.doctorProfile.specialization}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDoctorClick(doctor)}
                          disabled={processing === doctor.id || updatingDoctor}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleSetPriceClick(doctor)}
                          disabled={processing === doctor.id || updatingPrice}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Doktor Ücret Belirleme
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor.id)}
                          disabled={processing === doctor.id || updatingDoctor}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {processing === doctor.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Sil
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Görüntülü Görüşmeler Tab */}
        {activeTab === "recordings" && (
          <div className="space-y-2 mt-1">
            {/* Doktor Filtresi ve Arama Bölümleri */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Görüntülü Görüşme Kayıtları</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Seç (Opsiyonel)</label>
                  <select
                    value={selectedDoctorForRecordings}
                    onChange={(e) => setSelectedDoctorForRecordings(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Doktorlar</option>
                    {approvedDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.doctorProfile.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Görüntülü Görüşme ID Ara</label>
                  <input
                    type="text"
                    value={recordingSearchId}
                    onChange={(e) => setRecordingSearchId(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchRecordings();
                      }
                    }}
                    placeholder="Görüntülü görüşme ID'si girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Adı Ara</label>
                  <input
                    type="text"
                    value={doctorNameSearchRecordings}
                    onChange={(e) => setDoctorNameSearchRecordings(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchRecordings();
                      }
                    }}
                    placeholder="Doktor adı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientTcKimlikNoSearchRecordings}
                    onChange={(e) => setPatientTcKimlikNoSearchRecordings(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchRecordings();
                      }
                    }}
                    placeholder="T.C. Kimlik No girin..."
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim Soyisim ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientNameSearchRecordings}
                    onChange={(e) => setPatientNameSearchRecordings(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchRecordings();
                      }
                    }}
                    placeholder="Hasta adı veya soyadı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchRecordings}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ara
                </button>
                {(recordingSearchId || doctorNameSearchRecordings || patientTcKimlikNoSearchRecordings || patientNameSearchRecordings || selectedDoctorForRecordings) && (
                  <button
                    onClick={() => {
                      setRecordingSearchId("");
                      setDoctorNameSearchRecordings("");
                      setPatientTcKimlikNoSearchRecordings("");
                      setPatientNameSearchRecordings("");
                      setSelectedDoctorForRecordings("");
                      fetchRecordings();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Görüntülü Görüşme Listesi */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Yükleniyor...</p>
              </div>
            ) : recordings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">Henüz görüntülü görüşme kaydı bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording) => (
                  <div key={recording.id} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                          {/* Doktor Bilgileri */}
                          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <h4 className="font-semibold text-blue-900">Doktor Bilgileri</h4>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{recording.doctor.name}</p>
                            <p className="text-sm text-gray-600">{recording.doctor.doctorProfile.specialization}</p>
                            <p className="text-xs text-gray-500 mt-1">{recording.doctor.email}</p>
                          </div>

                          {/* Hasta Bilgileri */}
                          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <h4 className="font-semibold text-green-900">Hasta Bilgileri</h4>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{recording.patient.name}</p>
                            <p className="text-sm text-gray-600">{recording.patient.email}</p>
                            {recording.patient.patientProfile?.tcKimlikNo && (
                              <p className="text-xs text-gray-500 mt-1">T.C. Kimlik No: {recording.patient.patientProfile.tcKimlikNo}</p>
                            )}
                          </div>
                        </div>

                        {/* Görüşme Bilgileri */}
                        <div className="bg-gray-50 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2 text-gray-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold">Görüşme Tarihi:</span>
                            <span className="text-sm">
                              {new Date(recording.recordingDate).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {recording.duration && (
                              <>
                                <span className="text-gray-400 mx-2">•</span>
                                <span className="text-sm font-semibold">Süre:</span>
                                <span className="text-sm">
                                  {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, "0")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedRecording(recording)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Detayları Gör
                      </button>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      {recording.consentGiven && (
                        <div className="flex items-center gap-2 text-green-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold">Hasta Rızası Verildi</span>
                          {recording.consentDate && (
                            <span className="text-xs text-gray-500">
                              ({new Date(recording.consentDate).toLocaleDateString("tr-TR")})
                            </span>
                          )}
                        </div>
                      )}
                      {!recording.consentGiven && (
                        <div className="flex items-center gap-2 text-red-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold">Hasta Rızası Verilmedi</span>
                        </div>
                      )}
                      {recording.appointment?.notes && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Randevu Notları:</p>
                          <p className="text-gray-600 text-sm">{recording.appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Görüntülü Görüşme Detay Modal */}
            {selectedRecording && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">Görüntülü Görüşme Detayları</h3>
                    <button
                      onClick={() => {
                        setSelectedRecording(null);
                        setRecordingFileToUpload(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Doktor</p>
                        <p className="text-gray-900">{selectedRecording.doctor.name}</p>
                        <p className="text-sm text-gray-600">{selectedRecording.doctor.doctorProfile.specialization}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Hasta</p>
                        <p className="text-gray-900">{selectedRecording.patient.name}</p>
                        <p className="text-sm text-gray-600">{selectedRecording.patient.email}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Görüşme Tarihi</p>
                      <p className="text-gray-900">
                        {new Date(selectedRecording.recordingDate).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {selectedRecording.duration && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Süre</p>
                        <p className="text-gray-900">
                          {Math.floor(selectedRecording.duration / 60)}:{(selectedRecording.duration % 60).toString().padStart(2, "0")}
                        </p>
                      </div>
                    )}

                    {selectedRecording.notes && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Görüşme Notları</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedRecording.notes}</p>
                      </div>
                    )}

                    {selectedRecording.appointment?.notes && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Randevu Notları</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedRecording.appointment.notes}</p>
                      </div>
                    )}

                    <div className="mb-4 space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Rıza Bilgileri</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Rıza Durumu:</span>
                            {selectedRecording.consentGiven ? (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                ✓ Rıza Verildi
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                                ✗ Rıza Verilmedi
                              </span>
                            )}
                          </div>
                          {selectedRecording.consentDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Rıza Tarihi:</span>
                              <span className="text-sm text-gray-900">
                                {new Date(selectedRecording.consentDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                          {selectedRecording.consentIp && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Rıza IP Adresi:</span>
                              <span className="text-sm text-gray-900 font-mono">{selectedRecording.consentIp}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Video Kaydı</p>
                        <div className="space-y-2">
                          {selectedRecording.recordingFileUrl ? (
                            <div>
                              <a
                                href={selectedRecording.recordingFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Kaydedilmiş Video Dosyasını İndir
                              </a>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-500 italic">Kayıt dosyası henüz hazır değil</p>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Kayıt Dosyası Yükle
                                </label>
                                <input
                                  type="file"
                                  accept="video/*,.mp4,.webm,.mov"
                                  onChange={(e) => setRecordingFileToUpload(e.target.files?.[0] || null)}
                                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm mb-2"
                                />
                                {recordingFileToUpload && (
                                  <div className="mb-2">
                                    <p className="text-sm text-gray-600">
                                      Seçilen dosya: <span className="font-semibold">{recordingFileToUpload.name}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Boyut: {(recordingFileToUpload.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                )}
                                <button
                                  onClick={handleUploadRecordingFile}
                                  disabled={!recordingFileToUpload || uploadingRecordingFile}
                                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {uploadingRecordingFile ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Yükleniyor...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      Dosyayı Yükle
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                          <div>
                            <a
                              href={selectedRecording.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Görüşme Linkini Aç
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hastalar Tab */}
        {activeTab === "patients" && (
          <div className="space-y-2 mt-1">
            {/* Doktor Filtresi ve Arama Bölümleri */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Hastalar</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Seç (Opsiyonel)</label>
                  <select
                    value={selectedDoctorForPatients}
                    onChange={(e) => setSelectedDoctorForPatients(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Tüm Doktorlar</option>
                    {approvedDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.doctorProfile.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doktor Adı Ara</label>
                  <input
                    type="text"
                    value={doctorNameSearchPatients}
                    onChange={(e) => setDoctorNameSearchPatients(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPatients();
                      }
                    }}
                    placeholder="Doktor adı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientTcKimlikNoSearchPatients}
                    onChange={(e) => setPatientTcKimlikNoSearchPatients(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPatients();
                      }
                    }}
                    placeholder="T.C. Kimlik No girin..."
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim Soyisim ile Hasta Ara</label>
                  <input
                    type="text"
                    value={patientNameSearchPatients}
                    onChange={(e) => setPatientNameSearchPatients(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        fetchPatients();
                      }
                    }}
                    placeholder="Hasta adı veya soyadı girin..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchPatients}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ara
                </button>
                {(doctorNameSearchPatients || patientTcKimlikNoSearchPatients || patientNameSearchPatients || selectedDoctorForPatients) && (
                  <button
                    onClick={() => {
                      setDoctorNameSearchPatients("");
                      setPatientTcKimlikNoSearchPatients("");
                      setPatientNameSearchPatients("");
                      setSelectedDoctorForPatients("");
                      fetchPatients();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Hasta Listesi */}
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-3 text-gray-600">Hastalar yükleniyor...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600">Henüz görüşme yapmış hasta bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {patients.map((patient: any) => (
                  <div key={patient.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Sol Taraf - Hasta Bilgileri */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{patient.name}</h3>
                            <p className="text-gray-600">{patient.email}</p>
                            {patient.phone && <p className="text-gray-600">{patient.phone}</p>}
                            {patient.profile?.tcKimlikNo && (
                              <p className="text-sm text-gray-500 mt-1">T.C. Kimlik No: {patient.profile.tcKimlikNo}</p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedPatient(patient)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Detayları Gör
                          </button>
                        </div>

                        {/* Randevu Özeti */}
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Son Randevu</p>
                          <p className="text-gray-900">
                            {new Date(patient.lastAppointmentDate).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Teşhisler Özeti */}
                        {patient.diagnoses.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Teşhisler ({patient.diagnoses.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {patient.diagnoses.slice(0, 3).map((diagnosis: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold"
                                >
                                  {diagnosis.diagnosis}
                                </span>
                              ))}
                              {patient.diagnoses.length > 3 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                                  +{patient.diagnoses.length - 3} daha
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Test Talepleri Özeti */}
                        {patient.testRequests && patient.testRequests.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Test Talepleri ({patient.testRequests.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {patient.testRequests.slice(0, 3).map((test: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold"
                                >
                                  {test.reportType}: {test.title}
                                </span>
                              ))}
                              {patient.testRequests.length > 3 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                                  +{patient.testRequests.length - 3} daha
                                </span>
                              )}
                            </div>
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

        {/* Hasta Detay Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Hasta Detayları</h3>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Hasta Bilgileri */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Kişisel Bilgiler</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Ad Soyad</p>
                      <p className="text-gray-900">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Email</p>
                      <p className="text-gray-900">{selectedPatient.email}</p>
                    </div>
                    {selectedPatient.phone && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Telefon</p>
                        <p className="text-gray-900">{selectedPatient.phone}</p>
                      </div>
                    )}
                    {selectedPatient.profile?.tcKimlikNo && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">T.C. Kimlik No</p>
                        <p className="text-gray-900">{selectedPatient.profile.tcKimlikNo}</p>
                      </div>
                    )}
                    {selectedPatient.profile?.bloodType && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Kan Grubu</p>
                        <p className="text-gray-900">{selectedPatient.profile.bloodType}</p>
                      </div>
                    )}
                    {selectedPatient.profile?.allergies && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold text-gray-700">Alerjik Durumlar</p>
                        <p className="text-gray-900">{selectedPatient.profile.allergies}</p>
                      </div>
                    )}
                    {selectedPatient.profile?.chronicDiseases && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold text-gray-700">Kronik Rahatsızlıklar</p>
                        <p className="text-gray-900">{selectedPatient.profile.chronicDiseases}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Randevular */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Randevular ({selectedPatient.appointments.length})</h4>
                  <div className="space-y-3">
                    {selectedPatient.appointments.map((appointment: any) => (
                      <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(appointment.appointmentDate).toLocaleDateString("tr-TR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              Doktor: {appointment.doctor.name} - {appointment.doctor.specialization}
                            </p>
                            <p className="text-sm text-gray-600">Durum: {appointment.status}</p>
                            {appointment.notes && (
                              <p className="text-sm text-gray-700 mt-2">{appointment.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teşhisler */}
                {selectedPatient.diagnoses.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Teşhisler ({selectedPatient.diagnoses.length})</h4>
                    <div className="space-y-3">
                      {selectedPatient.diagnoses.map((diagnosis: any) => (
                        <div key={diagnosis.id} className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-red-900 text-lg">{diagnosis.diagnosis}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Doktor: {diagnosis.doctor.name} - {diagnosis.doctor.specialization}
                              </p>
                              <p className="text-sm text-gray-600">
                                Tarih: {new Date(diagnosis.date).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                              {diagnosis.medications && (
                                <p className="text-sm text-gray-700 mt-2">
                                  <span className="font-semibold">İlaçlar:</span> {diagnosis.medications}
                                </p>
                              )}
                              {diagnosis.notes && (
                                <p className="text-sm text-gray-700 mt-2">{diagnosis.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Talepleri */}
                {selectedPatient.testRequests && selectedPatient.testRequests.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">Test Talepleri ({selectedPatient.testRequests.length})</h4>
                    <div className="space-y-3">
                      {selectedPatient.testRequests.map((test: any) => (
                        <div key={test.id} className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-blue-900">
                                {test.reportType}: {test.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Doktor: {test.doctor.name} - {test.doctor.doctorProfile.specialization}
                              </p>
                              <p className="text-sm text-gray-600">
                                Tarih: {new Date(test.reportDate).toLocaleDateString("tr-TR", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                              {test.content && (
                                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{test.content}</p>
                              )}
                              {test.fileUrl && (
                                <a
                                  href={test.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Dosyayı İndir
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Yeni Doktor Ekle Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Yeni Doktor Ekle</h3>
              <button
                onClick={() => {
                  setShowAddDoctorModal(false);
                  setNewDoctorForm({
                    name: "",
                    email: "",
                    password: "",
                    phone: "",
                    specialization: "",
                    licenseNumber: "",
                    tcKimlikNo: "",
                    university: "",
                    graduationYear: "",
                    workStatus: "",
                    city: "",
                    experience: "",
                    bio: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim *</label>
                  <input
                    type="text"
                    value={newDoctorForm.name}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newDoctorForm.email}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre *</label>
                  <input
                    type="password"
                    value={newDoctorForm.password}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, password: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={newDoctorForm.phone}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Uzmanlık Alanı *</label>
                  <select
                    value={newDoctorForm.specialization}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, specialization: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {specializationOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lisans Numarası *</label>
                  <input
                    type="text"
                    value={newDoctorForm.licenseNumber}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, licenseNumber: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No</label>
                  <input
                    type="text"
                    value={newDoctorForm.tcKimlikNo}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, tcKimlikNo: e.target.value })}
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Üniversite</label>
                  <input
                    type="text"
                    value={newDoctorForm.university}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, university: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mezuniyet Yılı</label>
                  <input
                    type="number"
                    value={newDoctorForm.graduationYear}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, graduationYear: e.target.value })}
                    min="1950"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Çalışma Durumu</label>
                  <select
                    value={newDoctorForm.workStatus}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, workStatus: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Seçiniz...</option>
                    {workStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şehir</label>
                  <input
                    type="text"
                    value={newDoctorForm.city}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, city: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deneyim (Yıl)</label>
                  <input
                    type="number"
                    value={newDoctorForm.experience}
                    onChange={(e) => setNewDoctorForm({ ...newDoctorForm, experience: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Biyografi</label>
                <textarea
                  value={newDoctorForm.bio}
                  onChange={(e) => setNewDoctorForm({ ...newDoctorForm, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white resize-none"
                />
              </div>

              {/* Doğrulama Belgeleri */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Doğrulama Belgeleri *</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Lütfen kimlik doğrulaması için gerekli belgeleri yükleyiniz. Tüm belgeler zorunludur.
                </p>

                <div className="space-y-4">
                  {/* Tıp Fakültesi Diploması */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tıp Fakültesi Diploması *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocuments({ ...documents, diploma: e.target.files?.[0] || null })}
                        className="hidden"
                        id="diploma-upload"
                        required
                      />
                      <label
                        htmlFor="diploma-upload"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Dosya Seç
                      </label>
                      <span className="text-sm text-gray-600">
                        {documents.diploma ? documents.diploma.name : "Dosya seçilmedi"}
                      </span>
                    </div>
                  </div>

                  {/* TTB Üyelik Belgesi */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TTB Üyelik Belgesi *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocuments({ ...documents, ttbBelgesi: e.target.files?.[0] || null })}
                        className="hidden"
                        id="ttb-upload"
                        required
                      />
                      <label
                        htmlFor="ttb-upload"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Dosya Seç
                      </label>
                      <span className="text-sm text-gray-600">
                        {documents.ttbBelgesi ? documents.ttbBelgesi.name : "Dosya seçilmedi"}
                      </span>
                    </div>
                  </div>

                  {/* Uzmanlık Belgesi */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Uzmanlık Belgesi *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocuments({ ...documents, uzmanlikBelgesi: e.target.files?.[0] || null })}
                        className="hidden"
                        id="uzmanlik-upload"
                        required
                      />
                      <label
                        htmlFor="uzmanlik-upload"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Dosya Seç
                      </label>
                      <span className="text-sm text-gray-600">
                        {documents.uzmanlikBelgesi ? documents.uzmanlikBelgesi.name : "Dosya seçilmedi"}
                      </span>
                    </div>
                  </div>

                  {/* Kimlik Ön Yüz */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nüfus Cüzdanı / T.C. Kimlik Kartı (Ön Yüz) *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocuments({ ...documents, kimlikOn: e.target.files?.[0] || null })}
                        className="hidden"
                        id="kimlik-on-upload"
                        required
                      />
                      <label
                        htmlFor="kimlik-on-upload"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Dosya Seç
                      </label>
                      <span className="text-sm text-gray-600">
                        {documents.kimlikOn ? documents.kimlikOn.name : "Dosya seçilmedi"}
                      </span>
                    </div>
                  </div>

                  {/* Kimlik Arka Yüz */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nüfus Cüzdanı / T.C. Kimlik Kartı (Arka Yüz) *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setDocuments({ ...documents, kimlikArka: e.target.files?.[0] || null })}
                        className="hidden"
                        id="kimlik-arka-upload"
                        required
                      />
                      <label
                        htmlFor="kimlik-arka-upload"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Dosya Seç
                      </label>
                      <span className="text-sm text-gray-600">
                        {documents.kimlikArka ? documents.kimlikArka.name : "Dosya seçilmedi"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddDoctorModal(false);
                    setNewDoctorForm({
                      name: "",
                      email: "",
                      password: "",
                      phone: "",
                      specialization: "",
                      licenseNumber: "",
                      tcKimlikNo: "",
                      university: "",
                      graduationYear: "",
                      workStatus: "",
                      city: "",
                      experience: "",
                      bio: "",
                    });
                    setDocuments({
                      diploma: null,
                      ttbBelgesi: null,
                      uzmanlikBelgesi: null,
                      kimlikOn: null,
                      kimlikArka: null,
                    });
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateDoctor}
                  disabled={
                    creatingDoctor || 
                    !newDoctorForm.name || 
                    !newDoctorForm.email || 
                    !newDoctorForm.password || 
                    !newDoctorForm.specialization || 
                    !newDoctorForm.licenseNumber ||
                    !documents.diploma ||
                    !documents.ttbBelgesi ||
                    !documents.uzmanlikBelgesi ||
                    !documents.kimlikOn ||
                    !documents.kimlikArka
                  }
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingDoctor ? "Oluşturuluyor..." : "Doktor Ekle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doktor Düzenleme Modal */}
      {showEditDoctorModal && editingDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Doktor Bilgilerini Düzenle</h3>
                <button
                  onClick={() => {
                    setShowEditDoctorModal(false);
                    setEditingDoctor(null);
                    setEditingDoctorDocuments([]);
                    setEditDocuments({
                      diploma: null,
                      ttbBelgesi: null,
                      uzmanlikBelgesi: null,
                      kimlikOn: null,
                      kimlikArka: null,
                    });
                    setEditDoctorForm({
                      name: "",
                      email: "",
                      phone: "",
                      specialization: "",
                      licenseNumber: "",
                      tcKimlikNo: "",
                      university: "",
                      graduationYear: "",
                      workStatus: "",
                      city: "",
                      experience: "",
                      bio: "",
                      appointmentPrice: "",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">İsim *</label>
                  <input
                    type="text"
                    value={editDoctorForm.name}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={editDoctorForm.email}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, email: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={editDoctorForm.phone}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Uzmanlık Alanı *</label>
                  <select
                    value={editDoctorForm.specialization}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, specialization: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {specializationOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lisans Numarası *</label>
                  <input
                    type="text"
                    value={editDoctorForm.licenseNumber}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, licenseNumber: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No</label>
                  <input
                    type="text"
                    value={editDoctorForm.tcKimlikNo}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, tcKimlikNo: e.target.value })}
                    maxLength={11}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Üniversite</label>
                  <input
                    type="text"
                    value={editDoctorForm.university}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, university: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mezuniyet Yılı</label>
                  <input
                    type="number"
                    value={editDoctorForm.graduationYear}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, graduationYear: e.target.value })}
                    min="1950"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Çalışma Durumu</label>
                  <select
                    value={editDoctorForm.workStatus}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, workStatus: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="">Seçiniz...</option>
                    {workStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şehir</label>
                  <input
                    type="text"
                    value={editDoctorForm.city}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, city: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deneyim (Yıl)</label>
                <input
                  type="number"
                  value={editDoctorForm.experience}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, experience: e.target.value })}
                  min="0"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Biyografi</label>
                <textarea
                  value={editDoctorForm.bio}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white resize-none"
                />
              </div>

              {/* Belgeler Yönetimi */}
              <div className="border-t pt-6 mt-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Belgeler</h4>
                <div className="space-y-4">
                  {/* Tıp Fakültesi Diploması */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tıp Fakültesi Diploması
                    </label>
                    {editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA") ? (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA")?.fileName}
                            </p>
                          </div>
                          <a
                            href={`/api/admin/doctors/documents/${editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA")?.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0"
                          >
                            Görüntüle
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            const doc = editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA");
                            if (doc) handleDeleteDocumentClick(doc.id, doc.fileName);
                          }}
                          disabled={deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA")?.id}
                          className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "DIPLOMA")?.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, diploma: file }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm"
                    />
                    {editDocuments.diploma && (
                      <button
                        onClick={() => handleUploadDocument("DIPLOMA", editDocuments.diploma!)}
                        disabled={uploadingDocumentType === "DIPLOMA"}
                        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingDocumentType === "DIPLOMA" ? "Yükleniyor..." : "Yükle"}
                      </button>
                    )}
                  </div>

                  {/* TTB Üyelik Belgesi */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TTB Üyelik Belgesi <span className="text-red-500">*</span>
                    </label>
                    {editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI") ? (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI")?.fileName}
                            </p>
                          </div>
                          <a
                            href={`/api/admin/doctors/documents/${editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI")?.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0"
                          >
                            Görüntüle
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            const doc = editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI");
                            if (doc) handleDeleteDocumentClick(doc.id, doc.fileName);
                          }}
                          disabled={deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI")?.id}
                          className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "TTB_BELGESI")?.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, ttbBelgesi: file }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm"
                    />
                    {editDocuments.ttbBelgesi && (
                      <button
                        onClick={() => handleUploadDocument("TTB_BELGESI", editDocuments.ttbBelgesi!)}
                        disabled={uploadingDocumentType === "TTB_BELGESI"}
                        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingDocumentType === "TTB_BELGESI" ? "Yükleniyor..." : "Yükle"}
                      </button>
                    )}
                  </div>

                  {/* Uzmanlık Belgesi */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Uzmanlık Belgesi
                    </label>
                    {editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI") ? (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI")?.fileName}
                            </p>
                          </div>
                          <a
                            href={`/api/admin/doctors/documents/${editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI")?.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0"
                          >
                            Görüntüle
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            const doc = editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI");
                            if (doc) handleDeleteDocumentClick(doc.id, doc.fileName);
                          }}
                          disabled={deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI")?.id}
                          className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "UZMANLIK_BELGESI")?.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, uzmanlikBelgesi: file }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm"
                    />
                    {editDocuments.uzmanlikBelgesi && (
                      <button
                        onClick={() => handleUploadDocument("UZMANLIK_BELGESI", editDocuments.uzmanlikBelgesi!)}
                        disabled={uploadingDocumentType === "UZMANLIK_BELGESI"}
                        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingDocumentType === "UZMANLIK_BELGESI" ? "Yükleniyor..." : "Yükle"}
                      </button>
                    )}
                  </div>

                  {/* Nüfus Cüzdanı / T.C. Kimlik Kartı (Ön Yüz) */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nüfus Cüzdanı / T.C. Kimlik Kartı (Ön Yüz)
                    </label>
                    {editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON") ? (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON")?.fileName}
                            </p>
                          </div>
                          <a
                            href={`/api/admin/doctors/documents/${editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON")?.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0"
                          >
                            Görüntüle
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            const doc = editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON");
                            if (doc) handleDeleteDocumentClick(doc.id, doc.fileName);
                          }}
                          disabled={deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON")?.id}
                          className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ON")?.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, kimlikOn: file }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm"
                    />
                    {editDocuments.kimlikOn && (
                      <button
                        onClick={() => handleUploadDocument("KIMLIK_ON", editDocuments.kimlikOn!)}
                        disabled={uploadingDocumentType === "KIMLIK_ON"}
                        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingDocumentType === "KIMLIK_ON" ? "Yükleniyor..." : "Yükle"}
                      </button>
                    )}
                  </div>

                  {/* Nüfus Cüzdanı / T.C. Kimlik Kartı (Arka Yüz) */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nüfus Cüzdanı / T.C. Kimlik Kartı (Arka Yüz)
                    </label>
                    {editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA") ? (
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA")?.fileName}
                            </p>
                          </div>
                          <a
                            href={`/api/admin/doctors/documents/${editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA")?.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0"
                          >
                            Görüntüle
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            const doc = editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA");
                            if (doc) handleDeleteDocumentClick(doc.id, doc.fileName);
                          }}
                          disabled={deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA")?.id}
                          className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {deletingDocumentId === editingDoctorDocuments.find((doc) => doc.documentType === "KIMLIK_ARKA")?.id ? "Siliniyor..." : "Sil"}
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditDocuments((prev) => ({ ...prev, kimlikArka: file }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white text-sm"
                    />
                    {editDocuments.kimlikArka && (
                      <button
                        onClick={() => handleUploadDocument("KIMLIK_ARKA", editDocuments.kimlikArka!)}
                        disabled={uploadingDocumentType === "KIMLIK_ARKA"}
                        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingDocumentType === "KIMLIK_ARKA" ? "Yükleniyor..." : "Yükle"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditDoctorModal(false);
                    setEditingDoctor(null);
                    setEditingDoctorDocuments([]);
                    setEditDocuments({
                      diploma: null,
                      ttbBelgesi: null,
                      uzmanlikBelgesi: null,
                      kimlikOn: null,
                      kimlikArka: null,
                    });
                    setEditDoctorForm({
                      name: "",
                      email: "",
                      phone: "",
                      specialization: "",
                      licenseNumber: "",
                      tcKimlikNo: "",
                      university: "",
                      graduationYear: "",
                      workStatus: "",
                      city: "",
                      experience: "",
                      bio: "",
                      appointmentPrice: "",
                    });
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={updatingDoctor}
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateDoctor}
                  disabled={
                    updatingDoctor || 
                    !editDoctorForm.name || 
                    !editDoctorForm.email || 
                    !editDoctorForm.specialization || 
                    !editDoctorForm.licenseNumber
                  }
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingDoctor ? "Güncelleniyor..." : "Güncelle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Belge Silme Onay Modal */}
      {showDeleteDocumentModal && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Belgeyi Sil</h3>
                <p className="text-sm text-gray-600 mt-1">Bu işlem geri alınamaz</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">{documentToDelete.fileName}</span> adlı belgeyi silmek istediğinize emin misiniz?
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Uyarı:</strong> Bu belge kalıcı olarak silinecek ve geri getirilemeyecektir.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDocumentModal(false);
                  setDocumentToDelete(null);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteDocumentConfirm}
                disabled={deletingDocumentId === documentToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingDocumentId === documentToDelete.id ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Red Modal */}
      {showRejectModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Doktoru Reddet</h3>
            <p className="text-gray-600 mb-4">
              <span className="font-semibold">{selectedDoctor.name}</span> adlı doktoru reddetmek için lütfen sebep belirtiniz.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900 bg-white resize-none"
              placeholder="Red sebebini yazınız..."
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setSelectedDoctor(null);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processing === selectedDoctor.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === selectedDoctor.id ? "Reddediliyor..." : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doktor Ücret Belirleme Modal */}
      {showSetPriceModal && doctorForPrice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Doktor Ücret Belirleme</h3>
              <button
                onClick={() => {
                  setShowSetPriceModal(false);
                  setDoctorForPrice(null);
                  setAppointmentPrice("");
                  setError("");
                  setLoadingDoctorPrice(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loadingDoctorPrice}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingDoctorPrice ? (
              <div className="mb-6 flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-gray-600">Doktor bilgileri yükleniyor...</span>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  <span className="font-semibold text-gray-900">{doctorForPrice.name}</span> için randevu ücretini belirleyin.
                </p>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Randevu Ücreti (TL) *
                  </label>
                  <input
                    type="number"
                    value={appointmentPrice}
                    onChange={(e) => setAppointmentPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Örn: 500"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Hastalar randevu alırken bu ücreti görecek ve ödeme yapacaklar.
                  </p>
                </div>

                {doctorForPrice.doctorProfile?.appointmentPrice != null && doctorForPrice.doctorProfile.appointmentPrice > 0 ? (
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-blue-900">Doktorun Şu Anki Ücreti:</span>{" "}
                      <span className="font-bold text-blue-700 text-lg">{doctorForPrice.doctorProfile.appointmentPrice} TL</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      <span className="font-semibold">Henüz ücret belirlenmemiş.</span> Lütfen doktor için bir ücret belirleyin.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSetPriceModal(false);
                  setDoctorForPrice(null);
                  setAppointmentPrice("");
                  setError("");
                  setLoadingDoctorPrice(false);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                disabled={updatingPrice || loadingDoctorPrice}
              >
                İptal
              </button>
              <button
                onClick={handleUpdatePrice}
                disabled={updatingPrice || !appointmentPrice || loadingDoctorPrice}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingPrice ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ücreti Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
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

