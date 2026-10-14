import { redirect } from "next/navigation";

export default function StoreOrderSuccessRedirect() {
  redirect("/order-success");
}
