import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  return (
    <section id="faq" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Frequently Asked Questions</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Everything you need to know about ReactShare.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-3xl py-12">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is ReactShare?</AccordionTrigger>
              <AccordionContent>
                ReactShare is a comprehensive SaaS platform that empowers content creators to produce and distribute
                reaction videos across multiple social media platforms with a single workflow. It combines video
                downloading, reaction recording, editing, and automated distribution features in an intuitive interface.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Which social media platforms are supported?</AccordionTrigger>
              <AccordionContent>
                ReactShare supports YouTube, TikTok, Instagram (Posts, Stories, Reels), Twitter/X, Facebook, and Twitch.
                We're constantly adding more platforms based on user feedback.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How does the pricing work?</AccordionTrigger>
              <AccordionContent>
                We offer three main pricing tiers: Free (3 reactions/month, 480p quality), Pro ($19/month, unlimited
                reactions, 1080p quality), and Business ($49/month, team access, 4K quality). Enterprise solutions with
                custom pricing are also available.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can I cancel my subscription anytime?</AccordionTrigger>
              <AccordionContent>
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your
                current billing period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Is there a mobile app available?</AccordionTrigger>
              <AccordionContent>
                We're currently focused on our web platform, but a mobile app is on our roadmap and will be available in
                the coming months.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  )
}
