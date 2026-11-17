import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline.js';

export default function OfflineBanner() {
  const { isOnline } = useOnline();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#D45D79] text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm z-50"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        Mode Offline Aktif — Katalog yang pernah dimuat tetap tampil, namun pemesanan &amp; unggahan
        dinonaktifkan sementara.
      </span>
    </div>
  );
}
