import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { X, Cookie } from "lucide-react";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <Card className="max-w-4xl mx-auto p-6 shadow-lg pointer-events-auto border-primary/20">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Cookie className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-2">Cookie Consent</h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your browsing experience, serve personalized content, and analyze
                our traffic. By clicking "Accept All", you consent to our use of cookies.{" "}
                <a
                  href="/privacy-policy"
                  className="underline hover:text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read our Privacy Policy
                </a>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAccept} size="sm">
                Accept All
              </Button>
              <Button onClick={handleDecline} variant="outline" size="sm">
                Decline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("/privacy-policy", "_blank")}
              >
                Learn More
              </Button>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
