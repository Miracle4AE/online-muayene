# Deployment Kılavuzu

## 🚀 Online Muayene - Yayına Alma

### Production Ortamı Gereksinimleri

#### Sunucu
- **CPU:** 2+ cores
- **RAM:** 4GB+ (8GB önerilir)
- **Disk:** 50GB+ SSD
- **OS:** Ubuntu 22.04 LTS / Windows Server

#### Database
- **PostgreSQL:** 14+ (SQLite production için uygun DEĞİL!)
- **Backup:** Günlük otomatik
- **Yedek sunucu:** Önerilir

#### Servisler
- **Email:** SMTP servisi (Gmail Business, SendGrid, AWS SES)
- **SMS:** Netgsm veya İleti Merkezi
- **Ödeme:** İyzico production hesabı
- **Siber Güvenlik:** NETSYS Bilişim anlaşması

---

## 📝 Deployment Adımları

### 1. Sunucu Hazırlığı

```bash
# Node.js kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu (process manager)
npm install -g pm2
```

### 2. Database Kurulumu

```bash
# PostgreSQL kurulumu
sudo apt install postgresql postgresql-contrib

# Database oluştur
sudo -u postgres createdb online_muayene
```

### 3. Proje Kurulumu

```bash
# Projeyi klonla
git clone <repository-url>
cd online-muayene

# Bağımlılıkları yükle
npm install

# Production build
npm run build
```

### 4. Environment Variables

`.env` dosyası oluştur:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/online_muayene?schema=public"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="production-secret-min-32-chars"

# OpenAI
OPENAI_API_KEY="production-key"

# Email (Production)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="app-password"

# SMS (Production)
SMS_API_KEY="production-key"
SMS_SENDER="YourHospital"

# Encryption
ENCRYPTION_KEY="32-char-production-key!!!!!!!!"

# Payment (Production)
IYZICO_API_KEY="production-api-key"
IYZICO_SECRET_KEY="production-secret"
IYZICO_BASE_URL="https://api.iyzipay.com"

# Admin
ADMIN_EMAILS="admin@hospital1.com,admin@hospital2.com"
ADMIN_PASSWORDS="secure-password-1,secure-password-2"
ADMIN_CITIES="Bursa,İstanbul"
ADMIN_HOSPITALS="Özel Acıbadem Bursa Hastanesi,Özel Memorial İstanbul"
```

### 5. Database Migration

```bash
# Prisma migrate
npx prisma migrate deploy

# Hastaneleri oluştur
npm run create-hospitals
```

### 6. PM2 ile Başlatma

```bash
# Production'da çalıştır
pm2 start npm --name "online-muayene" -- start

# Auto-restart aktifleştir
pm2 startup
pm2 save
```

### 7. Nginx Reverse Proxy (önerilir)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8. SSL Sertifikası (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 Güvenlik Kontrol Listesi

- [ ] Tüm environment variables production değerleriyle değiştirildi
- [ ] SSL sertifikası yüklendi (HTTPS)
- [ ] Firewall yapılandırıldı
- [ ] Database şifrelendi
- [ ] Otomatik backup aktif
- [ ] NETSYS güvenlik taraması yapıldı
- [ ] Rate limiting aktif
- [ ] Log monitoring aktif

---

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Database Backup
```bash
# Manuel backup
npm run backup

# Cron job (her gün 03:00)
0 3 * * * cd /path/to/app && npm run backup
```

---

## 🆘 Sorun Giderme

### Uygulama çalışmıyor
```bash
pm2 restart online-muayene
pm2 logs online-muayene --err
```

### Database bağlantı hatası
```bash
# PostgreSQL durumunu kontrol et
sudo systemctl status postgresql

# Restart
sudo systemctl restart postgresql
```

---

© 2025 Monexa Bilişim ve Yazılım Sistemleri
Güvenlik: NETSYS Bilişim - Teknoloji Hizmetleri

