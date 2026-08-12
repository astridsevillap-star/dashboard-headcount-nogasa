import { AdminGuard } from "@/components/admin-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
