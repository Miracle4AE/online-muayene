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

  const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const meetingStartTimeRef = useRef<Date | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);


  const handleMeetingEnd = useCallback(async () => {
    if (!appointmentId) return;

    try {
      // Görüşme süresini hesapla ve kaydet
      const response = await fetch("/api/doctors/meetings/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId,
          meetingId,
        }),
      });

      if (!response.ok) {
        console.error("Görüşme bitişi kaydedilemedi");
      }
    } catch (error) {
      console.error("Görüşme bitişi hatası:", error);
    }
  }, [appointmentId, meetingId]);

  // Kayıt dosyasını sunucuya yükle
  const uploadRecording = useCallback(async (blob: Blob) => {
    if (!appointmentId) return;

    setUploadingRecording(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", blob, `recording-${appointmentId}-${Date.now()}.webm`);
      formData.append("appointmentId", appointmentId);

      const xhr = new XMLHttpRequest();

      // Upload progress takibi
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Upload tamamlandığında
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          console.log("Kayıt dosyası başarıyla yüklendi");
          setUploadProgress(100);
        } else {
          console.error("Kayıt dosyası yüklenemedi:", xhr.statusText);
          setError("Kayıt dosyası yüklenemedi. Lütfen tekrar deneyin.");
        }
        setUploadingRecording(false);
      });

      // Upload hatası
      xhr.addEventListener("error", () => {
        console.error("Kayıt dosyası yükleme hatası");
        setError("Kayıt dosyası yüklenirken bir hata oluştu.");
        setUploadingRecording(false);
      });

      xhr.open("POST", `/api/admin/video-recordings/upload-recording`);
      xhr.send(formData);
    } catch (error: any) {
      console.error("Kayıt yükleme hatası:", error);
      setError(error.message || "Kayıt dosyası yüklenirken bir hata oluştu.");
      setUploadingRecording(false);
    }
  }, [appointmentId]);

  // Otomatik kayıt başlatma (sadece doktor için)
  const startRecording = useCallback(async () => {
    if (!appointmentId || session?.user?.role !== "DOCTOR") return;

    // getUserMedia ile kayıt başlatma (alternatif yöntem - iç fonksiyon)
    const startRecordingWithUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;

        // MediaRecorder oluştur
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9,opus",
        });

        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Kayıt bittiğinde dosyayı oluştur
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          await uploadRecording(blob);
        };

        // Kayıt başlat
        mediaRecorder.start(1000);
        setIsRecording(true);
        console.log("Otomatik kayıt başlatıldı (getUserMedia)");
      } catch (error: any) {
        console.error("getUserMedia kayıt başlatılamadı:", error);
        setError("Görüşme kaydı başlatılamadı. Lütfen kamera ve mikrofon izinlerini verin.");
      }
    };

    try {
      // Jitsi Meet container'ından video elementlerini bul
      const jitsiContainer = jitsiContainerRef.current;
      if (!jitsiContainer) {
        console.error("Jitsi container bulunamadı");
        await startRecordingWithUserMedia();
        return;
      }

      // Kısa bir gecikme ile video elementlerinin yüklenmesini bekle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Jitsi Meet'in video elementlerini bul
      const videoElements = jitsiContainer.querySelectorAll("video");
      if (videoElements.length === 0) {
        console.error("Video elementleri bulunamadı");
        // Alternatif: getUserMedia ile kendi kameramızı kaydet
        await startRecordingWithUserMedia();
        return;
      }

      // İlk video elementini kullan (genellikle ana video)
      const mainVideo = videoElements[0] as HTMLVideoElement;
      
      // Video elementinden stream yakala (tarayıcı desteği varsa)
      // captureStream deneysel bir özellik, TypeScript'te tanımlı değil
      const videoWithCaptureStream = mainVideo as any;
      if (videoWithCaptureStream.captureStream) {
        const stream = videoWithCaptureStream.captureStream(30); // 30 FPS
        streamRef.current = stream;

        // MediaRecorder oluştur
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9,opus",
        });

        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Kayıt bittiğinde dosyayı oluştur
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          await uploadRecording(blob);
        };

        // Kayıt başlat
        mediaRecorder.start(1000); // Her 1 saniyede bir chunk al
        setIsRecording(true);
        console.log("Otomatik kayıt başlatıldı (video element yakalama)");
      } else {
        // captureStream desteklenmiyorsa, getUserMedia kullan
        console.log("captureStream desteklenmiyor, getUserMedia kullanılıyor");
        await startRecordingWithUserMedia();
      }
    } catch (error: any) {
      console.error("Kayıt başlatılamadı:", error);
      // Hata durumunda getUserMedia ile dene
      await startRecordingWithUserMedia();
    }
  }, [appointmentId, session?.user?.role, uploadRecording]);

  // Kaydı durdur ve yükle
  const stopRecordingAndUpload = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    try {
      // Kaydı durdur
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      // Stream'i durdur
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);
    } catch (error) {
      console.error("Kayıt durdurulamadı:", error);
    }
  }, [isRecording]);

  // Jitsi Meet script'ini yükle
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Script zaten yüklenmiş mi kontrol et
    if (window.JitsiMeetExternalAPI) {
      setIsJitsiLoaded(true);
      return;
    }

    // Script'i dinamik olarak yükle
    const script = document.createElement("script");
    script.src = "https://8x8.vc/external_api.js";
    script.async = true;
    script.onload = () => {
      setIsJitsiLoaded(true);
    };
    script.onerror = () => {
      setError("Jitsi Meet yüklenemedi. Lütfen sayfayı yenileyin.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Jitsi Meet'i başlat
  useEffect(() => {
    if (!isJitsiLoaded || !jitsiContainerRef.current || isJoined || !window.JitsiMeetExternalAPI) return;

    const domain = "meet.jit.si";
    const options = {
      roomName: meetingId,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false,
        disableDeepLinking: true,
        defaultLanguage: "tr",
        // Otomatik kayıt başlat
        recordingService: {
          enabled: true,
          sharingEnabled: true,
        },
        // Jitsi Meet'in kendi kayıt servisi için
        fileRecordingsEnabled: true,
        liveStreamingEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          "microphone",
          "camera",
          "closedcaptions",
          "desktop",
          "fullscreen",
          "fodeviceselection",
          "hangup",
          "profile",
          "chat",
          "recording",
          "livestreaming",
          "settings",
          "raisehand",
          "videoquality",
          "filmstrip",
          "invite",
          "feedback",
          "stats",
          "shortcuts",
          "tileview",
          "videobackgroundblur",
          "download",
          "help",
          "mute-everyone",
          "mute-video-everyone",
        ],
        SETTINGS_SECTIONS: ["devices", "language", "moderator", "profile"],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: "",
        SHOW_POWERED_BY: false,
        DISPLAY_WELCOME_PAGE_CONTENT: false,
        DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
        APP_NAME: "Online Muayene",
        NATIVE_APP_NAME: "Online Muayene",
        PROVIDER_NAME: "Online Muayene",
      },
      userInfo: {
        displayName: session?.user?.name || "Kullanıcı",
        email: session?.user?.email || "",
      },
    };

    // Jitsi Meet API'yi yükle
    if (window.JitsiMeetExternalAPI) {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      // Event listener'lar
      api.addEventListener("videoConferenceJoined", async () => {
        console.log("Görüşmeye katıldı");
        setIsJoined(true);
        meetingStartTimeRef.current = new Date();
        
        // Doktor ise otomatik kayıt başlat
        if (session?.user?.role === "DOCTOR" && appointmentId) {
          await startRecording();
        }
      });

      api.addEventListener("videoConferenceLeft", async () => {
        console.log("Görüşmeden ayrıldı");
        
        // Doktor ise kaydı durdur ve yükle
        if (session?.user?.role === "DOCTOR" && isRecording) {
          await stopRecordingAndUpload();
        }
        
        // Görüşme bitince süreyi kaydet
        handleMeetingEnd();
      });

      api.addEventListener("participantJoined", (participant: any) => {
        console.log("Katılımcı katıldı:", participant);
      });

      api.addEventListener("participantLeft", (participant: any) => {
        console.log("Katılımcı ayrıldı:", participant);
      });

      api.addEventListener("readyToClose", async () => {
        // Doktor ise kaydı durdur ve yükle
        if (session?.user?.role === "DOCTOR" && isRecording) {
          await stopRecordingAndUpload();
        }
        
        // Stream'i temizle
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        api.dispose();
        // Görüşme bitince ana sayfaya yönlendir
        if (session?.user?.role === "DOCTOR") {
          router.push("/doctor/dashboard");
        } else {
          router.push("/patient/dashboard");
        }
      });

      // Kayıt başlatma event'i
      api.addEventListener("recordingStatusChanged", (status: any) => {
        console.log("Kayıt durumu:", status);
        if (status.on && status.mode === "file") {
          console.log("Görüşme kaydı başlatıldı");
        }
        // Kayıt bittiğinde dosya URL'ini al
        if (!status.on && status.mode === "file" && status.recordingLink && appointmentId) {
          console.log("Kayıt dosyası hazır:", status.recordingLink);
          // Kayıt dosyası URL'ini backend'e gönder
          fetch("/api/meetings/save-recording", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              appointmentId,
              recordingFileUrl: status.recordingLink,
            }),
          }).catch((err) => {
            console.error("Kayıt dosyası kaydedilemedi:", err);
          });
        }
      });

      return () => {
        // Kayıt varsa durdur
        if (mediaRecorderRef.current && isRecording) {
          try {
            if (mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
          } catch (error) {
            console.error("Kayıt durdurma hatası:", error);
          }
        }
        
        // Stream'i temizle
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (apiRef.current) {
          apiRef.current.dispose();
        }
      };
    }
  }, [isJitsiLoaded, meetingId, session, isJoined, handleMeetingEnd, router, appointmentId, isRecording, startRecording, stopRecordingAndUpload]);

  return (
    <div className="h-screen w-screen bg-gray-900 relative pb-12">
      <div ref={jitsiContainerRef} className="h-full w-full" />
      
      {/* Kayıt durumu göstergesi (sadece doktor için) */}
      {session?.user?.role === "DOCTOR" && isRecording && (
        <div className="absolute top-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold">Kayıt Yapılıyor</span>
        </div>
      )}

      {/* Upload progress göstergesi */}
      {uploadingRecording && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg min-w-[300px]">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="flex-1">
              <p className="font-semibold mb-1">Kayıt Dosyası Yükleniyor...</p>
              <div className="w-full bg-blue-700 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs mt-1">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        </div>
      )}

      {!isJitsiLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Görüşme yükleniyor...</p>
            <p className="text-gray-400 text-sm mt-2">Lütfen bekleyin</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
          <div className="text-center bg-red-900 bg-opacity-50 rounded-lg p-8 max-w-md mx-4">
            <p className="text-white text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 z-10">
        <div className="flex justify-center items-center px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600">
            © 2025 Online Muayene
          </p>
        </div>
      </footer>
    </div>
  );
}

// Jitsi Meet API tipi
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

