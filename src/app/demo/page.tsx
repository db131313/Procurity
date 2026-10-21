import { redirect } from "next/navigation";

/** Former sales demo — home page is now the live map. */
export default function DemoRedirectPage() {
  redirect("/");
}
