import { redirect } from "next/navigation"

export default function AuthenticationRoutePage() {
  redirect("/auth/login")
}