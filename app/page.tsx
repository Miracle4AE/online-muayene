import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 relative pb-12 flex items-center justify-center">
      <div className="px-4 py-8 w-full">
        <div className="max-w-4xl w-full mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-primary-900 mb-4">
            Online Muayene
          </h1>
          <p className="text-xl text-primary-700">
            Sağlık hizmetlerinize kolayca erişin
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Doktor Girişi */}
          <Link
            href="/auth/login?role=doctor"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-primary-200 hover:border-primary-500"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-200 transition-colors">
                <svg
                  className="w-10 h-10 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary-900 mb-3">
                Doktor Girişi
              </h2>
              <p className="text-primary-600 mb-4">
                Randevularınızı yönetin ve hastalarınızla görüşün
              </p>
              <span className="text-primary-500 font-semibold group-hover:text-primary-700">
                Giriş Yap →
              </span>
            </div>
          </Link>

          {/* Hasta Girişi */}
          <Link
            href="/auth/login?role=patient"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-primary-200 hover:border-primary-500"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-200 transition-colors">
                <svg
                  className="w-10 h-10 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary-900 mb-3">
                Hasta Girişi
              </h2>
              <p className="text-primary-600 mb-4">
                Randevu alın ve doktorunuzla görüşün
              </p>
              <span className="text-primary-500 font-semibold group-hover:text-primary-700">
                Giriş Yap →
              </span>
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-primary-600 mb-4">Hesabınız yok mu?</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/register?role=doctor"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Doktor Üyeliği
            </Link>
            <Link
              href="/auth/register?role=patient"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Hasta Üyeliği
            </Link>
          </div>
        </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3">
        <div className="flex justify-center items-center px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600">
            © 2025 Online Muayene
          </p>
        </div>
      </footer>
    </div>
  );
}

