"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const meetingId = params.id as string;
  const appointmentId = searchParams.get("appointmentId");
  const doctorId = searchParams.get("doctorId");
  const patientId = searchParams.get("patientId");

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const offerSentRef = useRef(false);
  const signalCursorRef = useRef(0);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState("");
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activePanel, setActivePanel] = useState<"chat" | "prescription" | "documents" | "notes">("chat");
  const [meetingEndsAt, setMeetingEndsAt] = useState<Date | null>(null);
  const [meetingAutoEndDisabled, setMeetingAutoEndDisabled] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [timeLeftMinutes, setTimeLeftMinutes] = useState<number | null>(null);
  const [minutesUntilStart, setMinutesUntilStart] = useState<number | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "medium" | "poor" | "unknown">("unknown");
  
  // Chat
  const [chatMessages, setChatMessages] = useState<{sender: string; message: string; time: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  // Prescription
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState("");
  const [prescriptionMedications, setPrescriptionMedications] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  
  // Documents
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // Notes
  const [meetingNotes, setMeetingNotes] = useState("");
  
  // Participant info
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState<Date | null>(null);

  const isDoctor = session?.user?.role === "DOCTOR";
  const canJoinNow = !appointmentDateTime
    ? true
    : appointmentDateTime.getTime() - Date.now() <= 15 * 60 * 1000;

  // WebRTC configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Fetch participant info
  useEffect(() => {
    const fetchParticipantInfo = async () => {
      if (!appointmentId) return;
      
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          headers: {
            "x-user-id": session?.user?.id || "",
            "x-user-role": session?.user?.role || "",
          },
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          setPatientInfo(data.patient);
          setDoctorInfo(data.doctor);
          if (data.appointment?.appointmentDate) {
            setAppointmentDateTime(new Date(data.appointment.appointmentDate));
          }
        }
      } catch (err) {
        console.error("Error fetching participant info:", err);
      }
    };

    if (session?.user?.id) {
      fetchParticipantInfo();
    }
  }, [appointmentId, session]);

  const fetchMeetingStatus = useCallback(async () => {
    if (!appointmentId) return;

    try {
      const response = await fetch(`/api/meetings/status?appointmentId=${appointmentId}`, {
        credentials: "include",
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data.meetingEndedAt) {
        router.push(isDoctor ? "/doctor/dashboard" : "/patient/dashboard");
        return;
      }

      setMeetingAutoEndDisabled(!!data.meetingAutoEndDisabled);
      setMeetingEndsAt(data.meetingEndsAt ? new Date(data.meetingEndsAt) : null);
    } catch (err) {
      console.error("Meeting status error:", err);
    }
  }, [appointmentId, isDoctor, router]);

  useEffect(() => {
    if (!appointmentId) return;
    fetchMeetingStatus();
    const interval = setInterval(fetchMeetingStatus, 10000);
    return () => clearInterval(interval);
  }, [appointmentId, fetchMeetingStatus]);

  useEffect(() => {
    if (!appointmentDateTime) return;
    const interval = setInterval(() => {
      const diffMs = appointmentDateTime.getTime() - Date.now();
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));
      setMinutesUntilStart(diffMinutes);
    }, 1000);

    return () => clearInterval(interval);
  }, [appointmentDateTime]);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection) {
      setConnectionQuality("unknown");
      return;
    }

    const updateQuality = () => {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      if (effectiveType === "4g" || downlink >= 5) {
        setConnectionQuality("good");
      } else if (effectiveType === "3g" || downlink >= 1.5) {
        setConnectionQuality("medium");
      } else {
        setConnectionQuality("poor");
      }
    };

    updateQuality();
    connection.addEventListener("change", updateQuality);
    return () => connection.removeEventListener("change", updateQuality);
  }, []);


  // Upload recording to server
  const uploadRecording = useCallback(
    async (blob: Blob) => {
      if (!appointmentId) return;

      try {
        const formData = new FormData();
        formData.append("file", blob, `recording-${appointmentId}-${Date.now()}.webm`);
        formData.append("appointmentId", appointmentId);
        formData.append("doctorId", doctorId || "");
        formData.append("patientId", patientId || "");

        const response = await fetch("/api/admin/video-recordings/upload-recording", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          console.log("Kayıt başarıyla yüklendi");
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    },
    [appointmentId, doctorId, patientId]
  );

  const sendSignal = useCallback(
    async (type: "offer" | "answer" | "ice", payload: any) => {
      if (!appointmentId) return;
      try {
        await fetch("/api/meetings/signaling/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            appointmentId,
            type,
            payload,
          }),
        });
      } catch (err) {
        console.error("Signaling send error:", err);
      }
    },
    [appointmentId]
  );

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice", event.candidate);
      }
    };
    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && remoteVideoRef.current) {
        remoteStreamRef.current = stream;
        remoteVideoRef.current.srcObject = stream;
        setIsConnected(true);
      }
    };
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      setIsConnected(state === "connected");
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [sendSignal]);

  const flushPendingCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !peerConnection.remoteDescription) return;
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE candidate add error:", err);
      }
    }
  }, []);

  const handleSignal = useCallback(
    async (signal: { type: string; payload: any }) => {
      const peerConnection = ensurePeerConnection();
      if (signal.type === "offer") {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload)
        );
        await flushPendingCandidates();
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await sendSignal("answer", answer);
        return;
      }
      if (signal.type === "answer") {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload)
        );
        await flushPendingCandidates();
        return;
      }
      if (signal.type === "ice") {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(signal.payload);
        } else {
          pendingCandidatesRef.current.push(signal.payload);
        }
      }
    },
    [ensurePeerConnection, flushPendingCandidates, sendSignal]
  );

  useEffect(() => {
    if (!appointmentId || !session?.user?.id) return;

    let active = true;
    const pollSignals = async () => {
      if (!active) return;
      try {
        const response = await fetch(
          `/api/meetings/signaling/poll?appointmentId=${appointmentId}&after=${signalCursorRef.current}`,
          { credentials: "include" }
        );
        if (!response.ok) return;
        const data = await response.json();
        const signals = data.signals || [];
        for (const signal of signals) {
          await handleSignal(signal);
          const createdAt = new Date(signal.createdAt).getTime();
          if (createdAt > signalCursorRef.current) {
            signalCursorRef.current = createdAt;
          }
        }
      } catch (err) {
        console.error("Signaling poll error:", err);
      }
    };

    pollSignals();
    const interval = setInterval(pollSignals, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [appointmentId, session, handleSignal]);

  // Start recording
  const startRecording = useCallback(
    (stream: MediaStream) => {
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          await uploadRecording(blob);
        };

        mediaRecorder.start(1000); // Her 1 saniyede bir chunk al
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Recording start error:", err);
      }
    },
    [uploadRecording]
  );

  // Initialize local media
  useEffect(() => {
    if (!canJoinNow) {
      return;
    }

    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peerConnection = ensurePeerConnection();
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

        if (isDoctor && !offerSentRef.current) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          await sendSignal("offer", offer);
          offerSentRef.current = true;
        }

        // Otomatik kayıt başlat
        startRecording(stream);
      } catch (err: any) {
        setError("Kamera veya mikrofon erişimi reddedildi. Lütfen izin verin.");
        console.error("Media error:", err);
      }
    };

    initializeMedia();

    const peerConnection = peerConnectionRef.current;

    return () => {
      const localStream = localStreamRef.current;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [startRecording, canJoinNow, ensurePeerConnection, isDoctor, sendSignal]);

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    const newMessage = {
      sender: session?.user?.name || "Kullanıcı",
      message: chatInput,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
  };

  // Save prescription
  const savePrescription = async () => {
    if (!appointmentId || !prescriptionDiagnosis || !prescriptionMedications) {
      alert("Lütfen teşhis ve ilaçları doldurun");
      return;
    }

    try {
      const response = await fetch("/api/doctors/prescriptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: JSON.stringify({
          appointmentId,
          patientId,
          prescriptionNumber: prescriptionNumber || null,
          diagnosis: prescriptionDiagnosis,
          medications: prescriptionMedications,
          notes: prescriptionNotes,
        }),
      });

      if (response.ok) {
        alert("Reçete başarıyla kaydedildi");
        setPrescriptionDiagnosis("");
        setPrescriptionMedications("");
        setPrescriptionNotes("");
        setPrescriptionNumber("");
      }
    } catch (err) {
      console.error("Prescription error:", err);
    }
  };

  // Upload document
  const uploadDocument = async (file: File) => {
    if (!appointmentId) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("documentType", "Görüşme Belgesi");

      const response = await fetch(`/api/appointments/${appointmentId}/upload-report`, {
        method: "POST",
        headers: {
          "x-user-id": session?.user?.id || "",
          "x-user-role": session?.user?.role || "",
        },
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        alert("Belge başarıyla yüklendi");
        // Reload documents
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleExtendMeeting = async () => {
    if (!appointmentId) return;
    try {
      const response = await fetch("/api/meetings/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appointmentId }),
      });
      if (!response.ok) {
        throw new Error("Görüşme uzatılamadı");
      }
      setMeetingAutoEndDisabled(true);
      setShowExtendModal(false);
      setTimeLeftMinutes(null);
    } catch (err) {
      console.error("Extend meeting error:", err);
    }
  };

  // End meeting
  const endMeeting = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Kaydet ve çık (doktor için)
    if (isDoctor) {
      try {
        await fetch("/api/doctors/meetings/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, meetingId }),
        });
      } catch (err) {
        console.error("End meeting error:", err);
      }
    }

    router.push(isDoctor ? "/doctor/dashboard" : "/patient/dashboard");
  }, [appointmentId, meetingId, isDoctor, router]);

  useEffect(() => {
    if (!meetingEndsAt || meetingAutoEndDisabled) {
      setTimeLeftMinutes(null);
      setShowExtendModal(false);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diffMs = meetingEndsAt.getTime() - now.getTime();
      const diffMinutes = Math.ceil(diffMs / (1000 * 60));
      setTimeLeftMinutes(diffMinutes);

      if (diffMs <= 60 * 1000 && diffMs > 0 && isDoctor) {
        setShowExtendModal(true);
      }

      if (diffMs <= 0) {
        if (isDoctor) {
          endMeeting();
        } else {
          router.push("/patient/dashboard");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [meetingEndsAt, meetingAutoEndDisabled, isDoctor, endMeeting, router]);

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">Kayıt Ediliyor</span>
              </div>
            )}
          </div>
          <div className="h-6 w-px bg-gray-600"></div>
          <div>
            <h1 className="text-lg font-semibold">Online Muayene</h1>
            <p className="text-sm text-gray-400">
              {isDoctor ? `Hasta: ${patientInfo?.name || "Yükleniyor..."}` : `Doktor: ${doctorInfo?.name || "Yükleniyor..."}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              connectionQuality === "good"
                ? "bg-green-100 text-green-800"
                : connectionQuality === "medium"
                ? "bg-yellow-100 text-yellow-800"
                : connectionQuality === "poor"
                ? "bg-red-100 text-red-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Bağlantı:{" "}
            {connectionQuality === "good"
              ? "İyi"
              : connectionQuality === "medium"
              ? "Orta"
              : connectionQuality === "poor"
              ? "Zayıf"
              : "Bilinmiyor"}
          </div>
          {/* Mikrofon */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${isMuted ? "bg-red-600" : "bg-gray-700"} hover:bg-opacity-80 transition`}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoOff ? "bg-red-600" : "bg-gray-700"} hover:bg-opacity-80 transition`}
          >
            {isVideoOff ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Panel Toggle */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="p-3 rounded-full bg-gray-700 hover:bg-opacity-80 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* End Call */}
          <button
            onClick={endMeeting}
            className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 transition font-semibold"
          >
            Görüşmeyi Bitir
          </button>
        </div>
      </div>

      {!meetingAutoEndDisabled && timeLeftMinutes !== null && (
        <div className="bg-yellow-500 text-gray-900 px-6 py-2 text-sm font-medium text-center">
          Görüşme süresi bitmek üzere. Kalan süre: {Math.max(timeLeftMinutes, 0)} dk
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={`flex-1 bg-black relative ${showSidePanel ? "" : "w-full"}`}>
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Video (Picture in Picture) */}
          <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Siz
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                <p className="text-lg font-medium">Bağlantı kuruluyor...</p>
              </div>
            </div>
          )}

          {!canJoinNow && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-center text-white px-6">
                <p className="text-lg font-semibold mb-2">Randevu saatiniz henüz gelmedi</p>
                <p className="text-sm">
                  Görüşmeye 15 dakika kala katılabilirsiniz.
                  {minutesUntilStart !== null && (
                    <span className="block mt-2 font-medium">
                      Kalan süre: {Math.max(minutesUntilStart, 0)} dakika
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
              {error}
            </div>
          )}
        </div>

        {/* Side Panel */}
        {showSidePanel && (
          <div className="w-96 bg-white flex flex-col border-l border-gray-200">
            {/* Panel Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActivePanel("chat")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${activePanel === "chat" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Sohbet
                </div>
              </button>
              {isDoctor && (
                <button
                  onClick={() => setActivePanel("prescription")}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activePanel === "prescription" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Reçete
                  </div>
                </button>
              )}
              <button
                onClick={() => setActivePanel("documents")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${activePanel === "documents" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Belgeler
                </div>
              </button>
              <button
                onClick={() => setActivePanel("notes")}
                className={`flex-1 px-4 py-3 text-sm font-medium ${activePanel === "notes" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notlar
                </div>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Chat Panel */}
              {activePanel === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === session?.user?.name ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.sender === session?.user?.name ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                          <p className="text-xs font-medium mb-1">{msg.sender}</p>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                        placeholder="Mesaj yazın..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={sendChatMessage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Gönder
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Prescription Panel */}
              {activePanel === "prescription" && isDoctor && (
                <div className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Reçete Yaz</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reçete Numarası</label>
                    <input
                      type="text"
                      value={prescriptionNumber}
                      onChange={(e) => setPrescriptionNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: RX-2025-0001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teşhis *</label>
                    <textarea
                      value={prescriptionDiagnosis}
                      onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Teşhis..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İlaçlar *</label>
                    <textarea
                      value={prescriptionMedications}
                      onChange={(e) => setPrescriptionMedications(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="İlaç listesi..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                    <textarea
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ek notlar..."
                    />
                  </div>
                  <button
                    onClick={savePrescription}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Reçeteyi Kaydet
                  </button>
                </div>
              )}

              {/* Documents Panel */}
              {activePanel === "documents" && (
                <div className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Belgeler</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="doc-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadDocument(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="doc-upload" className="cursor-pointer">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">Belge Yükle</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</p>
                    </label>
                  </div>
                  {uploadingDoc && <p className="text-sm text-blue-600">Yükleniyor...</p>}
                </div>
              )}

              {/* Notes Panel */}
              {activePanel === "notes" && (
                <div className="p-4 space-y-4 h-full flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900">Görüşme Notları</h3>
                  <textarea
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Görüşme sırasında notlarınızı buraya yazın..."
                  />
                  <button
                    onClick={() => {
                      // Notları kaydet
                      console.log("Notes saved:", meetingNotes);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Notları Kaydet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showExtendModal && isDoctor && !meetingAutoEndDisabled && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Görüşme süresi doldu</h3>
            <p className="text-sm text-gray-600 mb-6">
              Görüşmeye devam etmek ister misiniz? Devam ederseniz otomatik bitiş devre dışı kalır.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExtendMeeting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
              >
                Devam Et
              </button>
              <button
                onClick={endMeeting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Görüşmeyi Bitir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
