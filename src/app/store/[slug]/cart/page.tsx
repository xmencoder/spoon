import { redirect } from "next/navigation";

export default function StoreCartRedirect() {
  redirect("/cart");
}
