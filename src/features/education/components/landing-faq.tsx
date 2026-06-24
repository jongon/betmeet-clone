import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

/**
 * Landing FAQ. Answers the common questions a first-time visitor asks before
 * signing up (cost, invites, public vs. private, scoring). Server component that
 * renders the client Accordion island; copy from the dictionary (BR-67.5).
 */
export async function LandingFaq() {
  const dictionary = getDictionary(await getRequestLocale());
  const { faq } = dictionary.landing;

  return (
    <section id="faq" className="scroll-mt-20 space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{faq.title}</h2>
        <p className="mx-auto max-w-xl text-balance text-muted-foreground">{faq.subtitle}</p>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardContent>
          <Accordion>
            {faq.items.map((item, index) => (
              <AccordionItem key={item.question} value={index}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
