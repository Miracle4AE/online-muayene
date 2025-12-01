// Session timeout kontrolü
// NextAuth ile entegre çalışır

export const SESSION_CONFIG = {
  // Session süresi (saniye)
  maxAge: 24 * 60 * 60, // 24 saat
  
  // İnaktivite timeout (saniye)
  inactivityTimeout: 30 * 60, // 30 dakika
  
  // Remember me süresi (saniye)
  rememberMeMaxAge: 30 * 24 * 60 * 60, // 30 gün
};

// Client-side inactivity tracker için
export function setupInactivityTimer(
  timeoutMs: number,
  onTimeout: () => void
): () => void {
  let timer: NodeJS.Timeout;

  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(onTimeout, timeoutMs);
  };

  // Kullanıcı aktivitelerini dinle
  const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
  
  events.forEach((event) => {
    window.addEventListener(event, resetTimer);
  });

  // İlk timer'ı başlat
  resetTimer();

  // Cleanup fonksiyonu
  return () => {
    clearTimeout(timer);
    events.forEach((event) => {
      window.removeEventListener(event, resetTimer);
    });
  };
}

