"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Keep these answers true. This file drifted badly once: it told visitors bank
// import was still "coming in future updates" a full release after GoCardless
// and SimpleFIN shipped, promised native mobile apps that ROADMAP.md lists as
// an explicit non-goal, and offered guided onboarding that does not exist. A
// marketing page that undersells the product is a worse problem than one that
// oversells it, because nobody reports it.
const faqs = [
  {
    question: "Is my financial data secure?",
    answer:
      "FinTrack is self-hosted: you run it, on your hardware or your VPS, and nobody else holds the database. Sessions use short-lived access tokens kept in memory with the refresh token in an HttpOnly cookie, bank sync credentials are encrypted at rest, and the in-app backups are encrypted in your browser so the server only ever stores opaque ciphertext. There is no telemetry. SECURITY.md documents the hardening checklist and the known limitations, in both directions.",
  },
  {
    question: "Can I import transactions from my bank?",
    answer:
      "Yes, two ways. Automatic sync connects to your bank through GoCardless (EU/UK) or SimpleFIN Bridge (US/CA) - both privacy-friendly, and Plaid is deliberately not first. Or import a file: CSV, OFX, QFX, QIF and CAMT.053 are supported, as are exports from YNAB, Actual Budget and Firefly III. Either route runs through the same deduplication and rules engine.",
  },
  {
    question: "Is there a mobile app available?",
    answer:
      "FinTrack is a progressive web app, so you can install it to your home screen and it works offline - there is a one-tap Quick Add screen built for exactly that. Native iOS and Android apps are a deliberate non-goal rather than a roadmap item: the PWA is the mobile story, and a solo-maintained project keeping two more codebases alive would serve you worse than one good one.",
  },
  {
    question: "How do I get started?",
    answer:
      "Clone the repository and run ./setup.sh start, or use the one-click deploy templates for Render, Railway, PikaPods, Unraid and TrueNAS SCALE. Signing up creates your workspace with a budget file, an account and the standard categories already in place. The README has a two-minute quick start.",
  },
  {
    question: "Do you offer customer support?",
    answer:
      "FinTrack is maintained by one person as a side project, so there is no SLA - and saying otherwise would not survive contact with reality. GitHub Discussions is the place for questions and self-hosting help, and answers there help the next person too. Bugs go to the issue tracker; security reports go through GitHub's private advisory flow. SUPPORT.md says which is which.",
  },
  {
    question: "Is FinTrack really free?",
    answer:
      "Yes - MIT licensed, no paid tier, no hosted plan, no feature held back. It is a double-entry ledger with envelope budgeting, shared workspaces, multi-currency support and published TypeScript and Python SDKs, and all of it is in the repository.",
  },
];

export function FaqAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
