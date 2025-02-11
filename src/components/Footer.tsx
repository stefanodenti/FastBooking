import { Github, Mail } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-4">
            <Logo size="xs" />
            <span className="text-sm text-gray-600 dark:text-gray-400">© {new Date().getFullYear()} FastBooking</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="/appointments"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Schedule
            </a>
            <a
              href="/storage"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Storage
            </a>
            <a
              href="/users"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Users
            </a>
            <a
              href="/documentation"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Documentation
            </a>
          </div>

          {/* Contact Icons */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:support@fastbooking.com"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="Email Support">
              <Mail className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/fastbooking"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="GitHub Repository">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
