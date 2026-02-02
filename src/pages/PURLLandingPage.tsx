import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { callPublicEdgeFunction } from "@core/api/client";
import { Endpoints } from "@core/api/endpoints";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { CheckCircle2, Phone, Mail, Loader2 } from "lucide-react";
import { useState } from "react";

export default function PURLLandingPage() {
  const { campaignId, token } = useParams();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
    appointmentRequested: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['purl', campaignId, token],
    queryFn: async () => {
      const data = await callPublicEdgeFunction(
        Endpoints.public.handlePurl,
        { campaignId, token }
      );
      
      return data;
    },
    enabled: !!campaignId && !!token,
  });

  const submitLeadMutation = useMutation({
    mutationFn: async () => {
      const submitData = await callPublicEdgeFunction(
        Endpoints.public.submitLeadForm,
        {
          campaignId,
          recipientId: data.recipient.id,
          ...formData,
        }
      );
      
      return submitData;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handlePhoneClick = async () => {
    if (data?.recipient?.phone) {
      await supabase.from('events').insert({
        campaign_id: campaignId,
        recipient_id: data.recipient.id,
        event_type: 'call_clicked',
        event_data_json: {},
        source: 'purl',
      });
    }
  };

  const handleEmailClick = async () => {
    if (data?.recipient?.email) {
      await supabase.from('events').insert({
        campaign_id: campaignId,
        recipient_id: data.recipient.id,
        event_type: 'email_clicked',
        event_data_json: {},
        source: 'purl',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Link Not Found</CardTitle>
            <CardDescription>
              This tracking link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { campaign, recipient } = data;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Thank You!</CardTitle>
                <CardDescription>
                  We have received your information and will contact you shortly.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {recipient.first_name && `Hello ${recipient.first_name},`}
          </h1>
          <h2 className="text-2xl md:text-3xl text-muted-foreground mb-6">
            {campaign.name}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We are excited to share this exclusive offer with you. Take advantage of our special promotion designed just for you.
          </p>
        </div>

        {/* Benefits Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Why Choose Us?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Industry-leading expertise with proven results</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Personalized service tailored to your needs</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Exclusive offers for valued customers</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>100% satisfaction guarantee</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact Options */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-4"
            asChild
          >
            <a href="tel:1-800-555-0100" onClick={handlePhoneClick}>
              <Phone className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Call Us Now</div>
                <div className="text-sm text-muted-foreground">1-800-555-0100</div>
              </div>
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-auto py-4"
            asChild
          >
            <a href="mailto:info@example.com" onClick={handleEmailClick}>
              <Mail className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Email Us</div>
                <div className="text-sm text-muted-foreground">info@example.com</div>
              </div>
            </a>
          </Button>
        </div>

        {/* Lead Form */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started Today</CardTitle>
            <CardDescription>
              Fill out the form below and we will contact you within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLeadMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={`${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || "John Doe"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={recipient.email || "john@example.com"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={recipient.phone || "(555) 123-4567"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message or Question</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your needs..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="appointment"
                  checked={formData.appointmentRequested}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, appointmentRequested: checked as boolean })
                  }
                />
                <Label htmlFor="appointment" className="cursor-pointer">
                  I would like to request an appointment
                </Label>
              </div>

              {submitLeadMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to submit form. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitLeadMutation.isPending}
              >
                {submitLeadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Your information is secure and will only be used to contact you about our services.
          </p>
        </div>
      </div>
    </div>
  );
}
