import { useState, useEffect, useRef } from "react";
import { Search, Mail, MessageSquare, Calendar, Video, CheckSquare, FolderKanban, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface SearchResult {
  id: string;
  type: "email" | "slack" | "calendar" | "zoom" | "task" | "project";
  title: string;
  snippet: string;
  timestamp: string;
  source: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4 text-red-500" />,
  slack: <MessageSquare className="w-4 h-4 text-purple-500" />,
  calendar: <Calendar className="w-4 h-4 text-blue-500" />,
  zoom: <Video className="w-4 h-4 text-blue-600" />,
  task: <CheckSquare className="w-4 h-4 text-green-500" />,
  project: <FolderKanban className="w-4 h-4 text-orange-500" />,
};

const typeColors: Record<string, string> = {
  email: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  slack: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  calendar: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  zoom: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  task: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  project: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [], query: "" };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.results || [];

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return format(date, "h:mm a");
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return format(date, "EEEE");
      return format(date, "MMM d");
    } catch {
      return "";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs" data-testid="global-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search across all apps... (⌘/)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-gray-200 dark:border-slate-700"
          data-testid="input-global-search"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 max-h-[400px] overflow-y-auto z-50" data-testid="search-results-dropdown">
          {isLoading ? (
            <div className="p-4 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="w-full p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-left transition-colors flex items-start gap-3"
                  onClick={() => {
                    if (result.url) {
                      window.open(result.url, "_blank");
                    }
                    setIsOpen(false);
                  }}
                  data-testid={`search-result-${result.type}-${result.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {typeIcons[result.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{result.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeColors[result.type]}`}>
                        {result.source}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatTimestamp(result.timestamp)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
