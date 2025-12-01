"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "details">("search");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "DOCTOR") {
      router.push("/auth/login?role=doctor");
    }
  }, [session, status, router]);

  const searchPatients = async () => {
    if (searchEmail.length < 3) {
      setError("En az 3 karakter giriniz");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/search?email=${encodeURIComponent(searchEmail)}`, {
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
      });

      if (!response.ok) {
        throw new Error("Arama başarısız");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-6 py-3 font-medium transition ${
                activeTab === "search"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Hasta Arama
            </button>
            {selectedPatient && (
              <button
                onClick={() => setActiveTab("details")}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === "details"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Hasta Detayları
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hasta Arama</h2>
            
            {/* Search Form */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Adresi ile Ara
              </label>
              <div className="flex gap-4">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchPatients()}
                  placeholder="hasta@email.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={searchPatients}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? "Aranıyor..." : "Ara"}
                </button>
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

        {/* Patient Details Tab */}
        {activeTab === "details" && selectedPatient && (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hasta Bilgileri</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Kişisel Bilgiler</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Ad Soyad:</span> {selectedPatient.patient.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedPatient.patient.email}</p>
                    <p><span className="font-medium">Telefon:</span> {selectedPatient.patient.phone || "-"}</p>
                    {selectedPatient.patient.patientProfile && (
                      <>
                        <p><span className="font-medium">Cinsiyet:</span> {selectedPatient.patient.patientProfile.gender || "-"}</p>
                        <p><span className="font-medium">Doğum Tarihi:</span> {
                          selectedPatient.patient.patientProfile.dateOfBirth 
                            ? new Date(selectedPatient.patient.patientProfile.dateOfBirth).toLocaleDateString("tr-TR")
                            : "-"
                        }</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Tıbbi Bilgiler</h3>
                  <div className="space-y-2 text-sm">
                    {selectedPatient.patient.patientProfile && (
                      <>
                        <p><span className="font-medium">Kan Grubu:</span> {selectedPatient.patient.patientProfile.bloodType || "-"}</p>
                        <p><span className="font-medium">Alerjiler:</span> {selectedPatient.patient.patientProfile.allergies || "-"}</p>
                        <p><span className="font-medium">Kronik Hastalıklar:</span> {selectedPatient.patient.patientProfile.chronicDiseases || "-"}</p>
                        <p><span className="font-medium">Kullandığı İlaçlar:</span> {selectedPatient.patient.patientProfile.medications || "-"}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

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
      </main>
    </div>
  );
}