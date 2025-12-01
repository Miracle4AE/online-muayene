# Online Muayene - Admin Kılavuzu

## 🔐 Admin Paneli Kullanım Kılavuzu

### Giriş Yapma

1. `/admin/login` adresine gidin
2. Admin email ve şifrenizi girin
3. Şehir seçin
4. Hastane seçin
5. "Giriş Yap" butonuna tıklayın

**Not:** Sadece yetkili admin email'leri giriş yapabilir.

---

## 📊 Panel Bölümleri

### 1. Doktorlar
- **Onay Bekleyenler:** Yeni kayıt olan doktorları onaylayın
- **Onaylananlar:** Aktif doktorları görüntüleyin
- **Reddedilenler:** Reddedilen doktor başvurularını görüntüleyin

**Doktor Onaylama:**
1. Doktor belge

lerini inceleyin
2. "Onayla" veya "Reddet" butonuna tıklayın
3. Red durumunda sebep yazın

### 2. Reçeteler
- Tüm reçeteleri görüntüleyin
- Doktor/hasta bazında filtreleyin
- Reçete detaylarını inceleyin

### 3. Raporlar
- Tıbbi raporları görüntüleyin
- AI oluşturulmuş raporları kontrol edin
- Onaylayın veya reddedin

### 4. Görüntülü Görüşmeler
- Tüm görüşme kayıtlarını görüntüleyin
- Kayıtları indirin
- Rıza belgelerini kontrol edin

### 5. Hastalar
- Hastaları görüntüleyin
- Hasta detaylarına bakın
- Tıbbi geçmişlerini inceleyin

### 6. Bütçe
- Gelir/gider takibi
- Randevu bazlı kazanç raporları
- Doktor bazlı istatistikler

### 7. Mesajlaşma Kayıtları
- Hasta-doktor mesajlaşmalarını görüntüleyin
- Uygunsuz mesajları engelleyin
- İstatistikleri inceleyin

### 8. Doktor Yönetimi
- Onaylı doktorları yönetin
- Randevu fiyatlarını belirleyin
- Doktor bilgilerini güncelleyin

---

## 🔧 Sistem Yönetimi

### Database Backup

Manuel backup:
```bash
npm run backup
```

Otomatik backup her gün saat 03:00'de çalışır.

### Hastane Yönetimi

Her admin sadece kendi hastanesinin verilerini görebilir (Multi-tenant yapı).

---

## 📞 Destek

Teknik sorunlar için: teknik@monexa.com.tr
Güvenlik için: guvenlik@netsys.com.tr

---

© 2025 Monexa Bilişim ve Yazılım Sistemleri
Güvenlik: NETSYS Bilişim - Teknoloji Hizmetleri

