# Online Muayene Platformu

Profesyonel online muayene platformu - Doktor ve hasta arasında görüntülü görüşme imkanı sunan, AI destekli, güvenli ve kapsamlı sağlık hizmetleri yönetim sistemi.

## 📋 Proje Hakkında

Online Muayene Platformu, sağlık sektörü için geliştirilmiş kapsamlı bir dijital sağlık hizmetleri yönetim sistemidir. Platform, doktorlar ve hastalar arasında güvenli görüntülü görüşme imkanı sunmakla birlikte, randevu yönetimi, reçete oluşturma, tıbbi rapor analizi, ödeme işlemleri ve çok daha fazlasını içeren entegre bir çözümdür.

### 🌍 Coğrafi Erişim ve Kullanım Senaryosu

Platform, Türkiye genelinde tüm şehirlerden kullanıma açıktır. Bu özellik sayesinde:

- **Şehirler Arası Sağlık Hizmeti:** Hastalar, bulundukları şehirden bağımsız olarak Türkiye'nin her yerindeki doktorlardan online randevu alabilir ve görüşme yapabilir.

- **Rapor ve Belge Paylaşımı:** Hastalar, elindeki mevcut tıbbi raporları, tahlil sonuçları, röntgen görüntüleri ve diğer tıbbi belgeleri platforma yükleyebilir. Bu belgeler, görüşme öncesinde doktora iletilebilir ve doktor görüşme sırasında bu belgeleri inceleyebilir.

- **İkinci Görüş Alma:** Hastalar, farklı bir doktordan görüş almak istediklerinde şehirler arası yolculuk yapmak yerine, mevcut rapor ve belgelerini yükleyerek platform üzerinden istedikleri doktordan online randevu alabilir ve görüşme sağlayabilir.

- **Zaman ve Maliyet Tasarrufu:** Uzun mesafe yolculukları, konaklama masrafları ve iş gücü kaybı gibi maliyetler ortadan kalkar. Hastalar, evlerinden veya iş yerlerinden rahatlıkla uzman doktorlardan görüş alabilir.

- **Hızlı Erişim:** Acil olmayan durumlarda bile, uzman doktorlara hızlıca erişim sağlanır. Özellikle büyük şehirlerdeki uzman doktorlara, küçük şehirlerden veya kırsal bölgelerden kolayca ulaşılabilir.

## 🚀 Özellikler

### Temel Özellikler
- ✅ Doktor ve Hasta için ayrı üyelik sistemi
- ✅ Güvenli kimlik doğrulama (NextAuth.js)
- ✅ İki faktörlü kimlik doğrulama (2FA) - Email/SMS
- ✅ Email doğrulama sistemi
- ✅ Şifre sıfırlama mekanizması
- ✅ Responsive tasarım (PC, Tablet, Telefon)
- ✅ Modern ve kullanıcı dostu arayüz

### Randevu ve Görüşme Sistemi
- ✅ Gelişmiş randevu yönetim sistemi
- ✅ Jitsi Meet entegrasyonu ile görüntülü görüşme
- ✅ Otomatik video kayıt sistemi
- ✅ KVKK uyumlu rıza yönetimi
- ✅ Görüşme süresi takibi

### Tıbbi İşlemler
- ✅ Reçete oluşturma ve yönetimi
- ✅ Tıbbi rapor oluşturma ve onaylama sistemi
- ✅ Hasta belgeleri yönetimi (Tahlil, Röntgen, MR vb.)
- ✅ Tıbbi geçmiş kayıtları
- ✅ AI destekli rapor analizi (OpenAI GPT-4o)
- ✅ AI destekli uzmanlık önerisi
- ✅ Şehirler arası doktor erişimi (Türkiye geneli)
- ✅ Mevcut rapor ve belge yükleme sistemi
- ✅ İkinci görüş alma imkanı (uzaktan konsültasyon)

### Ödeme ve Finans
- ✅ İyzico entegrasyonu ile güvenli ödeme
- ✅ 3D Secure ödeme desteği
- ✅ Ödeme durumu takibi
- ✅ Randevu ücreti yönetimi

### Yönetim ve İletişim
- ✅ Admin paneli (Doktor onaylama, istatistikler)
- ✅ Doktor-hasta mesajlaşma sistemi
- ✅ Favori doktorlar listesi
- ✅ Doktor yorumları ve puanlama sistemi
- ✅ Takip edilen hastalar özelliği

### Güvenlik ve Uyumluluk
- ✅ AES-256 şifreleme (TC Kimlik No, hassas veriler)
- ✅ KVKK uyumlu veri işleme
- ✅ Rate limiting (brute force koruması)
- ✅ Session timeout yönetimi
- ✅ Dosya güvenlik validasyonu
- ✅ Multi-tenant yapı (Hastane bazlı veri izolasyonu)

### Bildirimler
- ✅ Email bildirimleri (Nodemailer)
- ✅ SMS bildirimleri (Netgsm/İleti Merkezi desteği)
- ✅ Randevu hatırlatmaları
- ✅ Görüşme başlatma bildirimleri

## 🛠️ Teknoloji Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript 5.5
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes
- **Authentication:** NextAuth.js 4.24
- **Validation:** Zod 3.23

### Database
- **ORM:** Prisma 5.22
- **Database:** SQLite (Development) / PostgreSQL (Production)
- **Migrations:** Prisma Migrations

### Third-Party Services
- **Video Conferencing:** Jitsi Meet
- **Payment Gateway:** İyzico
- **AI Services:** OpenAI GPT-4o
- **Email:** Nodemailer (SMTP)
- **SMS:** Netgsm / İleti Merkezi (Hazır entegrasyon)

### Security & Utilities
- **Encryption:** AES-256-CBC (Node.js Crypto)
- **Password Hashing:** bcryptjs
- **File Validation:** Custom validation with magic bytes
- **Logging:** Custom logger system
- **Backup:** Automated database backup system

## 📦 Kurulum

### 1. Bağımlılıkları yükleyin

```bash
npm install
```

### 2. Ortam değişkenlerini ayarlayın

`.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/online_muayene?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"

# OpenAI (AI özellikler için)
OPENAI_API_KEY="your-openai-api-key-here"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# SMS (opsiyonel)
# Netgsm için:
# SMS_API_KEY="your-netgsm-usercode"
# SMS_API_SECRET="your-netgsm-password"
# SMS_SENDER="OnlineMuayene"
# 
# İleti Merkezi için:
# SMS_API_KEY="your-iletimerkezi-api-key"
# SMS_SENDER="OnlineMuayene"

# Veri Şifreleme (ÇOK ÖNEMLİ!)
ENCRYPTION_KEY="your-32-character-encryption-key-here-change-this!"

# Ödeme Sistemi (İyzico)
# Sandbox (test) için:
IYZICO_API_KEY="sandbox-api-key"
IYZICO_SECRET_KEY="sandbox-secret-key"
IYZICO_BASE_URL="https://sandbox-api.iyzipay.com"
#
# Production için:
# IYZICO_API_KEY="production-api-key"
# IYZICO_SECRET_KEY="production-secret-key"
# IYZICO_BASE_URL="https://api.iyzipay.com"
```

**UYARI:** `ENCRYPTION_KEY` mutlaka değiştirilmeli ve güvenli tutulmalıdır! Tam 32 karakter olmalıdır.

**Not:** Gmail kullanıyorsanız, "Uygulama Şifres" oluşturmanız gerekir:
1. Google hesabınıza gidin
2. Güvenlik > 2 Adımlı Doğrulama'yı aktifleştirin
3. Uygulama Şifreleri bölümünden yeni şifre oluşturun
4. Bu şifreyi `SMTP_PASS` olarak kullanın

### 3. Veritabanını hazırlayın

```bash
# Prisma client'ı oluştur
npm run db:generate

# Veritabanı şemasını uygula
npm run db:push
```

### 4. Geliştirme sunucusunu başlatın

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

## 📁 Proje Yapısı

```
├── app/
│   ├── api/              # API route'ları
│   ├── auth/             # Authentication sayfaları
│   ├── doctor/           # Doktor dashboard
│   ├── patient/          # Hasta dashboard
│   └── layout.tsx        # Ana layout
├── components/           # React bileşenleri
├── lib/                  # Yardımcı fonksiyonlar
├── prisma/              # Database şeması
└── types/               # TypeScript type tanımları
```

## 🔐 Kullanım

### Doktor Üyeliği
1. Ana sayfadan "Doktor Üyeliği" butonuna tıklayın
2. Gerekli bilgileri doldurun (uzmanlık alanı, lisans numarası vb.)
3. Kayıt olun ve giriş yapın

### Hasta Üyeliği
1. Ana sayfadan "Hasta Üyeliği" butonuna tıklayın
2. Kişisel bilgilerinizi girin
3. Kayıt olun ve giriş yapın

### Örnek Kullanım Senaryosu: Şehirler Arası İkinci Görüş

**Senaryo:** Bursa'da yaşayan bir hasta, İstanbul'daki bir uzman doktordan görüş almak istiyor.

1. **Hasta Girişi:** Hasta, platforma giriş yapar
2. **Doktor Arama:** İstanbul'daki istediği uzmanlık alanındaki doktorları arar
3. **Belge Yükleme:** Mevcut tıbbi raporlarını, tahlil sonuçlarını ve röntgen görüntülerini platforma yükler
4. **Randevu Oluşturma:** İstediği doktordan randevu alır ve ödeme yapar
5. **Görüşme:** Randevu saatinde görüntülü görüşmeye katılır
6. **Doktor İnceleme:** Doktor, yüklenen belgeleri görüşme öncesinde veya sırasında inceler
7. **Sonuç:** Hasta, şehirler arası yolculuk yapmadan uzman doktor görüşü alır

**Avantajlar:**
- ⏱️ Zaman tasarrufu (yolculuk süresi yok)
- 💰 Maliyet tasarrufu (yol, konaklama masrafları yok)
- 🏥 Daha geniş doktor seçeneği (Türkiye geneli)
- 📄 Mevcut belgelerin kolay paylaşımı

## 📊 Proje İstatistikleri

- **Toplam Dosya Sayısı:** 150+ kaynak kod dosyası
- **Kod Satır Sayısı:** 20,000+ satır
- **API Endpoint Sayısı:** 50+ RESTful endpoint
- **Database Model Sayısı:** 15+ Prisma model
- **React Component Sayısı:** 30+ bileşen

## 🏗️ Mimari Özellikler

- **Multi-Tenant Yapı:** Hastane bazlı veri izolasyonu
- **RESTful API:** Standart HTTP metodları ile API tasarımı
- **Type Safety:** Tam TypeScript desteği
- **Error Handling:** Kapsamlı hata yönetimi
- **Code Organization:** Modüler ve ölçeklenebilir kod yapısı
- **Performance:** Optimize edilmiş sorgular ve cache desteği

## 📚 Dokümantasyon

Proje kapsamında detaylı dokümantasyon dosyaları mevcuttur:
- `docs/USER_GUIDE.md` - Kullanıcı kılavuzu
- `docs/ADMIN_GUIDE.md` - Admin paneli kılavuzu
- `docs/DEPLOYMENT.md` - Deployment rehberi
- `docs/SECURITY_ANALYSIS.md` - Güvenlik analizi
- `docs/LEGAL_COMPLIANCE.md` - Yasal uyumluluk
- `docs/TESTING_GUIDE.md` - Test stratejisi
- `docs/MOBILE_OPTIMIZATION.md` - Mobil optimizasyon
- `docs/PROJECT_STATUS.md` - Proje durum raporu

## 📄 Telif Hakkı ve Lisans

**© 2025 Online Muayene Platformu**

Bu yazılımın tüm hakları saklıdır.

Bu proje, özel bir yazılım projesidir ve ticari kullanım için geliştirilmiştir. Kaynak kodun izinsiz kopyalanması, dağıtılması veya kullanılması yasaktır.

Detaylı lisans bilgisi için `LICENSE` dosyasına bakınız.

**Not:** Bu yazılım için telif başvurusu yapılmıştır.

## 👨‍💻 Geliştirme

Bu platform, modern web teknolojileri kullanılarak geliştirilmiştir ve sürekli olarak iyileştirilmektedir.

## 📞 İletişim

Proje hakkında detaylı bilgi için dokümantasyon klasöründeki ilgili dosyalara bakınız.

