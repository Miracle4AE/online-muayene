import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" },
        role: { label: "Rol", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.role) {
          throw new Error("Email, şifre ve rol gereklidir");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            doctorProfile: true,
            patientProfile: true,
          },
        });

        if (!user) {
          throw new Error("Kullanıcı bulunamadı");
        }

        // Rol kontrolü
        const requestedRole = credentials.role.toUpperCase();
        if (user.role !== requestedRole) {
          throw new Error("Bu hesap için yetkiniz yok");
        }

        // Şifre kontrolü
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Şifre hatalı");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email; // Email'i token'a ekle
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string; // Email'i session'a ekle
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

