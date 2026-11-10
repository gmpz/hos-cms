import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    user
      ? { authenticated: !user.mustChangePassword, user: { displayName: user.displayName, role: user.role, photoUrl: user.photoUrl, profilePhotoFocusX: user.profilePhotoFocusX, profilePhotoFocusY: user.profilePhotoFocusY, profilePhotoZoom: user.profilePhotoZoom } }
      : { authenticated: false, user: null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
