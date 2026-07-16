import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/src/i18n/config";
import { getDictionary } from "@/src/i18n/get-dictionary";

/** SSR 公开首页（SEO 生命线）。3D 星系门户保留在根路径 /。 */
export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  return (
    <main>
      <h1>China Clara</h1>
      <p>{dict.tagline}</p>
      <ul>
        <li><Link href={`/${locale}/articles`}>{dict.nav.understand}</Link></li>
        <li><Link href={`/${locale}/suppliers`}>{dict.nav.suppliers}</Link></li>
      </ul>
    </main>
  );
}
