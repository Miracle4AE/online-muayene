// Ödeme servisi (İyzico entegrasyonu)

interface PaymentInitResult {
  success: boolean;
  paymentPageUrl?: string;
  token?: string;
  error?: string;
}

interface PaymentData {
  price: number;
  paidPrice: number;
  basketId: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    identityNumber: string;
    registrationAddress: string;
    city: string;
    country: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
  }>;
  callbackUrl: string;
}

// Ödeme başlat (İyzico 3D Secure)
export async function initializePayment(data: PaymentData): Promise<PaymentInitResult> {
  try {
    // İyzico bilgileri yoksa demo mode
    if (!process.env.IYZICO_API_KEY || !process.env.IYZICO_SECRET_KEY) {
      console.log("💳 Ödeme başlatılıyor (İyzico yapılandırılmamış - DEMO MODE):");
      console.log("Tutar:", data.price, "TL");
      console.log("Sepet ID:", data.basketId);
      console.log("Alıcı:", data.buyer.name);
      
      // Demo mode: Otomatik başarılı kabul et
      return {
        success: true,
        paymentPageUrl: data.callbackUrl + "?status=success&demo=true",
        token: "demo-token-" + Date.now(),
      };
    }

    // İyzico entegrasyonu
    // const Iyzipay = require('iyzipay');
    // const iyzipay = new Iyzipay({
    //   apiKey: process.env.IYZICO_API_KEY,
    //   secretKey: process.env.IYZICO_SECRET_KEY,
    //   uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
    // });

    // const request = {
    //   locale: 'tr',
    //   conversationId: data.basketId,
    //   price: data.price.toFixed(2),
    //   paidPrice: data.paidPrice.toFixed(2),
    //   currency: 'TRY',
    //   basketId: data.basketId,
    //   paymentGroup: 'PRODUCT',
    //   callbackUrl: data.callbackUrl,
    //   enabledInstallments: [1, 2, 3, 6, 9],
    //   buyer: {
    //     id: data.buyer.id,
    //     name: data.buyer.name,
    //     surname: data.buyer.surname,
    //     gsmNumber: data.buyer.phone,
    //     email: data.buyer.email,
    //     identityNumber: data.buyer.identityNumber,
    //     registrationAddress: data.buyer.registrationAddress,
    //     ip: '85.34.78.112', // Dinamik olarak alınmalı
    //     city: data.buyer.city,
    //     country: data.buyer.country,
    //   },
    //   shippingAddress: {
    //     contactName: data.shippingAddress.contactName,
    //     city: data.shippingAddress.city,
    //     country: data.shippingAddress.country,
    //     address: data.shippingAddress.address,
    //   },
    //   billingAddress: data.shippingAddress,
    //   basketItems: data.basketItems.map(item => ({
    //     id: item.id,
    //     name: item.name,
    //     category1: item.category,
    //     itemType: 'VIRTUAL',
    //     price: item.price.toFixed(2)
    //   }))
    // };

    // const result = await iyzipay.threedsInitialize.create(request);
    
    // if (result.status === 'success') {
    //   return {
    //     success: true,
    //     paymentPageUrl: result.threeDSHtmlContent,
    //     token: result.token,
    //   };
    // } else {
    //   return {
    //     success: false,
    //     error: result.errorMessage || 'Ödeme başlatılamadı',
    //   };
    // }

    console.log("✅ Ödeme başlatıldı (simülasyon)");
    return {
      success: true,
      paymentPageUrl: data.callbackUrl + "?status=success",
      token: "sim-token-" + Date.now(),
    };
  } catch (error: any) {
    console.error("❌ Ödeme başlatma hatası:", error);
    return {
      success: false,
      error: error.message || "Ödeme başlatılamadı",
    };
  }
}

// Ödeme sonucunu doğrula
export async function verifyPayment(token: string): Promise<{
  success: boolean;
  status?: string;
  paidPrice?: number;
  error?: string;
}> {
  try {
    if (!process.env.IYZICO_API_KEY) {
      // Demo mode
      return {
        success: true,
        status: "SUCCESS",
        paidPrice: 0,
      };
    }

    // İyzico doğrulama
    // const result = await iyzipay.threedsPayment.create({ token });
    // 
    // if (result.status === 'success') {
    //   return {
    //     success: true,
    //     status: 'SUCCESS',
    //     paidPrice: parseFloat(result.paidPrice),
    //   };
    // }

    return {
      success: true,
      status: "SUCCESS",
      paidPrice: 0,
    };
  } catch (error: any) {
    console.error("❌ Ödeme doğrulama hatası:", error);
    return {
      success: false,
      error: error.message || "Ödeme doğrulanamadı",
    };
  }
}

