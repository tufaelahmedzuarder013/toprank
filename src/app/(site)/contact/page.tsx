import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getSettings } from "@/server/settings";
import { InfoLayout } from "@/components/info/info-page";
import { ContactForm } from "@/components/info/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Questions about a listing, a payment or partnerships — get in touch.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <InfoLayout
      eyebrow="Contact"
      title="Get in touch"
      active="/contact"
      cta={false}
      intro={
        <>
          Questions about a listing, a payment, a removal request or a partnership? Send us a message — or email{" "}
          <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-1 font-semibold text-foreground underline">
            <Mail className="size-3.5" /> {settings.contactEmail}
          </a>
          .
        </>
      }
    >
      <ContactForm />
    </InfoLayout>
  );
}
