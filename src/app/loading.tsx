'use client';

import Image from 'next/image';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-spin-slow"></div>
          <div className="absolute inset-2 rounded-full border-4 border-white/20 animate-spin-slower"></div>
          <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-full p-6 shadow-2xl">
            <Image
              src="/rsllogo.png"
              alt="RSL Express"
              width={120}
              height={120}
              className="drop-shadow-lg"
              priority
            />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold tracking-wide uppercase text-white/80">Loading</p>
          <p className="text-xs text-white/60">Getting things ready...</p>
        </div>
      </div>

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 2.8s linear infinite;
        }
        .animate-spin-slower {
          animation: spin 4.2s linear infinite reverse;
        }
      `}</style>
    </div>
  );
}

