import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Program Information",
};

export const dynamic = "force-static";

const linkClass =
  "font-medium text-cc-blue-deep underline decoration-cc-border-strong underline-offset-2";

export default function SmsConsentPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-cc-canvas">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:py-12">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="CCSHOWER"
            width={220}
            height={72}
            priority
            className="h-auto w-[min(220px,70vw)] max-w-full object-contain"
          />
        </div>

        <article className="rounded-ds-lg border border-cc-border bg-cc-surface shadow-sheet">
          <header className="border-b border-cc-border px-4 py-3 sm:px-6">
            <h1 className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep">
              SMS Program Information
            </h1>
          </header>

          <div className="space-y-6 p-4 text-sm leading-relaxed text-cc-deep sm:p-6">
            <p className="text-cc-muted">Last updated October 27, 2026.</p>

            <p>
              CLEAR CHOICE OF JAX CORPORATION, doing business as CLEAR CHOICE
              SHOWER DOORS, describes its intended text-message program for{" "}
              <span className="text-cc-ink">ccshowerdoor.app</span> on this
              page.
            </p>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Intended messages</h2>
              <p>
                Customers who request service may receive transactional text
                messages about measurement appointments, technician arrival and
                estimated time of arrival, installation scheduling, and service
                updates. These messages are about the requested service. They
                are not a marketing list.
              </p>
              <p>
                Message frequency varies with service appointments. Message and
                data rates may apply.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Verbal consent script</h2>
              <p>
                Before any text is sent, staff must read this script and wait
                for the customer&apos;s own answer:
              </p>
              <blockquote className="border-l-2 border-cc-border-strong pl-4 text-cc-ink">
                This is CLEAR CHOICE SHOWER DOORS. Do you agree to receive text
                messages about your measurement appointment, technician arrival,
                installation scheduling, and service updates? Message frequency
                varies based on your service appointments. Message and data
                rates may apply. Reply STOP to opt out or HELP for help. Your
                consent is not a condition of purchasing our services. Do you
                agree to receive these messages? Please answer yes or no.
              </blockquote>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">
                Permission must be explicit
              </h2>
              <p>
                Staff must ask for explicit permission and record the
                customer&apos;s actual yes or no before sending SMS. A phone
                number saved for a visit or installation is not permission to
                text. Silence, a purchase, or a request for service is not a
                yes.
              </p>
              <p>
                This page states that requirement. The application does not
                currently record SMS consent, and it does not store the
                customer&apos;s answer.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">STOP and HELP</h2>
              <p>
                STOP is intended to opt the customer out of further text
                messages. HELP is intended to provide assistance with the
                program.
              </p>
              <p>
                Automated STOP and HELP processing is not implemented yet. A
                reply of STOP is not recorded as an opt-out, and a reply of
                HELP is not answered automatically. Until that processing
                exists, use the contact methods below for help or to opt out.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Contact</h2>
              <p>Contact CLEAR CHOICE SHOWER DOORS by email or phone.</p>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:jax@ccshowerdoor.com" className={linkClass}>
                    jax@ccshowerdoor.com
                  </a>
                </li>
                <li>
                  <a href="tel:+13214407819" className={linkClass}>
                    +1 321-440-7819
                  </a>
                </li>
              </ul>
            </section>

            <p>
              Related pages:{" "}
              <Link href="/privacy-policy" className={linkClass}>
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms-and-conditions" className={linkClass}>
                Terms and Conditions
              </Link>
              .
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
