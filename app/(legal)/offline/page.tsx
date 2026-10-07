import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <WifiOff className="mb-4 size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-lg font-semibold">আপনি অফলাইনে আছেন · You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        হিসাব দেখতে ও লিখতে ইন্টারনেট সংযোগ প্রয়োজন। · Hisab needs an internet connection to load and save your records.
      </p>
    </div>
  );
}
