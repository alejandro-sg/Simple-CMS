"use client";

import { useState, useRef, useEffect } from "react";

// ContactPage is a client component to handle the form-to-mailto flow.
// To use a real form backend (Resend, Formspree, etc.), replace the
// handleSubmit function with your service's submission logic.

type ContactInfo = {
  title: string;
  description: string;
  addressLabel: string;
  hoursLabel: string;
  eyebrow: string;
  form: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    submitLabel: string;
    successMessage: string;
  };
};

type BrandInfo = { email: string; name: string };

// We use a client component here so we can't fetch server-side.
// Pass content as props from a parent Server Component — see note below.
// For simplicity this page fetches the content via the public API directly.
export default function ContactPage() {
  const [info, setInfo] = useState<{ contact: ContactInfo; brand: BrandInfo } | null>(null);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiUrl}/api/site-content`)
      .then((r) => r.json())
      .then((d) => setInfo({ contact: d.contact, brand: d.brand }))
      .catch(() => {});
  }, []);

  const contact = info?.contact;
  const brand = info?.brand;
  const form = contact?.form;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const phone = data.get("phone") as string;
    const details = data.get("details") as string;

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : "",
      "",
      details,
    ]
      .filter(Boolean)
      .join("\n");

    const mailtoEmail = brand?.email ?? "";
    const subject = `Inquiry from ${name}`;
    window.location.href = `mailto:${mailtoEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
    formRef.current?.reset();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      {contact?.eyebrow && (
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          {contact.eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-bold mb-4">{contact?.title ?? "Contact Us"}</h1>
      {contact?.description && (
        <p className="text-gray-600 mb-10">{contact.description}</p>
      )}

      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact info */}
        <div className="space-y-4 text-sm text-gray-700">
          {contact?.addressLabel && (
            <div>
              <p className="font-medium mb-1">Address</p>
              <p>{contact.addressLabel}</p>
            </div>
          )}
          {contact?.hoursLabel && (
            <div>
              <p className="font-medium mb-1">Hours</p>
              <p>{contact.hoursLabel}</p>
            </div>
          )}
          {brand?.email && (
            <div>
              <p className="font-medium mb-1">Email</p>
              <a href={`mailto:${brand.email}`} className="text-black underline underline-offset-4">
                {brand.email}
              </a>
            </div>
          )}
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {sent && (
            <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
              {form?.successMessage ?? "Thanks! We'll be in touch soon."}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              {form?.nameLabel ?? "Name"}
            </label>
            <input
              name="name"
              required
              placeholder={form?.namePlaceholder ?? "Your name"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {form?.emailLabel ?? "Email"}
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder={form?.emailPlaceholder ?? "you@email.com"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {form?.phoneLabel ?? "Phone (optional)"}
            </label>
            <input
              name="phone"
              type="tel"
              placeholder={form?.phonePlaceholder ?? "(555) 123-4567"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {form?.detailsLabel ?? "Message"}
            </label>
            <textarea
              name="details"
              rows={4}
              placeholder={form?.detailsPlaceholder ?? "Tell us what you need."}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            {form?.submitLabel ?? "Send inquiry"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            This opens your email client.{" "}
            {/* Replace handleSubmit with your email service for direct submission */}
          </p>
        </form>
      </div>
    </div>
  );
}
