import webpush from "web-push";
import { getConnection } from "@/lib/db";
import { NextResponse } from "next/server";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST() {

  const pool = await getConnection();

  const result = await pool.request()
    .query("SELECT * FROM Push_Subscriptions");

  const payload = JSON.stringify({
    title: "Notifikasi Sampel",
    body: "Ada permintaan sampel baru",
    url: "/loan-notifications" // URL tujuan saat notifikasi diklik
  });

  for (const sub of result.recordset) {

    const subscription = {
      endpoint: sub.Endpoint,
      keys: {
        p256dh: sub.P256DH,
        auth: sub.Auth
      }
    };

    try {
      await webpush.sendNotification(subscription, payload);
    } catch {
      // Ignore stale subscriptions in this utility endpoint.
    }

  }

  return NextResponse.json({ success: true });

}