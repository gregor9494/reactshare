import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

export function TestimonialSection() {
  return (
    <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Loved by Content Creators</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              See what our users are saying about ReactShare.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src="/diverse-group.png"
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-semibold">Alex Johnson</p>
                    <p className="text-sm text-muted-foreground">Gaming Creator</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "ReactShare has completely transformed my workflow. I can now create and publish reaction videos in a
                  fraction of the time it used to take me."
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src="/diverse-woman-portrait.png"
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-semibold">Sarah Williams</p>
                    <p className="text-sm text-muted-foreground">Entertainment Commentator</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "The multi-platform publishing feature is a game-changer. I can now reach all my audiences with a
                  single click instead of manually uploading to each platform."
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src="/thoughtful-man.png"
                    alt="User avatar"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-semibold">Michael Chen</p>
                    <p className="text-sm text-muted-foreground">Digital Marketer</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "The analytics dashboard gives me insights I never had before. I can now see which platforms and
                  content types perform best and adjust my strategy accordingly."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
