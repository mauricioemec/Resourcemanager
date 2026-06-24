"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Client-side redirect so it works in the static export too (server
// redirect() cannot be prerendered with output: 'export').
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="p-8 text-sm text-muted">
      <Link href="/dashboard" className="text-brand hover:underline">
        → Dashboard
      </Link>
    </div>
  );
}
