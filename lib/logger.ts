import { prisma } from "@/lib/prisma";

export type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type LogCategory =
  | "AUTH"
  | "APPOINTMENT"
  | "PAYMENT"
  | "EMAIL"
  | "SMS"
  | "ADMIN"
  | "SYSTEM"
  | "DATABASE"
  | "API";

interface LogData {
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  hospitalId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Log kaydet
export async function log(data: LogData) {
  try {
    // Console'a yazdır
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${data.level}] [${data.category}] ${data.message}`;
    
    if (data.level === "ERROR" || data.level === "CRITICAL") {
      console.error(logMessage, data.metadata || "");
    } else if (data.level === "WARNING") {
      console.warn(logMessage, data.metadata || "");
    } else {
      console.log(logMessage, data.metadata || "");
    }

    // Database'e kaydet (opsiyonel - SystemLog modeli gerekli)
    // await prisma.systemLog.create({
    //   data: {
    //     level: data.level,
    //     category: data.category,
    //     message: data.message,
    //     userId: data.userId,
    //     hospitalId: data.hospitalId,
    //     metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    //     ipAddress: data.ipAddress,
    //     userAgent: data.userAgent,
    //   },
    // });
  } catch (error) {
    // Loglama hatası sistemin çalışmasını engellememeli
    console.error("Logger error:", error);
  }
}

// Kısayol fonksiyonlar
export const logger = {
  info: (category: LogCategory, message: string, metadata?: any) =>
    log({ level: "INFO", category, message, metadata }),

  warning: (category: LogCategory, message: string, metadata?: any) =>
    log({ level: "WARNING", category, message, metadata }),

  error: (category: LogCategory, message: string, metadata?: any) =>
    log({ level: "ERROR", category, message, metadata }),

  critical: (category: LogCategory, message: string, metadata?: any) =>
    log({ level: "CRITICAL", category, message, metadata }),

  // Auth logları
  auth: {
    login: (userId: string, success: boolean, ip?: string) =>
      log({
        level: success ? "INFO" : "WARNING",
        category: "AUTH",
        message: `User ${success ? "logged in" : "login failed"}`,
        userId,
        ipAddress: ip,
      }),

    logout: (userId: string) =>
      log({
        level: "INFO",
        category: "AUTH",
        message: "User logged out",
        userId,
      }),

    register: (userId: string, role: string) =>
      log({
        level: "INFO",
        category: "AUTH",
        message: `New user registered (${role})`,
        userId,
      }),
  },

  // Randevu logları
  appointment: {
    created: (appointmentId: string, doctorId: string, patientId: string) =>
      log({
        level: "INFO",
        category: "APPOINTMENT",
        message: "Appointment created",
        metadata: { appointmentId, doctorId, patientId },
      }),

    cancelled: (appointmentId: string, reason?: string) =>
      log({
        level: "INFO",
        category: "APPOINTMENT",
        message: "Appointment cancelled",
        metadata: { appointmentId, reason },
      }),

    completed: (appointmentId: string) =>
      log({
        level: "INFO",
        category: "APPOINTMENT",
        message: "Appointment completed",
        metadata: { appointmentId },
      }),
  },

  // Ödeme logları
  payment: {
    initiated: (appointmentId: string, amount: number) =>
      log({
        level: "INFO",
        category: "PAYMENT",
        message: "Payment initiated",
        metadata: { appointmentId, amount },
      }),

    success: (appointmentId: string, amount: number, transactionId?: string) =>
      log({
        level: "INFO",
        category: "PAYMENT",
        message: "Payment successful",
        metadata: { appointmentId, amount, transactionId },
      }),

    failed: (appointmentId: string, reason: string) =>
      log({
        level: "ERROR",
        category: "PAYMENT",
        message: "Payment failed",
        metadata: { appointmentId, reason },
      }),
  },

  // Email logları
  email: {
    sent: (to: string, subject: string) =>
      log({
        level: "INFO",
        category: "EMAIL",
        message: "Email sent",
        metadata: { to, subject },
      }),

    failed: (to: string, error: string) =>
      log({
        level: "ERROR",
        category: "EMAIL",
        message: "Email send failed",
        metadata: { to, error },
      }),
  },

  // SMS logları
  sms: {
    sent: (to: string, message: string) =>
      log({
        level: "INFO",
        category: "SMS",
        message: "SMS sent",
        metadata: { to, messageLength: message.length },
      }),

    failed: (to: string, error: string) =>
      log({
        level: "ERROR",
        category: "SMS",
        message: "SMS send failed",
        metadata: { to, error },
      }),
  },

  // Admin logları
  admin: {
    action: (adminEmail: string, action: string, target?: string) =>
      log({
        level: "INFO",
        category: "ADMIN",
        message: `Admin action: ${action}`,
        metadata: { adminEmail, target },
      }),
  },

  // Database logları
  database: {
    error: (operation: string, error: string) =>
      log({
        level: "ERROR",
        category: "DATABASE",
        message: `Database error: ${operation}`,
        metadata: { error },
      }),
  },

  // API logları
  api: {
    request: (method: string, path: string, userId?: string) =>
      log({
        level: "INFO",
        category: "API",
        message: `${method} ${path}`,
        userId,
      }),

    error: (method: string, path: string, error: string) =>
      log({
        level: "ERROR",
        category: "API",
        message: `API error: ${method} ${path}`,
        metadata: { error },
      }),
  },
};

