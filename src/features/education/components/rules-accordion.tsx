"use client";

import { MDXContent } from "@content-collections/mdx/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface RuleSection {
  slug: string;
  title: string;
  body: string;
}

const PROSE =
  "space-y-2 text-sm text-muted-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:text-foreground";

/**
 * Collapsible Rules Center sections (BR-2.11). Accessible accordion (base-ui)
 * rendering the compiled MDX body of each RuleDocument.
 */
export function RulesAccordion({ sections }: { sections: RuleSection[] }) {
  return (
    <Accordion data-testid="rules-accordion">
      {sections.map((section) => (
        <AccordionItem key={section.slug} value={section.slug}>
          <AccordionTrigger data-testid={`rules-section-${section.slug}`}>
            {section.title}
          </AccordionTrigger>
          <AccordionContent>
            <div className={PROSE}>
              <MDXContent code={section.body} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
