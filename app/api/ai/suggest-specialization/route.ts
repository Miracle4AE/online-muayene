import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// OpenAI client'ı lazy initialize et (build sırasında çalışmasın)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Türkçe uzmanlık alanları listesi (doctors sayfasındaki uzmanlık alanlarıyla eşleşmeli)
const SPECIALIZATIONS = [
  "Acil Tıp",
  "Aile Hekimliği",
  "Çocuk Sağlığı ve Hastalıkları",
  "Dermatoloji",
  "Fizik Tedavi ve Rehabilitasyon",
  "Göğüs Hastalıkları",
  "Göz Hastalıkları",
  "İç Hastalıkları",
  "Kadın Hastalıkları ve Doğum",
  "Kardiyoloji",
  "Kulak Burun Boğaz",
  "Nöroloji",
  "Ortopedi ve Travmatoloji",
  "Psikiyatri",
  "Üroloji",
];

export async function POST(request: NextRequest) {
  try {
    // Authentication kontrolü (opsiyonel - herkes kullanabilir)
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    const body = await request.json();
    const { complaint } = body;

    if (!complaint || typeof complaint !== "string" || complaint.trim().length < 10) {
      return NextResponse.json(
        { error: "Lütfen en az 10 karakterlik bir şikayet yazın" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API anahtarı yapılandırılmamış" },
        { status: 500 }
      );
    }

    // OpenAI client'ı oluştur (sadece runtime'da)
    const openai = getOpenAIClient();

    // AI'ya şikayeti analiz ettir ve uzmanlık öner
    const systemPrompt = `Sen bir tıbbi danışman asistanısın. Hastanın şikayetlerini analiz edip en uygun doktor uzmanlık alanını önermelisin.

Mevcut uzmanlık alanları:
${SPECIALIZATIONS.map((spec, index) => `${index + 1}. ${spec}`).join("\n")}

Görevin:
1. Hastanın şikayetlerini dikkatlice analiz et
2. Şikayetlere göre EN UYGUN uzmanlık alanını belirle (sadece bir tane)
3. Önerdiğin uzmanlık alanı yukarıdaki listeden BİRİ olmalı
4. Kısa ve net bir açıklama yap (2-3 cümle)

ÖNEMLİ: Sadece yukarıdaki listeden bir uzmanlık alanı öner. Başka bir şey önerme.
Cevabını şu formatta ver:
SPECIALIZATION: [Uzmanlık Alanı]
EXPLANATION: [Kısa açıklama]`;

    const userPrompt = `Hastanın şikayeti: "${complaint}"

Bu şikayetlere göre hangi doktor uzmanlık alanına gitmesi gerekiyor?`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // veya "gpt-3.5-turbo" daha ucuz
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Daha tutarlı sonuçlar için
      max_tokens: 200,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";

    // AI yanıtını parse et
    let suggestedSpecialization = "";
    let explanation = "";

    const specializationMatch = aiResponse.match(/SPECIALIZATION:\s*(.+)/i);
    const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+)/i);

    if (specializationMatch) {
      suggestedSpecialization = specializationMatch[1].trim();
    } else {
      // Eğer format uygun değilse, yanıtı analiz et
      for (const spec of SPECIALIZATIONS) {
        if (aiResponse.toLowerCase().includes(spec.toLowerCase())) {
          suggestedSpecialization = spec;
          break;
        }
      }
    }

    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
    } else {
      explanation = aiResponse.split("\n").slice(1).join(" ").trim() || "Şikayetlerinize göre bu uzmanlık alanı önerilmektedir.";
    }

    // Eğer önerilen uzmanlık listede yoksa, varsayılan olarak Genel Pratisyen öner
    if (!SPECIALIZATIONS.includes(suggestedSpecialization)) {
      suggestedSpecialization = "Genel Pratisyen";
      explanation = "Şikayetleriniz için öncelikle bir Genel Pratisyen doktora başvurmanız önerilir.";
    }

    return NextResponse.json({
      success: true,
      specialization: suggestedSpecialization,
      explanation: explanation,
      rawResponse: aiResponse, // Debug için
    });
  } catch (error: any) {
    console.error("AI specialization suggestion error:", error);

    // OpenAI API hatası
    if (error?.status === 401 || error?.message?.includes("API key")) {
      return NextResponse.json(
        { error: "OpenAI API anahtarı geçersiz veya eksik" },
        { status: 500 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "API kullanım limiti aşıldı. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || "Uzmanlık önerisi alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}

