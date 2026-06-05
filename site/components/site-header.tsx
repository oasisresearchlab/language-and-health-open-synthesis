import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchTrigger } from "@/components/search-trigger";

const REPO_URL = "https://github.com/jring-o/rdf";

function SciOSMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="52 3 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M77.8534 29.7571C75.5597 31.594 72.6869 32.6231 69.7071 32.6753C66.7274 32.7275 63.8178 31.7997 61.4566 30.0443C59.0953 28.2889 57.4227 25.8104 56.7137 23.0159C56.0047 20.2215 56.3014 17.2773 57.5551 14.6672C58.8088 12.0571 60.9448 9.93625 63.6123 8.65316C66.2798 7.37007 69.32 7.00105 72.2335 7.60673C75.147 8.21241 77.7604 9.75677 79.6443 11.9861C81.5283 14.2153 82.5707 16.997 82.6004 19.8739C82.6089 20.6944 83.3048 21.353 84.1548 21.3449C85.0048 21.3367 85.687 20.6649 85.6785 19.8443C85.6419 16.293 84.3551 12.8594 82.0296 10.1075C79.704 7.35566 76.478 5.44929 72.8815 4.70164C69.2851 3.95398 65.5322 4.4095 62.2394 5.99335C58.9467 7.57721 56.3099 10.1952 54.7624 13.4172C53.2149 16.6391 52.8486 20.2734 53.7238 23.7229C54.599 27.1724 56.6636 30.2319 59.5784 32.3988C62.4932 34.5656 66.0847 35.7109 69.763 35.6465C73.4413 35.5821 76.9874 34.3117 79.8188 32.0442C80.4731 31.5203 80.5635 30.5835 80.0207 29.952C79.478 29.3204 78.5077 29.2331 77.8534 29.7571Z"
        fill="#3A5837"
      />
      <path
        d="M84.7178 25.4942C84.7178 27.04 83.4198 28.2932 81.8185 28.2932C80.2173 28.2932 78.9192 27.04 78.9192 25.4942C78.9192 23.9484 80.2173 22.6953 81.8185 22.6953C83.4198 22.6953 84.7178 23.9484 84.7178 25.4942Z"
        fill="#3A5837"
      />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.847-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const NAV = [
  { href: "/graph", label: "Graph" },
  { href: "/narratives", label: "Narratives" },
  { href: "/nodes", label: "Nodes" },
  { href: "/contribute", label: "Contribute" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight"
        >
          <SciOSMark className="h-5 w-5" />
          <span>Resilient Data Futures</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-sans text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
