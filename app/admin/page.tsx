"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Admin cookie kontrolü
    const adminToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("admin_token="));

    if (adminToken) {
      // Admin girişi yapılmış, admin paneline yönlendir
      router.push("/admin/doctors");
    } else {
      // Admin girişi yapılmamış, login sayfasına yönlendir
      router.push("/admin/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}

