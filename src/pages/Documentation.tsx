import { Book, FileText } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import readmeContent from "../../README.md?raw";
import subscriptionContent from "../../SUBSCRIPTION_PLANS.md?raw";
import technicalContent from "../../TECHNICAL.md?raw";

export default function Documentation() {
  const [activeDoc, setActiveDoc] = useState<"readme" | "technical" | "subscription">("readme");

  const getContent = () => {
    switch (activeDoc) {
      case "technical":
        return technicalContent;
      case "subscription":
        return subscriptionContent;
      default:
        return readmeContent;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Book className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation</h1>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveDoc("readme")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDoc === "readme"
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            <FileText className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveDoc("technical")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDoc === "technical"
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            <FileText className="h-4 w-4" />
            Technical Guide
          </button>
          <button
            onClick={() => setActiveDoc("subscription")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeDoc === "subscription"
                ? "bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}>
            <FileText className="h-4 w-4" />
            Subscription Plans
          </button>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{getContent()}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
