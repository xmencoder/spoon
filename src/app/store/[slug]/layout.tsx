export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <>{children}</>;
}
