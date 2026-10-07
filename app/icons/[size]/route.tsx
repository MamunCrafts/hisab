import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

const SIZES = { "192": { size: 192, maskable: false }, "512": { size: 512, maskable: false }, "maskable-512": { size: 512, maskable: true } } as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  const config = SIZES[size as keyof typeof SIZES];
  if (!config) return new Response("Not found", { status: 404 });
  return new ImageResponse(<BrandIcon size={config.size} maskable={config.maskable} />, { width: config.size, height: config.size });
}
