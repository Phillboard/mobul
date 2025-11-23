import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Video, FileText, Mail, MessageCircle, ExternalLink } from "lucide-react";

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        question: "How do I create my first campaign?",
        answer: "Navigate to Campaigns > Create New Campaign. Follow the wizard to set up your template, audience, landing page, and gift card rewards. The system will guide you through each step.",
      },
      {
        question: "What file format should I use for audience uploads?",
        answer: "Upload CSV files with columns: first_name, last_name, email, phone, address, city, state, zip. Download our sample CSV template for reference.",
      },
      {
        question: "How long does it take to generate a landing page?",
        answer: "AI-generated landing pages typically take 30-60 seconds. You can customize the generated page using our visual editor or request AI modifications.",
      },
    ],
  },
  {
    category: "Gift Cards",
    items: [
      {
        question: "How do I add gift cards to my inventory?",
        answer: "Go to Gift Cards > Upload Cards. You can upload cards via CSV or purchase directly from our marketplace. Each card needs a unique code and value.",
      },
      {
        question: "What happens if I run out of gift cards during a campaign?",
        answer: "The system will alert you when inventory is low (<100 cards). Campaigns will pause automatically if cards run out. You can top up your pool anytime.",
      },
      {
        question: "Can I check gift card balances?",
        answer: "Yes! Use the balance check feature in the Gift Cards section. Enter the card code to see current balance, redemption history, and status.",
      },
    ],
  },
  {
    category: "Campaigns",
    items: [
      {
        question: "What are campaign conditions?",
        answer: "Conditions are triggers that determine when gift cards are delivered. Examples: immediate (on mail receipt), after call, after form submission, or after CRM event. You can set up multiple conditions per campaign.",
      },
      {
        question: "How do I track campaign performance?",
        answer: "Go to Campaign Detail > Analytics tab. You'll see metrics like response rate, gift card redemption rate, condition completion, and ROI calculations.",
      },
      {
        question: "Can I pause or stop a campaign?",
        answer: "Yes, use the campaign status controls to pause or stop delivery. Already-sent items will complete, but new provisioning will halt.",
      },
    ],
  },
  {
    category: "Call Center",
    items: [
      {
        question: "How do agents redeem gift cards?",
        answer: "Agents access the Call Center Dashboard, enter the customer's redemption code, verify details, and provision the gift card. An SMS with card details is sent automatically.",
      },
      {
        question: "What if a customer lost their redemption code?",
        answer: "Search by phone number or email in the Call Center Dashboard. The system will show any codes associated with that customer.",
      },
      {
        question: "How do we handle already-redeemed codes?",
        answer: "The system prevents double-redemption automatically and shows a clear message. Review the redemption history to confirm with the customer.",
      },
    ],
  },
  {
    category: "Billing & Credits",
    items: [
      {
        question: "How does billing work?",
        answer: "Choose from monthly subscription plans or prepaid credit packages. Campaigns deduct credits based on recipient count and features used. View detailed usage in Settings > Billing.",
      },
      {
        question: "What happens if I run out of credits?",
        answer: "Campaigns will pause when credits reach zero. Purchase additional credits or upgrade your plan to continue. You'll receive low-balance alerts.",
      },
      {
        question: "Can I get a refund for unused credits?",
        answer: "Monthly subscription credits expire at the end of each billing cycle. Prepaid credit packages are non-refundable but never expire.",
      },
    ],
  },
];

const videoTutorials = [
  {
    title: "Creating Your First Campaign",
    duration: "5:32",
    description: "Complete walkthrough of the campaign creation wizard",
    thumbnail: "🎬",
  },
  {
    title: "Gift Card Management",
    duration: "4:18",
    description: "How to upload, manage, and track gift card inventory",
    thumbnail: "🎁",
  },
  {
    title: "Call Center Operations",
    duration: "3:45",
    description: "Training for call center agents on redemption process",
    thumbnail: "📞",
  },
  {
    title: "Landing Page Builder",
    duration: "6:12",
    description: "Design beautiful, personalized landing pages with AI",
    thumbnail: "🎨",
  },
];

const documentation = [
  { title: "API Reference", description: "Complete API documentation with examples", icon: FileText },
  { title: "Architecture Guide", description: "System architecture and data model", icon: BookOpen },
  { title: "Developer Guide", description: "For developers integrating with our platform", icon: FileText },
  { title: "Call Center Guide", description: "Comprehensive guide for call center operations", icon: BookOpen },
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.items.length > 0);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Find answers, watch tutorials, and get support</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="mailto:support@yoursystem.com">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
          </Button>
          <Button asChild>
            <a href="https://discord.gg/yourserver" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Join Discord
            </a>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">
            <BookOpen className="mr-2 h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Video Tutorials
          </TabsTrigger>
          <TabsTrigger value="docs">
            <FileText className="mr-2 h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No results found for "{searchQuery}"
              </CardContent>
            </Card>
          ) : (
            filteredFaqs.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.category}
                    <Badge variant="secondary">{category.items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {videoTutorials.map((video, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="flex aspect-video items-center justify-center bg-muted text-6xl">
                  {video.thumbnail}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                    <Badge variant="outline">{video.duration}</Badge>
                  </div>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    <Video className="mr-2 h-4 w-4" />
                    Watch Tutorial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {documentation.map((doc, index) => {
              const Icon = doc.icon;
              return (
                <Card key={index} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription>{doc.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline" asChild>
                      <a href={`/docs/${doc.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Documentation
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
              <CardDescription>Can't find what you're looking for? Our support team is here to help.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild>
                <a href="mailto:support@yoursystem.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Platform Docs
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
