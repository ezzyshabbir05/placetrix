export interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  category: "FAANG / Tier-1" | "Product" | "FinTech" | "Mass Recruiter / IT Services";
  badgeStyles: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
  defaultFrequency: number;
}

export const COMPANY_CATALOG: CompanyInfo[] = [
  {
    id: "amazon",
    name: "Amazon",
    slug: "amazon",
    aliases: ["amazon", "amzn", "aws"],
    category: "FAANG / Tier-1",
    badgeStyles: {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/30",
      dot: "bg-amber-500",
    },
    defaultFrequency: 36,
  },
  {
    id: "google",
    name: "Google",
    slug: "google",
    aliases: ["google", "goog", "alphabet"],
    category: "FAANG / Tier-1",
    badgeStyles: {
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
      text: "text-blue-700 dark:text-blue-400",
      border: "border-blue-500/30",
      dot: "bg-blue-500",
    },
    defaultFrequency: 28,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    slug: "microsoft",
    aliases: ["microsoft", "msft"],
    category: "FAANG / Tier-1",
    badgeStyles: {
      bg: "bg-sky-500/10 dark:bg-sky-500/15",
      text: "text-sky-700 dark:text-sky-400",
      border: "border-sky-500/30",
      dot: "bg-sky-500",
    },
    defaultFrequency: 30,
  },
  {
    id: "meta",
    name: "Meta",
    slug: "meta",
    aliases: ["meta", "facebook", "fb"],
    category: "FAANG / Tier-1",
    badgeStyles: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      text: "text-indigo-700 dark:text-indigo-400",
      border: "border-indigo-500/30",
      dot: "bg-indigo-500",
    },
    defaultFrequency: 24,
  },
  {
    id: "apple",
    name: "Apple",
    slug: "apple",
    aliases: ["apple", "aapl"],
    category: "FAANG / Tier-1",
    badgeStyles: {
      bg: "bg-zinc-500/10 dark:bg-zinc-500/15",
      text: "text-zinc-700 dark:text-zinc-300",
      border: "border-zinc-500/30",
      dot: "bg-zinc-400",
    },
    defaultFrequency: 18,
  },
  {
    id: "uber",
    name: "Uber",
    slug: "uber",
    aliases: ["uber"],
    category: "Product",
    badgeStyles: {
      bg: "bg-neutral-500/10 dark:bg-neutral-500/15",
      text: "text-neutral-800 dark:text-neutral-200",
      border: "border-neutral-500/30",
      dot: "bg-neutral-500",
    },
    defaultFrequency: 20,
  },
  {
    id: "flipkart",
    name: "Flipkart",
    slug: "flipkart",
    aliases: ["flipkart", "fk"],
    category: "Product",
    badgeStyles: {
      bg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-500/30",
      dot: "bg-yellow-500",
    },
    defaultFrequency: 22,
  },
  {
    id: "adobe",
    name: "Adobe",
    slug: "adobe",
    aliases: ["adobe"],
    category: "Product",
    badgeStyles: {
      bg: "bg-rose-500/10 dark:bg-rose-500/15",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-500/30",
      dot: "bg-rose-500",
    },
    defaultFrequency: 19,
  },
  {
    id: "goldman_sachs",
    name: "Goldman Sachs",
    slug: "goldman-sachs",
    aliases: ["goldman sachs", "goldman", "gs"],
    category: "FinTech",
    badgeStyles: {
      bg: "bg-orange-500/10 dark:bg-orange-500/15",
      text: "text-orange-700 dark:text-orange-400",
      border: "border-orange-500/30",
      dot: "bg-orange-500",
    },
    defaultFrequency: 25,
  },
  {
    id: "tcs",
    name: "TCS",
    slug: "tcs",
    aliases: ["tcs", "tata consultancy services", "tcs digital", "tcs nqt", "tcs ninja", "tcs prime"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-purple-500/10 dark:bg-purple-500/15",
      text: "text-purple-700 dark:text-purple-400",
      border: "border-purple-500/30",
      dot: "bg-purple-500",
    },
    defaultFrequency: 45,
  },
  {
    id: "infosys",
    name: "Infosys",
    slug: "infosys",
    aliases: ["infosys", "infy", "infosys sp", "infosys dse"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      text: "text-cyan-700 dark:text-cyan-400",
      border: "border-cyan-500/30",
      dot: "bg-cyan-500",
    },
    defaultFrequency: 38,
  },
  {
    id: "cognizant",
    name: "Cognizant",
    slug: "cognizant",
    aliases: ["cognizant", "cts", "genc", "genc elevate", "genc next"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-teal-500/10 dark:bg-teal-500/15",
      text: "text-teal-700 dark:text-teal-400",
      border: "border-teal-500/30",
      dot: "bg-teal-500",
    },
    defaultFrequency: 32,
  },
  {
    id: "accenture",
    name: "Accenture",
    slug: "accenture",
    aliases: ["accenture", "ase", "fse"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-violet-500/10 dark:bg-violet-500/15",
      text: "text-violet-700 dark:text-violet-400",
      border: "border-violet-500/30",
      dot: "bg-violet-500",
    },
    defaultFrequency: 40,
  },
  {
    id: "wipro",
    name: "Wipro",
    slug: "wipro",
    aliases: ["wipro", "turbo", "elite"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-500/30",
      dot: "bg-emerald-500",
    },
    defaultFrequency: 29,
  },
  {
    id: "capgemini",
    name: "Capgemini",
    slug: "capgemini",
    aliases: ["capgemini", "exceller"],
    category: "Mass Recruiter / IT Services",
    badgeStyles: {
      bg: "bg-blue-600/10 dark:bg-blue-600/15",
      text: "text-blue-700 dark:text-blue-400",
      border: "border-blue-600/30",
      dot: "bg-blue-600",
    },
    defaultFrequency: 26,
  },
];

// Specific known high-frequency question pairings for placement prep
const PROBLEM_COMPANY_FREQUENCIES: Record<string, Record<string, number>> = {
  "missing-number": { amazon: 44, microsoft: 38, tcs: 50, infosys: 46, accenture: 45 },
  "maximum-product-of-three-numbers": { amazon: 28, tcs: 38, infosys: 34 },
  "longest-consecutive-sequence": { google: 42, amazon: 39, microsoft: 35 },
  "find-peak-element": { google: 38, meta: 34, amazon: 31 },
  "best-time-to-buy-and-sell-stock": { amazon: 47, google: 38, meta: 32, tcs: 52, cognizant: 44, goldman_sachs: 36 },
  "contains-duplicate": { amazon: 38, apple: 30, tcs: 50, infosys: 46, accenture: 48 },
  "find-minimum-in-rotated-sorted-array": { amazon: 34, google: 32, microsoft: 29 },
  "container-with-most-water": { amazon: 42, google: 37, meta: 33, goldman_sachs: 31 },
  "trapping-rain-water": { amazon: 48, google: 44, goldman_sachs: 38, uber: 34 },
  "third-maximum-number": { amazon: 26, google: 22, tcs: 38 },
  "binary-search": { google: 32, microsoft: 30, tcs: 50, infosys: 46, cognizant: 44 },
  "find-first-and-last-position-of-element-in-sorted-array": { google: 36, amazon: 32, microsoft: 29 },
  "majority-element": { amazon: 36, google: 32, microsoft: 30, tcs: 45, accenture: 42 },
  "single-number": { amazon: 34, google: 30, tcs: 46, infosys: 42 },
  "valid-palindrome": { meta: 38, amazon: 32, microsoft: 28, tcs: 44 },
  "maximum-subarray": { amazon: 46, microsoft: 40, google: 35, tcs: 54, infosys: 50, accenture: 52, wipro: 45 },
  "length-of-last-word": { google: 22, amazon: 24, tcs: 42, infosys: 38 },
  "valid-parentheses": { amazon: 48, google: 42, microsoft: 40, tcs: 55, cognizant: 45, accenture: 48 },
  "product-of-array-except-self": { amazon: 44, meta: 38, apple: 32, google: 34, microsoft: 33 },
  "single-element-in-a-sorted-array": { google: 31, amazon: 28, microsoft: 26 },
  "longest-substring-without-repeating-characters": { amazon: 45, google: 42, microsoft: 36, flipkart: 32 },
  "climbing-stairs": { amazon: 38, microsoft: 32, tcs: 52, infosys: 48, accenture: 50 },
  "two-sum-ii-input-array-is-sorted": { amazon: 32, google: 28, tcs: 36 },
  "move-zeroes": { amazon: 34, microsoft: 30, tcs: 46, infosys: 42, accenture: 45 },
  "valid-anagram": { amazon: 33, google: 28, tcs: 45, infosys: 41 },
  "search-insert-position": { google: 29, amazon: 27, tcs: 42, infosys: 38 },
  "plus-one": { google: 25, amazon: 27, tcs: 47, infosys: 43, wipro: 38 },
  "two-sum": { amazon: 52, google: 45, microsoft: 48, meta: 36, tcs: 56, infosys: 50, accenture: 52 },
  "jump-game": { amazon: 35, google: 31, microsoft: 28, tcs: 36 },
  "search-in-rotated-sorted-array": { google: 42, microsoft: 38, amazon: 36, meta: 33 },
  "max-consecutive-ones": { google: 24, amazon: 26, tcs: 44, infosys: 40 },
  "palindrome-number": { google: 26, amazon: 28, tcs: 50, infosys: 48, accenture: 47, wipro: 42 },
  "3sum": { amazon: 40, google: 36, meta: 34, microsoft: 31 },
  "group-anagrams": { amazon: 41, microsoft: 35, google: 32, uber: 28 },
  "merge-intervals": { google: 44, meta: 40, amazon: 38, microsoft: 34, goldman_sachs: 32 },
  "reverse-integer": { amazon: 29, google: 25, tcs: 46, infosys: 40 },
  "rotate-image": { amazon: 36, microsoft: 32, apple: 26 },
  "word-search": { amazon: 38, microsoft: 34, meta: 30 },
  "search-a-2d-matrix": { amazon: 35, microsoft: 31, google: 28 },
  "number-of-islands": { amazon: 48, google: 42, microsoft: 38, meta: 36 },
  "roman-to-integer": { amazon: 32, microsoft: 28, tcs: 45, infosys: 42 },
  "longest-common-prefix": { amazon: 30, google: 26, tcs: 48, infosys: 44, accenture: 46 },
  "permutations": { amazon: 36, google: 32, microsoft: 29, tcs: 35 },
  "combination-sum": { amazon: 37, google: 33, microsoft: 30 },
  "set-matrix-zeroes": { amazon: 36, microsoft: 33, google: 29, tcs: 38 },
  "median-of-two-sorted-arrays": { google: 45, amazon: 42, microsoft: 36, goldman_sachs: 34 },
  "first-missing-positive": { amazon: 40, google: 37, microsoft: 32 },
  "subsets": { amazon: 38, google: 34, meta: 31, microsoft: 29 },
  "sort-colors": { amazon: 37, microsoft: 34, tcs: 46, infosys: 42, accenture: 45 },
  "counting-bits": { amazon: 27, google: 25, tcs: 36 },
  "coin-change": { amazon: 41, google: 35, microsoft: 33, tcs: 42 },
  "longest-increasing-subsequence": { google: 40, amazon: 37, microsoft: 33 },
  "edit-distance": { google: 38, amazon: 35, microsoft: 32 },
  "unique-paths": { amazon: 35, google: 32, microsoft: 28, tcs: 38 },
  "decode-ways": { amazon: 33, google: 31, meta: 27 },
  "minimum-path-sum": { amazon: 32, google: 29, microsoft: 25 },
  "house-robber": { amazon: 36, google: 30, microsoft: 28, tcs: 40 },
  "jump-game-ii": { amazon: 31, google: 28, microsoft: 26 },
  "word-break": { amazon: 39, google: 36, meta: 33, microsoft: 31 },
  "maximum-product-subarray": { amazon: 34, google: 30, microsoft: 28, tcs: 36 },
  "kth-largest-element-in-an-array": { amazon: 42, meta: 36, google: 33, microsoft: 30 },
  "rotate-array": { amazon: 35, microsoft: 30, tcs: 41, infosys: 37 },
  "reverse-string": { amazon: 28, microsoft: 25, tcs: 46, infosys: 42 },
  "remove-duplicates-from-sorted-array": { amazon: 33, google: 27, tcs: 48, infosys: 44 },
  "intersection-of-two-arrays": { amazon: 31, google: 28, tcs: 42, infosys: 38 },
  "remove-element": { amazon: 27, google: 24, tcs: 44, infosys: 39 },
  "ransom-note": { amazon: 30, microsoft: 25, google: 22, tcs: 34 },
  "sqrt-x": { google: 26, amazon: 24, microsoft: 22, tcs: 38 },
  "pascal-s-triangle": { amazon: 27, google: 25, microsoft: 23, tcs: 44, infosys: 41 },
  "add-binary": { meta: 29, amazon: 25, tcs: 38, infosys: 35 },
  "isomorphic-strings": { amazon: 26, google: 23, tcs: 36 },
  "contains-duplicate-ii": { amazon: 28, microsoft: 22, tcs: 35 },
  "find-the-duplicate-number": { amazon: 36, google: 30, microsoft: 28 },
  "power-of-two": { google: 22, amazon: 24, tcs: 45, infosys: 40, wipro: 35 },
  "valid-palindrome-ii": { meta: 35, amazon: 26, microsoft: 22 },
  "valid-sudoku": { amazon: 29, google: 27, microsoft: 24 },
  "squares-of-a-sorted-array": { amazon: 26, microsoft: 24, tcs: 38, cognizant: 35 },
  "first-unique-character-in-a-string": { amazon: 37, microsoft: 28, google: 25, tcs: 42, infosys: 39 },
  "number-of-1-bits": { amazon: 25, microsoft: 28, apple: 20, tcs: 40, infosys: 38 },
  "word-pattern": { amazon: 24, google: 22, tcs: 32 },
  "sliding-window-maximum": { amazon: 39, google: 35, microsoft: 28 },
  "3sum-closest": { amazon: 28, google: 25, microsoft: 24 },
  "4sum": { amazon: 27, google: 24, microsoft: 22 },
  "letter-combinations-of-a-phone-number": { amazon: 33, google: 29, microsoft: 27 },
  "n-queens": { amazon: 28, google: 26, microsoft: 25, tcs: 30 },
  "largest-rectangle-in-histogram": { google: 40, amazon: 36, microsoft: 30 },
  "generate-parentheses": { amazon: 34, google: 31, microsoft: 28, tcs: 36 },
  "integer-to-roman": { amazon: 26, microsoft: 22, tcs: 34 },
  "next-permutation": { google: 35, amazon: 31, meta: 28 },
  "minimum-window-substring": { amazon: 42, google: 38, meta: 35, microsoft: 30 },
  "sudoku-solver": { google: 30, uber: 26, amazon: 24 },
  "multiply-strings": { google: 24, meta: 22, microsoft: 20 },
  "spiral-matrix-ii": { amazon: 28, microsoft: 25, tcs: 32 },
  "string-to-integer-atoi": { amazon: 26, microsoft: 22, tcs: 34 },
  "longest-valid-parentheses": { google: 36, amazon: 32, meta: 28 },
  "zigzag-conversion": { amazon: 22, microsoft: 18, google: 20 },
  "longest-palindromic-substring": { amazon: 38, google: 34, microsoft: 30, tcs: 35 },
  "reverse-words-in-a-string": { amazon: 28, microsoft: 24, tcs: 32 },
  "find-the-index-of-the-first-occurrence-in-a-string": { amazon: 26, google: 22, tcs: 38 },
  "count-and-say": { amazon: 22, google: 20, tcs: 30 },
  "invert-binary-tree": { google: 34, amazon: 25, microsoft: 27 },
  "binary-tree-level-order-traversal": { amazon: 32, microsoft: 28, meta: 26 },
  "reverse-linked-list": { amazon: 40, microsoft: 36, google: 30, tcs: 45, infosys: 42 },
  "merge-two-sorted-lists": { amazon: 35, microsoft: 32, apple: 24, tcs: 44, accenture: 38 },
  "lru-cache": { amazon: 44, google: 38, microsoft: 36, flipkart: 34, uber: 32 },
};

/**
 * Normalizes title or tag for lookup (e.g. "Two Sum" -> "two-sum")
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Matches tag string against company names and aliases
 */
export function getCompanyByTag(tag: string): CompanyInfo | undefined {
  if (!tag) return undefined;
  const clean = tag.toLowerCase().trim();
  return COMPANY_CATALOG.find(
    (c) =>
      c.name.toLowerCase() === clean ||
      c.slug === clean ||
      c.aliases.some((a) => a.toLowerCase() === clean)
  );
}

/**
 * Checks whether a given tag is a company tag
 */
export function isCompanyTag(tag: string): boolean {
  return !!getCompanyByTag(tag);
}

/**
 * Computes frequency for a given company and problem
 */
export function getCompanyFrequency(companyId: string, problemTitle?: string): number {
  if (problemTitle) {
    const key = normalizeKey(problemTitle);
    if (PROBLEM_COMPANY_FREQUENCIES[key]?.[companyId]) {
      return PROBLEM_COMPANY_FREQUENCIES[key][companyId];
    }
  }
  const company = COMPANY_CATALOG.find((c) => c.id === companyId);
  return company ? company.defaultFrequency : 15;
}

export interface ProblemCompanyBadge {
  company: CompanyInfo;
  frequency: number;
}

/**
 * Extracts all company badges with interview recurrence frequencies for a problem.
 * Matches both explicit company tags and known company frequency entries for the problem title.
 */
export function getProblemCompanyBadges(problem: {
  title?: string;
  tags?: string[];
}): ProblemCompanyBadge[] {
  const matched = new Map<string, ProblemCompanyBadge>();

  // 1. Check explicit tags on the problem
  if (Array.isArray(problem.tags)) {
    for (const tag of problem.tags) {
      const company = getCompanyByTag(tag);
      if (company && !matched.has(company.id)) {
        const freq = getCompanyFrequency(company.id, problem.title);
        matched.set(company.id, { company, frequency: freq });
      }
    }
  }

  // 2. Check title-based frequency mapping if title is available
  if (problem.title) {
    const key = normalizeKey(problem.title);
    const specificFrequencies = PROBLEM_COMPANY_FREQUENCIES[key];
    if (specificFrequencies) {
      for (const [companyId, freq] of Object.entries(specificFrequencies)) {
        if (!matched.has(companyId)) {
          const company = COMPANY_CATALOG.find((c) => c.id === companyId);
          if (company) {
            matched.set(companyId, { company, frequency: freq });
          }
        }
      }
    }
  }

  // Return sorted by highest interview frequency first
  return Array.from(matched.values()).sort((a, b) => b.frequency - a.frequency);
}

/**
 * Checks if a problem was asked at a given company (via tags or known title frequency mapping)
 */
export function isProblemAskedAtCompany(
  problem: { title?: string; tags?: string[] },
  companyId: string
): boolean {
  if (Array.isArray(problem.tags)) {
    for (const tag of problem.tags) {
      const company = getCompanyByTag(tag);
      if (company?.id === companyId) return true;
    }
  }
  if (problem.title) {
    const key = normalizeKey(problem.title);
    if (PROBLEM_COMPANY_FREQUENCIES[key]?.[companyId]) return true;
  }
  return false;
}
