import { Link } from "react-router-dom";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export default function Logo({ size = "md" }: LogoProps) {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-20";
      case "lg":
        return "h-22";
      default:
        return "h-20";
    }
  };

  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="logo.png" alt="FastBooking Logo" className={`${getSizeClasses()} w-auto`} />
      {/* <span className="font-bold text-gray-900 text-lg">FastBooking</span> */}
    </Link>
  );
}
