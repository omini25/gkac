import { redirect } from "next/navigation";

export default function DuesRedirect() {
  redirect("/membership#dues-directory");
}
