import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export const dynamic = "force-static";

export default function TermsAndConditionsPage() {
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
              Terms and Conditions
            </h1>
          </header>

          <div className="space-y-6 p-4 text-sm leading-relaxed text-cc-deep sm:p-6">
            <p className="text-cc-muted">Last updated October 28, 2026.</p>

            <p>
              These terms describe the service-related text messages CC Shower
              intends to send for shower technical visits and installations
              arranged through{" "}
              <span className="text-cc-ink">ccshowerdoor.app</span>. They do
              not state that a customer has already agreed to receive SMS, and
              they do not add liability, warranty, or governing-law terms. Those
              commercial terms are not established in the application and need
              the business owner&apos;s confirmation before they are published.
            </p>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Services</h2>
              <p>
                CC Shower schedules and performs technical visits and shower
                installations at the service address provided for that job. The
                customer name, phone number, service address, and appointment
                details are used to carry out that requested service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">
                SMS: arrival and ETA notifications
              </h2>
              <p>
                CC Shower intends to send transactional SMS messages about a
                scheduled service. The intended message tells the customer that
                the team is on the way for a technical visit or an installation,
                and it may include an estimated arrival time and the service
                address. Messages are sent through n8n to Twilio, which delivers
                the SMS.
              </p>
              <p>
                Message frequency varies based on scheduled services. A message
                is tied to a technician opening the route for that visit or
                installation. There is no fixed monthly message count.
              </p>
              <p>Message and data rates may apply.</p>
              <p>
                SMS authorization is recorded on the customer record. Changing
                the phone number requires that authorization to be recorded
                again. STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, and QUIT are
                stored when the application receives them, and they block later
                texts. Checking the authorization box again does not remove an
                opt-out that is still in effect.
              </p>
              <p>
                HELP replies are not answered automatically. For help, contact
                CC Shower using the method in the Contact section below.
              </p>
              <p>
                How SMS information is handled is described in the{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-cc-blue-deep underline decoration-cc-border-strong underline-offset-2"
                >
                  Privacy Policy
                </Link>
                . SMS opt-in data and consent will not be sold or shared with
                third parties for their marketing purposes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">What these terms do not claim</h2>
              <p>
                A phone number saved for a visit or installation is contact
                information. It is not SMS authorization by itself.
              </p>
              <p>
                The arrival message prepared by the current workflow does not
                include STOP or HELP instructions. A text reply is stored only
                after it reaches the application. These terms do not certify the
                program, guarantee delivery, or state that a carrier or
                regulator has approved it.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium text-cc-ink">Contact</h2>
              <p>
                For help with these messages, contact CC Shower by email or
                phone. HELP replies are not answered automatically.
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
          </div>
        </article>
      </div>
    </div>
  );
}
