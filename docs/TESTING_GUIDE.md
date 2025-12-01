# Test Kılavuzu

## 🧪 Online Muayene - Test Stratejisi

### Test Türleri

#### 1. Manuel Testler (Şu An)
- ✅ Kullanıcı kaydı
- ✅ Giriş/çıkış
- ✅ Randevu oluşturma
- ✅ Görüntülü görüşme
- ✅ Reçete/rapor oluşturma
- ✅ Admin paneli

#### 2. Otomatik Testler (Gelecek)

**Unit Tests (önerilir):**
```bash
# Jest kurulumu
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest

# Test komutu
npm run test
```

**Integration Tests (önerilir):**
```bash
# Playwright kurulumu
npm install --save-dev @playwright/test

# E2E test komutu
npm run test:e2e
```

### Test Senaryoları

#### Hasta Flow
1. Kayıt ol
2. Email doğrula
3. Giriş yap
4. Doktor ara
5. Randevu al
6. Ödeme yap
7. Görüşmeye katıl
8. Rapor/reçete görüntüle

#### Doktor Flow
1. Kayıt ol
2. Belge yükle
3. Admin onayı bekle
4. Giriş yap
5. Randevuları görüntüle
6. Görüşme başlat
7. Reçete/rapor oluştur

#### Admin Flow
1. Giriş yap
2. Doktor onayla
3. İstatistikleri görüntüle
4. Reçete/rapor kontrol et
5. Görüşme kayıtlarını incele

### Test Data

**Test Komutları:**
```bash
# Hastane oluştur
npm run create-hospitals

# Test doktor oluştur
npm run create-test-doctor

# Test hasta ve randevu oluştur
npm run create-test-patient

# Test rapor oluştur
npm run create-test-report
```

---

## 📊 Test Coverage Hedefi

- **Unit Tests:** %70+ (önerilir)
- **Integration Tests:** Kritik flow'lar
- **E2E Tests:** Ana kullanıcı senaryoları

---

© 2025 Monexa Bilişim ve Yazılım Sistemleri

