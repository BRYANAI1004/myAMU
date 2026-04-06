import { useRegistrationTermSearchParam } from './registrationTermSearch'

export function CourseBinCheckoutPage() {
  const registrationTermId = useRegistrationTermSearchParam()
  return (
    <main
      className="portal-page"
      data-registration-term={registrationTermId ?? undefined}
    >
      <section className="portal-card portal-stack" aria-labelledby="course-bin-checkout-heading">
        <h2 id="course-bin-checkout-heading" className="portal-section-heading">
          Checkout
        </h2>
        <p className="portal-page-lede">
          Registration checkout is not wired up yet. This page is a placeholder for the CourseBin
          checkout flow.
        </p>
      </section>
    </main>
  )
}
