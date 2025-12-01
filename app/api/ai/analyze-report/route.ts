import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, appointmentId, doctorId, patientId, fileUrl, documentType, title } = body;

    if (!documentId || !appointmentId || !doctorId || !patientId || !fileUrl) {
      return NextResponse.json(
        { error: "Eksik parametreler" },
        { status: 400 }
      );
    }

    // OpenAI API key kontrolü
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable bulunamadı");
      return NextResponse.json(
        { error: "AI servisi yapılandırılmamış" },
        { status: 500 }
      );
    }

    // OpenAI client'ı oluştur (sadece runtime'da)
    const openai = getOpenAIClient();

    // Dosyayı oku
    const filePath = join(process.cwd(), "public", fileUrl.replace("/documents/", ""));
    let fileContent: string;
    let fileType: string;

    try {
      const fileBuffer = await readFile(filePath);
      const fileExtension = fileUrl.split(".").pop()?.toLowerCase();

      if (fileExtension === "pdf") {
        // PDF'den text çıkar
        try {
          const pdfParseModule = await import("pdf-parse");
          // pdf-parse modülü farklı versiyonlarda farklı export yapısına sahip olabilir
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const pdfData = await pdfParse(fileBuffer);
          fileContent = pdfData.text;
          fileType = "pdf";
          
          // PDF'den text çıkarılamazsa (görüntü tabanlı PDF), görüntü olarak işle
          if (!fileContent || fileContent.trim().length < 50) {
            console.log("PDF'den yeterli text çıkarılamadı, görüntü olarak işlenecek");
            // PDF'i görüntüye dönüştürmek için ek kütüphane gerekir
            // Şimdilik text olarak devam edelim
            fileContent = pdfData.text || "PDF içeriği çıkarılamadı. Görüntü tabanlı PDF olabilir.";
          }
        } catch (pdfError: any) {
          console.error("PDF parse hatası:", pdfError);
          // PDF parse başarısız olursa, görüntü olarak işlemeyi dene
          fileContent = "PDF analiz edilemedi. Görüntü tabanlı PDF olabilir.";
          fileType = "pdf-error";
        }
      } else if (["jpg", "jpeg", "png"].includes(fileExtension || "")) {
        // Görüntü için base64 encoding
        const base64Image = fileBuffer.toString("base64");
        fileContent = base64Image;
        fileType = "image";
      } else {
        return NextResponse.json(
          { error: "Desteklenmeyen dosya formatı" },
          { status: 400 }
        );
      }
    } catch (fileError) {
      console.error("Dosya okuma hatası:", fileError);
      return NextResponse.json(
        { error: "Dosya okunamadı" },
        { status: 500 }
      );
    }

    // Hasta bilgilerini al
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
      },
    });

    // AI prompt'u oluştur
    const prompt = `Sen bir tıbbi rapor analiz uzmanısın. Aşağıdaki tıbbi raporu analiz et ve detaylı bir rapor içeriği oluştur.

Rapor Bilgileri:
- Rapor Tipi: ${documentType}
- Başlık: ${title}
${patient?.patientProfile ? `- Hasta: ${patient.name}, Yaş: ${patient.patientProfile.dateOfBirth ? new Date().getFullYear() - new Date(patient.patientProfile.dateOfBirth).getFullYear() : "Bilinmiyor"}` : ""}

Lütfen raporu analiz ederek şunları içeren bir rapor içeriği oluştur:
1. Raporun genel özeti
2. Bulgular ve sonuçlar
3. Normal değerlerle karşılaştırma (varsa)
4. Önemli notlar veya uyarılar
5. Sonuç ve öneriler

Rapor içeriğini Türkçe, profesyonel ve anlaşılır bir şekilde yaz.`;

    let aiContent: string;

    try {
      if (fileType === "image") {
        // Görüntü analizi için vision API kullan
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // veya "gpt-4-vision-preview"
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/${fileUrl.split(".").pop()};base64,${fileContent}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        });

        aiContent = response.choices[0]?.message?.content || "Rapor analiz edilemedi.";
      } else if (fileType === "pdf") {
        // PDF text analizi için chat completion kullan
        const pdfPrompt = `${prompt}

PDF İçeriği:
${fileContent}

Yukarıdaki PDF içeriğini analiz ederek detaylı bir rapor oluştur.`;
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Sen bir tıbbi rapor analiz uzmanısın. Türkçe, profesyonel ve detaylı rapor analizleri yaparsın. PDF içeriğindeki tıbbi verileri analiz ederek kapsamlı bir rapor oluşturursun.",
            },
            {
              role: "user",
              content: pdfPrompt,
            },
          ],
          max_tokens: 2000,
        });

        aiContent = response.choices[0]?.message?.content || "Rapor analiz edilemedi.";
      } else {
        // Diğer durumlar için normal chat completion
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Sen bir tıbbi rapor analiz uzmanısın. Türkçe, profesyonel ve detaylı rapor analizleri yaparsın.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
        });

        aiContent = response.choices[0]?.message?.content || "Rapor analiz edilemedi.";
      }
    } catch (aiError: any) {
      console.error("OpenAI API hatası:", aiError);
      // AI hatası olsa bile basit bir içerik oluştur
      aiContent = `Rapor Tipi: ${documentType}\nBaşlık: ${title}\n\nRapor yüklendi ancak otomatik analiz yapılamadı. Doktor tarafından manuel olarak incelenecektir.`;
    }

    // MedicalReport oluştur
    const medicalReport = await prisma.medicalReport.create({
      data: {
        appointmentId: appointmentId,
        doctorId: doctorId,
        patientId: patientId,
        patientDocumentId: documentId,
        reportType: documentType,
        title: title || `${documentType} Raporu`,
        content: aiContent,
        fileUrl: fileUrl,
        aiGenerated: true,
        approvalStatus: "PENDING",
        reportDate: new Date(),
      },
    });

    // PatientDocument'ı güncelle
    await prisma.patientDocument.update({
      where: { id: documentId },
      data: {
        aiAnalyzed: true,
        medicalReportId: medicalReport.id,
      },
    });

    return NextResponse.json({
      success: true,
      report: medicalReport,
      message: "Rapor başarıyla analiz edildi",
    });
  } catch (error: any) {
    console.error("Error analyzing report:", error);
    return NextResponse.json(
      { error: "Rapor analiz edilirken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

