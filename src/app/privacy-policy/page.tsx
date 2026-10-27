import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export const dynamic = "force-static";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
          </header>

          <div className="space-y-6 p-4 text-sm leading-relaxed text-cc-deep sm:p-6">
            <p className="text-cc-muted">Last updated October 27, 2026.</p>

            <p>
              CC Shower provides shower technical visits and installations and
              publishes this policy for{" "}
              <span className="text-cc-ink">ccshowerdoor.app</span>. This page
              describes the customer information used to manage a requested
              service and to send transactional arrival and estimated-time-of-arrival
              (ETA) text messages.
            </p>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Information we use</h2>
              <p>For a requested visit or installation, CC Shower uses:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Customer name</li>
                <li>Phone number</li>
                <li>Service address</li>
                <li>
                  Appointment and service details, including whether the visit
                  is a technical visit or an installation and the estimated
                  arrival time when one is available
                </li>
              </ul>
              <p>
                That information is used to schedule and carry out the service
                the customer requested, and to send a transactional SMS when a
                technician is on the way.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">
                Arrival and ETA text messages
              </h2>
              <p>
                The intended message is a service notice, not a marketing
                campaign. When a technician opens the route for a scheduled
                technical visit or installation, CC Shower prepares an arrival
                message for the phone number on that service. The message can
                include the customer&apos;s first name, the service address, and
                an estimated arrival time.
              </p>
              <p>
                Delivery uses n8n as the automation path and Twilio as the SMS
                delivery provider. The name, phone number, service address, and
                appointment details needed for that message are passed to n8n,
                which submits the SMS to Twilio. Twilio delivers it to the
                customer&apos;s phone. Those providers receive the information
                only to deliver the message.
              </p>
              <p>
                Message frequency varies with scheduled services. A notice is
                associated with a technician opening the route for that visit or
                installation. Message and data rates may apply.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">
                SMS opt-in data and consent
              </h2>
              <p>
                SMS opt-in data and consent will not be sold or shared with
                third parties for their marketing purposes.
              </p>
              <p>
                This policy states the intended messaging process. It does not
                mean a customer has already consented, and the application does
                not currently record SMS consent. Saving a phone number on a
                service record is not an SMS opt-in record.
              </p>
              <p>
                Before this program is used as consented messaging, CC Shower
                still has to collect and store SMS consent, honor STOP opt-out
                replies, respond to HELP replies, and include those instructions
                in the message itself. The current message template does not
                include STOP or HELP instructions, and neither the application
                nor the n8n workflow processes those replies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Contact</h2>
              <p>
                Questions about this policy or about text messages can be sent
                to CC Shower by email or phone.
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:jax@ccshowerdoor.com"
                    className="font-medium text-cc-blue-deep underline decoration-cc-border-strong underline-offset-2"
                  >
                    jax@ccshowerdoor.com
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+13214407819"
                    className="font-medium text-cc-blue-deep underline decoration-cc-border-strong underline-offset-2"
                  >
                    +1 321-440-7819
                  </a>
                </li>
              </ul>
            </section>

            <p>
              Related terms are on the{" "}
              <Link
                href="/terms-and-conditions"
                className="font-medium text-cc-blue-deep underline decoration-cc-border-strong underline-offset-2"
              >
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
