import { z } from "zod";

export const doctorRegisterSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  phone: z.string().optional(),
  specialization: z.string().min(2, "Uzmanlık alanı gereklidir"),
  licenseNumber: z.string().min(5, "Lisans numarası gereklidir"),
  tcKimlikNo: z.string()
    .min(11, "T.C. Kimlik Numarası 11 haneli olmalıdır")
    .max(11, "T.C. Kimlik Numarası 11 haneli olmalıdır")
    .regex(/^\d+$/, "T.C. Kimlik Numarası sadece rakamlardan oluşmalıdır"),
  bio: z.string().optional(),
  experience: z.number().int().positive("Deneyim pozitif bir sayı olmalıdır").optional(),
  hospital: z.string().optional(),
  university: z.string().optional(),
  graduationYear: z.number().int().min(1950, "Mezuniyet yılı 1950'den küçük olamaz").max(new Date().getFullYear(), "Mezuniyet yılı gelecek yıldan büyük olamaz").optional(),
  workStatus: z.string().optional(),
  city: z.string().optional(),
});

export const patientRegisterSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  phone: z.string().optional(),
  tcKimlikNo: z.string()
    .min(11, "T.C. Kimlik Numarası 11 haneli olmalıdır")
    .max(11, "T.C. Kimlik Numarası 11 haneli olmalıdır")
    .regex(/^\d+$/, "T.C. Kimlik Numarası sadece rakamlardan oluşmalıdır"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  allergies: z.string().optional(),
  chronicDiseases: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(1, "Şifre gereklidir"),
  role: z.enum(["doctor", "patient"]),
});

export const doctorProfileUpdateSchema = z.object({
  specialization: z.union([
    z.string().min(2, "Uzmanlık alanı en az 2 karakter olmalıdır"),
    z.literal(""),
  ]).optional(),
  bio: z.union([z.string(), z.literal("")]).optional(),
  experience: z.union([
    z.number().int().positive("Deneyim pozitif bir sayı olmalıdır"),
    z.string().transform((val) => {
      if (!val || val.trim() === "") return undefined;
      const num = parseInt(val, 10);
      if (isNaN(num) || num <= 0) return undefined;
      return num;
    }),
  ]).optional(),
  photoUrl: z.union([z.string(), z.literal("")]).optional(),
  hospital: z.union([z.string(), z.literal("")]).optional(),
});

export const doctorReviewSchema = z.object({
  rating: z.number().int().min(1, "Puan en az 1 olmalıdır").max(5, "Puan en fazla 5 olabilir"),
  comment: z.string().min(10, "Yorum en az 10 karakter olmalıdır").max(500, "Yorum en fazla 500 karakter olabilir"),
});

export const patientProfileUpdateSchema = z.object({
  phone: z.union([z.string(), z.literal("")]).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.union([z.string(), z.literal("")]).optional(),
  emergencyContact: z.union([z.string(), z.literal("")]).optional(),
  emergencyPhone: z.union([z.string(), z.literal("")]).optional(),
  bloodType: z.union([z.string(), z.literal("")]).optional(),
  allergies: z.union([z.string(), z.literal("")]).optional(),
  chronicDiseases: z.union([z.string(), z.literal("")]).optional(),
  medications: z.union([z.string(), z.literal("")]).optional(),
  shareDataWithSameHospital: z.boolean().optional(),
  shareDataWithOtherHospitals: z.boolean().optional(),
});

export type DoctorRegisterInput = z.infer<typeof doctorRegisterSchema>;
export type PatientRegisterInput = z.infer<typeof patientRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DoctorProfileUpdateInput = z.infer<typeof doctorProfileUpdateSchema>;
export type DoctorReviewInput = z.infer<typeof doctorReviewSchema>;
export type PatientProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>;

