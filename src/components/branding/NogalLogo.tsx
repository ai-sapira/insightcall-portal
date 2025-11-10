import { cn } from "@/lib/utils";
import nogalLogo from "/nogal-logo.png";

interface NogalLogoProps {
  className?: string;
}

const NogalLogo: React.FC<NogalLogoProps> = ({ className }) => {
  return (
    <img
      src={nogalLogo}
      alt="Nogal Logo"
      className={cn("object-contain", className)}
    />
  );
};

export default NogalLogo;
