"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { SiteContent } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { Toast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
const TABS = [
  { key: "brand",   label: "Brand & Business",  desc: "Business name, contact info, address, hours, and social links." },
  { key: "home",    label: "Home Page",          desc: "Hero headline, categories, how it works, testimonials, and the waitlist section." },
  { key: "shop",    label: "Shop Page",          desc: "Shop title, description, and SMS/email reservation settings." },
  { key: "decor",   label: "Decoration Page",    desc: "The text and item list shown on the Decoration collection page." },
  { key: "about",   label: "About Page",         desc: "Your story, values, and owner section." },
  { key: "contact", label: "Contact Page",       desc: "Contact intro, service areas list, and all form labels." },
  { key: "nav",     label: "Navigation",         desc: "The link labels shown in the site navigation menu." },
] as const;

type TabKey = typeof TABS[number]["key"];

// ---------------------------------------------------------------------------
// Inline field helpers (no shared components needed — keep it self-contained)
// ---------------------------------------------------------------------------
function Field({
  label,
  hint,
  value,
  onChange,
  type = "text",
  multiline = false,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const cls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function StringList({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="mt-1 text-sm text-gray-500 hover:text-gray-800"
        >
          ＋ Add item
        </button>
      </div>
    </div>
  );
}

type FieldDef<T> = { key: keyof T; label: string; multiline?: boolean; hint?: string };

function ObjectList<T extends Record<string, string>>({
  label,
  hint,
  items,
  fields,
  emptyItem,
  onChange,
}: {
  label: string;
  hint?: string;
  items: T[];
  fields: FieldDef<T>[];
  emptyItem: T;
  onChange: (items: T[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-2 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Item {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-sm text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <Field
                  key={String(f.key)}
                  label={f.label}
                  hint={f.hint}
                  value={item[f.key] as string}
                  multiline={f.multiline}
                  rows={3}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...item, [f.key]: v };
                    onChange(next);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { ...emptyItem }])}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ＋ Add {label.toLowerCase()}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
    </div>
  );
}

function SiteImageUploader({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${apiUrl}/api/admin/upload/site`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const { publicUrl } = await res.json();
      onChange(publicUrl);
    } catch (e) {
      alert("Upload failed: " + String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
      <div className="mt-2 flex items-start gap-4">
        {value && (
          <img
            src={value}
            alt=""
            className="h-20 w-32 rounded-md border border-gray-200 object-cover"
          />
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="block w-72 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-500 focus:border-gray-500 focus:outline-none"
            placeholder="Or paste image URL"
          />
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab section components
// ---------------------------------------------------------------------------

function BrandTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const b = content.brand;
  const l = content.location;
  const set = (patch: Partial<SiteContent["brand"]>) =>
    onChange({ ...content, brand: { ...b, ...patch } });
  const setL = (patch: Partial<SiteContent["location"]>) =>
    onChange({ ...content, location: { ...l, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="Brand" />

      <Field
        label="Business name"
        hint="Appears in the browser tab, Google search results, and footer."
        value={b.name}
        onChange={(v) => set({ name: v })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Logo line 1"
          hint="First line of the logo text in the nav."
          value={b.navLines[0]}
          onChange={(v) => set({ navLines: [v, b.navLines[1]] })}
        />
        <Field
          label="Logo line 2"
          hint="Second line of the logo text in the nav."
          value={b.navLines[1]}
          onChange={(v) => set({ navLines: [b.navLines[0], v] })}
        />
      </div>
      <Field
        label="Footer tagline"
        hint="Short description shown under the logo in the footer."
        value={b.tagline}
        multiline
        rows={2}
        onChange={(v) => set({ tagline: v })}
      />
      <Field
        label="Logo image alt text"
        hint="Screen-reader description of the logo image."
        value={b.logoAlt}
        onChange={(v) => set({ logoAlt: v })}
      />
      <SiteImageUploader
        label="Logo image"
        hint="Shown in the navigation bar. Use a PNG with transparent background."
        value={b.logoUrl}
        onChange={(v) => set({ logoUrl: v })}
      />

      <hr className="border-gray-100" />
      <SectionTitle title="Contact Info" />

      <Field
        label="Display email"
        hint="Shown in the footer, contact page, and search engine results."
        value={b.email}
        type="email"
        onChange={(v) => set({ email: v })}
      />
      <Field
        label="Phone number"
        hint="Used for calls-to-action and shown in search engine structured data."
        value={l.phone}
        type="tel"
        onChange={(v) => setL({ phone: v })}
      />

      <hr className="border-gray-100" />
      <SectionTitle title="Location" />

      <Field
        label="Address"
        hint="Full address shown in the footer and contact page."
        value={l.address}
        onChange={(v) => setL({ address: v })}
      />
      <Field
        label="Google Maps link"
        hint="URL for the 'Get directions' link."
        value={l.mapLink}
        type="url"
        onChange={(v) => setL({ mapLink: v })}
      />
      <Field
        label="Hours"
        hint="Displayed in the footer and contact page."
        value={l.hours}
        onChange={(v) => setL({ hours: v })}
      />
      <Field
        label="Visit label"
        hint="Heading above the address in the footer (e.g. 'Visit us')."
        value={l.visitLabel}
        onChange={(v) => setL({ visitLabel: v })}
      />

      <hr className="border-gray-100" />
      <SectionTitle title="Social Links" />

      <Field
        label="Facebook URL"
        type="url"
        hint="Link to your Facebook page. Leave blank to hide the icon."
        value={b.facebookLink}
        onChange={(v) => set({ facebookLink: v })}
      />
      <Field
        label="Instagram URL (footer)"
        type="url"
        hint="Instagram link shown in the footer."
        value={b.instagramLink}
        onChange={(v) => set({ instagramLink: v })}
      />
    </div>
  );
}

function HomeTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const h = content.home;
  const set = (patch: Partial<SiteContent["home"]>) =>
    onChange({ ...content, home: { ...h, ...patch } });

  return (
    <div className="space-y-2">
      <SectionTitle title="Home Page" />

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Hero section
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <Field label="Eyebrow" hint="Small text above the headline." value={h.eyebrow} onChange={(v) => set({ eyebrow: v })} />
          <Field label="Headline" hint="Main hero heading." value={h.headline} multiline rows={2} onChange={(v) => set({ headline: v })} />
          <Field label="Service area line" hint="Short line below the headline." value={h.serviceAreaLine} onChange={(v) => set({ serviceAreaLine: v })} />
          <Field label="Description" hint="Paragraph below the service area line." value={h.description} multiline rows={3} onChange={(v) => set({ description: v })} />
          <Field label="Trust line" hint="Short line showing trust signals (e.g. 'In-store pickup • Local delivery')." value={h.trustLine} onChange={(v) => set({ trustLine: v })} />
          <Field label="Primary CTA button" value={h.ctaPrimary} onChange={(v) => set({ ctaPrimary: v })} />
          <Field label="Secondary CTA button" value={h.ctaSecondary} onChange={(v) => set({ ctaSecondary: v })} />
          <Field label="Instagram CTA text" hint="Text above the Instagram follow link." value={h.instagramCta} onChange={(v) => set({ instagramCta: v })} />
          <Field label="Instagram URL (hero)" type="url" hint="Instagram link shown in the hero section." value={h.instagramLink} onChange={(v) => set({ instagramLink: v })} />
          <SiteImageUploader
            label="Hero background image"
            hint="Full-screen background image on the home page. Tall portrait or landscape photos work best."
            value={h.heroImage}
            onChange={(v) => set({ heroImage: v })}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Section headings
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <Field label="New arrivals section title" value={h.newArrivalsTitle} onChange={(v) => set({ newArrivalsTitle: v })} />
          <Field label="Featured finds section title" value={h.featuredTitle} onChange={(v) => set({ featuredTitle: v })} />
          <Field label="Shop by category title" value={h.categoriesTitle} onChange={(v) => set({ categoriesTitle: v })} />
          <Field label="Curation section title" value={h.curationTitle} onChange={(v) => set({ curationTitle: v })} />
          <Field label="Curation section detail" value={h.curationDetail} multiline rows={2} onChange={(v) => set({ curationDetail: v })} />
          <Field label="Store info line" hint="Short line with opening hours and services." value={h.storeInfo} onChange={(v) => set({ storeInfo: v })} />
          <Field label="Empty arrivals message" hint="Shown when no new arrivals are available." value={h.emptyArrivals} onChange={(v) => set({ emptyArrivals: v })} />
          <Field label="Local SEO paragraph" hint="Hidden text for search engines. Include location keywords." value={h.localIntent} multiline rows={2} onChange={(v) => set({ localIntent: v })} />
          <Field label="Visit CTA link text" hint="Anchor text for the 'visit our store' link." value={h.visitCta} onChange={(v) => set({ visitCta: v })} />
          <SiteImageUploader
            label="Curation section image"
            hint="Photo shown beside the 'Curated with care' section on the home page."
            value={h.storyImage}
            onChange={(v) => set({ storyImage: v })}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Categories (3 items)
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <ObjectList
            label="category"
            items={h.categories}
            fields={[
              { key: "title", label: "Category name" },
              { key: "detail", label: "Short description" },
            ]}
            emptyItem={{ title: "", detail: "" }}
            onChange={(v) => set({ categories: v })}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          How it works (3 steps)
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <Field label="Section title" value={h.howItWorksTitle} onChange={(v) => set({ howItWorksTitle: v })} />
          <ObjectList
            label="step"
            items={h.howItWorks}
            fields={[
              { key: "title", label: "Step title" },
              { key: "detail", label: "Step detail", multiline: true },
            ]}
            emptyItem={{ title: "", detail: "" }}
            onChange={(v) => set({ howItWorks: v })}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Testimonials
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <Field label="Section title" value={h.testimonialsTitle} onChange={(v) => set({ testimonialsTitle: v })} />
          <ObjectList
            label="testimonial"
            items={h.testimonials}
            fields={[
              { key: "name", label: "Customer name" },
              { key: "location", label: "Location" },
              { key: "quote", label: "Quote", multiline: true },
            ]}
            emptyItem={{ name: "", location: "", quote: "" }}
            onChange={(v) => set({ testimonials: v })}
          />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Waitlist section
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-2">
          <Field label="Title" value={h.waitlistTitle} onChange={(v) => set({ waitlistTitle: v })} />
          <Field label="Description" value={h.waitlistDescription} multiline rows={2} onChange={(v) => set({ waitlistDescription: v })} />
          <Field label="Email placeholder text" value={h.waitlistPlaceholder} onChange={(v) => set({ waitlistPlaceholder: v })} />
          <Field label="Button label" value={h.waitlistButton} onChange={(v) => set({ waitlistButton: v })} />
        </div>
      </details>
    </div>
  );
}

function ShopTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const s = content.shop;
  const set = (patch: Partial<SiteContent["shop"]>) =>
    onChange({ ...content, shop: { ...s, ...patch } });
  const setF = (patch: Partial<SiteContent["shop"]["filters"]>) =>
    set({ filters: { ...s.filters, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="Shop Page" />
      <Field label="Page title" value={s.title} onChange={(v) => set({ title: v })} />
      <Field label="Page description" value={s.description} multiline rows={3} onChange={(v) => set({ description: v })} />
      <Field label="Search placeholder" value={s.searchPlaceholder} onChange={(v) => set({ searchPlaceholder: v })} />
      <Field label="Empty inventory message" hint="Shown when no items match the search or filters." value={s.emptyMessage} onChange={(v) => set({ emptyMessage: v })} />

      <hr className="border-gray-100" />
      <SectionTitle title="Filter labels" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category filter label" value={s.filters.categoryLabel} onChange={(v) => setF({ categoryLabel: v })} />
        <Field label="Type filter label" value={s.filters.typeLabel} onChange={(v) => setF({ typeLabel: v })} />
        <Field label="Apply button label" value={s.filters.applyLabel} onChange={(v) => setF({ applyLabel: v })} />
        <Field label="Clear button label" value={s.filters.clearLabel} onChange={(v) => setF({ clearLabel: v })} />
      </div>

      <hr className="border-gray-100" />
      <SectionTitle title="Reservation" />
      <Field label="Reserve / inquiry button" value={s.reserveCta} onChange={(v) => set({ reserveCta: v })} />
      <Field label="SMS reserve button" value={s.smsCta} onChange={(v) => set({ smsCta: v })} />
      <Field label="Email reserve button" value={s.emailCta} onChange={(v) => set({ emailCta: v })} />
      <Field label="'Inquire about similar' button" value={s.similarCta} onChange={(v) => set({ similarCta: v })} />
      <Field
        label="SMS phone number"
        type="tel"
        hint="Customers will be texted to this number when they click 'Reserve by text'."
        value={s.smsNumber}
        onChange={(v) => set({ smsNumber: v })}
      />
      <Field
        label="SMS message template"
        hint="Use {item} and {price} as placeholders for the item name and price."
        value={s.smsTemplate}
        onChange={(v) => set({ smsTemplate: v })}
      />
    </div>
  );
}

function DecorTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const d = content.decor;
  const set = (patch: Partial<SiteContent["decor"]>) =>
    onChange({ ...content, decor: { ...d, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="Decoration Page" />
      <Field label="Eyebrow" hint="Small text above the title." value={d.eyebrow} onChange={(v) => set({ eyebrow: v })} />
      <Field label="Title" value={d.title} onChange={(v) => set({ title: v })} />
      <Field label="Description" value={d.description} multiline rows={3} onChange={(v) => set({ description: v })} />
      <StringList
        label="Item descriptions"
        hint="Each line describes a type of decor item shown on the page."
        items={d.items}
        onChange={(v) => set({ items: v })}
      />
    </div>
  );
}

function AboutTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const a = content.about;
  const set = (patch: Partial<SiteContent["about"]>) =>
    onChange({ ...content, about: { ...a, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="About Page" />
      <Field label="Page title" value={a.title} onChange={(v) => set({ title: v })} />
      <Field label="Intro paragraph" value={a.intro} multiline rows={3} onChange={(v) => set({ intro: v })} />
      <Field label="Story paragraph" value={a.story} multiline rows={4} onChange={(v) => set({ story: v })} />
      <Field label="Values section title" value={a.valuesTitle} onChange={(v) => set({ valuesTitle: v })} />
      <StringList
        label="Values list"
        hint="Each value appears as a bullet point."
        items={a.values}
        onChange={(v) => set({ values: v })}
      />
      <hr className="border-gray-100" />
      <SectionTitle title="Owners section" />
      <Field label="Section title" value={a.ownersTitle} onChange={(v) => set({ ownersTitle: v })} />
      <Field label="Description" value={a.ownersDescription} multiline rows={3} onChange={(v) => set({ ownersDescription: v })} />
      <Field label="Photo alt text" hint="Screen-reader description of the owners photo." value={a.ownersImageAlt} onChange={(v) => set({ ownersImageAlt: v })} />
      <SiteImageUploader
        label="Storefront photo"
        hint="Photo of the store exterior or interior, shown on the About page."
        value={a.storefrontImage}
        onChange={(v) => set({ storefrontImage: v })}
      />
      <SiteImageUploader
        label="Owners photo"
        hint="Photo of the owners, shown on the About page."
        value={a.ownersImage}
        onChange={(v) => set({ ownersImage: v })}
      />
    </div>
  );
}

function ContactTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const c = content.contact;
  const set = (patch: Partial<SiteContent["contact"]>) =>
    onChange({ ...content, contact: { ...c, ...patch } });
  const setF = (patch: Partial<SiteContent["contact"]["form"]>) =>
    set({ form: { ...c.form, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="Contact Page" />
      <Field label="Eyebrow" hint="Small text above the title." value={c.eyebrow} onChange={(v) => set({ eyebrow: v })} />
      <Field label="Title" value={c.title} onChange={(v) => set({ title: v })} />
      <Field label="Description" value={c.description} multiline rows={3} onChange={(v) => set({ description: v })} />
      <Field label="Address line" hint="Full address shown below the map." value={c.addressLabel} onChange={(v) => set({ addressLabel: v })} />
      <Field label="Hours line" hint="Hours shown on the contact page." value={c.hoursLabel} onChange={(v) => set({ hoursLabel: v })} />
      <Field label="Service area intro" value={c.serviceAreaIntro} multiline rows={3} onChange={(v) => set({ serviceAreaIntro: v })} />
      <Field label="Nearby areas section title" value={c.nearbyAreasTitle} onChange={(v) => set({ nearbyAreasTitle: v })} />
      <StringList
        label="Nearby areas list"
        hint="Each area appears as a tag/chip on the contact page."
        items={c.nearbyAreas}
        onChange={(v) => set({ nearbyAreas: v })}
      />

      <hr className="border-gray-100" />
      <SectionTitle title="Contact form labels" desc="Customize the labels and placeholder text in the inquiry form." />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name label" value={c.form.nameLabel} onChange={(v) => setF({ nameLabel: v })} />
        <Field label="Name placeholder" value={c.form.namePlaceholder} onChange={(v) => setF({ namePlaceholder: v })} />
        <Field label="Email label" value={c.form.emailLabel} onChange={(v) => setF({ emailLabel: v })} />
        <Field label="Email placeholder" value={c.form.emailPlaceholder} onChange={(v) => setF({ emailPlaceholder: v })} />
        <Field label="Phone label" value={c.form.phoneLabel} onChange={(v) => setF({ phoneLabel: v })} />
        <Field label="Phone placeholder" value={c.form.phonePlaceholder} onChange={(v) => setF({ phonePlaceholder: v })} />
        <Field label="Pickup/delivery label" value={c.form.pickupDeliveryLabel} onChange={(v) => setF({ pickupDeliveryLabel: v })} />
        <Field label="Zip label" value={c.form.zipLabel} onChange={(v) => setF({ zipLabel: v })} />
        <Field label="Zip placeholder" value={c.form.zipPlaceholder} onChange={(v) => setF({ zipPlaceholder: v })} />
        <Field label="Details label" value={c.form.detailsLabel} onChange={(v) => setF({ detailsLabel: v })} />
      </div>
      <Field label="Details placeholder" value={c.form.detailsPlaceholder} onChange={(v) => setF({ detailsPlaceholder: v })} />
      <Field label="Submit button label" value={c.form.submitLabel} onChange={(v) => setF({ submitLabel: v })} />
      <StringList
        label="Pickup/delivery options"
        items={c.form.pickupDeliveryOptions}
        onChange={(v) => setF({ pickupDeliveryOptions: v })}
      />
      <Field label="Success message" hint="Shown after the form is submitted successfully." value={c.form.successMessage} onChange={(v) => setF({ successMessage: v })} />
      <Field label="Error message" hint="Shown if the form submission fails." value={c.form.errorMessage} onChange={(v) => setF({ errorMessage: v })} />
    </div>
  );
}

function NavTab({
  content,
  onChange,
}: {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}) {
  const n = content.nav;
  const set = (patch: Partial<SiteContent["nav"]>) =>
    onChange({ ...content, nav: { ...n, ...patch } });

  return (
    <div className="space-y-5">
      <SectionTitle title="Navigation Labels" desc="The link names shown in the site header and footer navigation." />
      <Field label="Home link label" value={n.home} onChange={(v) => set({ home: v })} />
      <Field label="Shop link label" value={n.shop} onChange={(v) => set({ shop: v })} />
      <Field label="Contact link label" value={n.contact} onChange={(v) => set({ contact: v })} />
      <Field label="About link label" value={n.about} onChange={(v) => set({ about: v })} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SiteContentPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState<SiteContent | null>(null);
  const savedRef = useRef<string>(""); // JSON snapshot of last saved-to-DB state
  const [activeTab, setActiveTab] = useState<TabKey>("brand");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Auth gate — must be admin or have content:write
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") {
      const canEdit =
        user?.role === "admin" || user?.permissions?.includes("content:write");
      if (!canEdit) router.replace("/inventory");
    }
  }, [status, user, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.getSiteContentDraft();
      setContent(data);
      savedRef.current = JSON.stringify(data);
    } catch {
      setError("Failed to load site content. Is the API running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const isDirty = content !== null && JSON.stringify(content) !== savedRef.current;

  async function handleSaveDraft() {
    if (!content) return;
    setSaving(true);
    try {
      await api.saveSiteContentDraft(content);
      savedRef.current = JSON.stringify(content);
      setToast({ message: "Draft saved.", type: "success" });
    } catch {
      setToast({ message: "Failed to save draft. Try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!content) return;
    // Save draft first so the preview reflects the latest edits
    setSaving(true);
    try {
      await api.saveSiteContentDraft(content);
      savedRef.current = JSON.stringify(content);
      // The preview redirect endpoint constructs the full website URL server-side
      // so the preview secret never needs to be in the admin client bundle.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      window.open(`${apiUrl}/api/admin/site-content/preview-redirect`, "_blank");
    } catch {
      setToast({ message: "Failed to save draft before preview.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setShowPublishConfirm(false);
    try {
      // Always save draft first in case there are unsaved edits
      if (content && isDirty) {
        await api.saveSiteContentDraft(content);
        savedRef.current = JSON.stringify(content);
      }
      await api.publishSiteContent();
      setToast({ message: "Published! Changes are now live on your website.", type: "success" });
    } catch {
      setToast({ message: "Failed to publish. Try again.", type: "error" });
    } finally {
      setPublishing(false);
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-red-500 text-sm">{error}</div>
    );
  }

  if (!content) return null;

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div>
      {/* Page header + toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Site Content</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Edit website copy. Save a draft to preview, then publish when ready.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span
            className={`flex items-center gap-1.5 text-xs font-medium ${
              isDirty ? "text-amber-600" : "text-gray-400"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isDirty ? "bg-amber-500" : "bg-gray-300"
              }`}
            />
            {isDirty ? "Unsaved changes" : "Draft up to date"}
          </span>

          <button
            onClick={handlePreview}
            disabled={saving || publishing}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Preview ↗
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing || !isDirty}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>

          <button
            onClick={() => setShowPublishConfirm(true)}
            disabled={saving || publishing}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Tab layout */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 space-y-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 rounded-lg border border-gray-200 bg-white p-6">
          <p className="mb-6 text-sm text-gray-500">{activeTabMeta.desc}</p>

          {activeTab === "brand"   && <BrandTab   content={content} onChange={setContent} />}
          {activeTab === "home"    && <HomeTab    content={content} onChange={setContent} />}
          {activeTab === "shop"    && <ShopTab    content={content} onChange={setContent} />}
          {activeTab === "decor"   && <DecorTab   content={content} onChange={setContent} />}
          {activeTab === "about"   && <AboutTab   content={content} onChange={setContent} />}
          {activeTab === "contact" && <ContactTab content={content} onChange={setContent} />}
          {activeTab === "nav"     && <NavTab     content={content} onChange={setContent} />}
        </div>
      </div>

      {/* Publish confirm dialog */}
      <ConfirmDialog
        open={showPublishConfirm}
        title="Publish changes"
        message="This will update your live website immediately. All visitors will see the new content. Continue?"
        confirmLabel="Yes, publish"
        variant="warning"
        loading={publishing}
        onConfirm={handlePublish}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
