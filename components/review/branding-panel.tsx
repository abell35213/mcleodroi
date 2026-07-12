import type { ReactNode } from "react";

/**
 * Branding panel for uploading the customer logo that appears on the cover of
 * generated PPTX/PDF/HTML exports. Server-rendered; the upload posts a multipart
 * form to a server action that validates and stores the file locally.
 */
export function BrandingPanel({
  logoDataUri,
  logoError,
  saveAction,
  removeAction,
}: {
  logoDataUri: string | null;
  logoError?: string;
  saveAction: (formData: FormData) => Promise<void>;
  removeAction: () => Promise<void>;
}): ReactNode {
  return (
    <section aria-labelledby="branding-heading" className="rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-8">
      <h2 id="branding-heading" className="text-2xl font-bold text-[#0b1d33]">
        Customer Branding
      </h2>
      <p className="mt-2 max-w-2xl text-[#627085]">
        Upload the customer logo to brand the cover of the PowerPoint, PDF, and shareable HTML exports. PNG, JPG, WEBP,
        GIF, or SVG up to 2&nbsp;MB.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div className="flex h-24 w-40 items-center justify-center rounded-2xl border border-dashed border-[#d7c9ae] bg-white">
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri} alt="Current customer logo" className="max-h-20 max-w-36 object-contain" />
          ) : (
            <span className="text-sm text-[#627085]">No logo uploaded</span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <form action={saveAction} className="flex flex-wrap items-center gap-3" encType="multipart/form-data">
            <label className="sr-only" htmlFor="logo-input">
              Customer logo file
            </label>
            <input
              id="logo-input"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              required
              className="text-sm text-[#35465c] file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b1d33] file:px-4 file:py-2 file:font-semibold file:text-[#fffaf0]"
            />
            <button type="submit" className="rounded-lg bg-[#d89b2b] px-4 py-2 font-semibold text-[#0b1d33]">
              Upload Logo
            </button>
          </form>
          {logoDataUri && (
            <form action={removeAction}>
              <button type="submit" className="text-sm font-semibold text-[#627085] underline">
                Remove logo
              </button>
            </form>
          )}
        </div>
      </div>
      {logoError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {logoError}
        </p>
      )}
    </section>
  );
}
