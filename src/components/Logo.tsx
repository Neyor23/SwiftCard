import { Link } from "@tanstack/react-router";
import logo from "@/assets/swiftcard-logo.png";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src={logo} alt="SwiftCard logo" width={36} height={36} className="h-9 w-9 object-contain drop-shadow-md" />
      <span className="font-display text-lg font-semibold tracking-tight">
        Swift<span className="bg-gold bg-clip-text text-transparent">Card</span>
      </span>
    </Link>
  );
}
