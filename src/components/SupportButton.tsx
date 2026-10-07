import { MessageCircle } from "lucide-react";

// Replace with the real support number: country code + number, digits only.
export const SUPPORT_WHATSAPP = "2340000000000";

export function SupportButton() {
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hi SwiftCard support, I need help.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with support on WhatsApp"
      className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-gold transition hover:scale-105 md:bottom-6 md:right-6"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
