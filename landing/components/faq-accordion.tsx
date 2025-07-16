"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is my financial data secure?",
    answer:
      "Yes, we take security very seriously. We offer self hosted options for those who prefer to keep their data on their own servers.",
  },
  {
    question: "Can I import transactions from my bank?",
    answer:
      "For now it is manual entry, but we are working on a feature that will allow you to import transactions directly from your bank. This feature will be available in future updates.",
  },
  {
    question: "Is there a mobile app available?",
    answer:
      "Currently, FinTrack is a responsive web application that works great on mobile devices. We're working on native mobile apps for iOS and Android that will be released soon.",
  },
  {
    question: "How do I get started?",
    answer:
      "Getting started is easy! Just sign up for a free account, set up your profile, and you can start tracking your finances right away. We also offer guided onboarding to help you get the most out of FinTrack.",
  },
  {
    question: "Do you offer customer support?",
    answer:
      "Yes, we offer customer support via email for all users. Feel free to reach out to us at ashish@sannty.in for any questions or assistance.",
  },
  {
    question: "Is FinTrack really free?",
    answer:
      "Yes! FinTrack is completely free and open source. We believe financial tools should be accessible to everyone. You can even host it yourself if you prefer.",
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
