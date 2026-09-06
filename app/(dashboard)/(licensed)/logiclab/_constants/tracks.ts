export interface PrepTrack {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  targetCompanies: string[];
  targetRole: string;
  badgeColor: {
    border: string;
    bg: string;
    text: string;
    accent: string;
    ring: string;
    progressBar: string;
  };
  problemNumbers: number[];
}

export const PREP_TRACKS: PrepTrack[] = [
  {
    id: "campus-recruitment-foundations",
    slug: "campus-recruitment-foundations",
    title: "Campus Recruitment Essentials 30",
    subtitle: "Foundational arrays, strings, math & hashing for high-volume recruitment exams",
    description: "Curated specifically for TCS Digital & Ninja, Infosys DSE & SP, Cognizant GenC Next, Accenture ASE, and Wipro Turbo coding rounds.",
    targetCompanies: ["TCS", "Infosys", "Cognizant", "Accenture", "Wipro"],
    targetRole: "TCS Digital / Ninja • Infosys Specialist Programmer • GenC Next",
    badgeColor: {
      border: "border-purple-500/30 dark:border-purple-500/40",
      bg: "bg-purple-500/5 dark:bg-purple-500/10",
      text: "text-purple-700 dark:text-purple-300",
      accent: "bg-purple-500",
      ring: "focus-visible:ring-purple-500/30",
      progressBar: "bg-purple-600 dark:bg-purple-400",
    },
    problemNumbers: [1, 2, 5, 6, 10, 11, 13, 14, 15, 17, 18, 22, 24, 25, 26, 27, 28, 31, 32, 41, 42, 63, 64, 65, 66, 67, 68, 70, 74, 77],
  },
  {
    id: "product-sde1-core-interview",
    slug: "product-sde1-core-interview",
    title: "Product SDE-1 High-Frequency 40",
    subtitle: "The algorithmic patterns and benchmark questions asked at Tier-1 tech",
    description: "High-yield interview favorites covering two pointers, sliding windows, interval scheduling, matrix transformations, and monotonic structures.",
    targetCompanies: ["Amazon", "Google", "Microsoft", "Meta", "Uber", "Flipkart"],
    targetRole: "Amazon SDE-1 • Google L3 • Microsoft SDE • Uber Software Engineer",
    badgeColor: {
      border: "border-amber-500/30 dark:border-amber-500/40",
      bg: "bg-amber-500/5 dark:bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-300",
      accent: "bg-amber-500",
      ring: "focus-visible:ring-amber-500/30",
      progressBar: "bg-amber-500 dark:bg-amber-400",
    },
    problemNumbers: [3, 4, 7, 8, 9, 12, 16, 19, 20, 21, 23, 29, 30, 33, 34, 35, 37, 39, 40, 45, 46, 47, 49, 61, 62, 72, 73, 76, 81, 82, 83, 86, 89, 90, 93, 97, 98, 18, 28, 5],
  },
  {
    id: "dynamic-programming-mastery",
    slug: "dynamic-programming-mastery",
    title: "Dynamic Programming Zero-to-Hero",
    subtitle: "From 1D state transitions to 2D grids, knapsack variants & longest palindromes",
    description: "Systematically eliminate your fear of DP. Progress smoothly from basic memoization through classic interval, decision-tree, and grid-path formulations.",
    targetCompanies: ["Google", "Amazon", "Microsoft", "Goldman Sachs", "Atlassian"],
    targetRole: "Quant / FinTech SDE • Core Algorithms Specialist",
    badgeColor: {
      border: "border-blue-500/30 dark:border-blue-500/40",
      bg: "bg-blue-500/5 dark:bg-blue-500/10",
      text: "text-blue-700 dark:text-blue-300",
      accent: "bg-blue-500",
      ring: "focus-visible:ring-blue-500/30",
      progressBar: "bg-blue-600 dark:bg-blue-400",
    },
    problemNumbers: [5, 16, 22, 29, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 69, 87, 95, 97],
  },
  {
    id: "strings-sliding-window-deep-dive",
    slug: "strings-sliding-window-deep-dive",
    title: "Strings & Sliding Window Deep Dive",
    subtitle: "Window expansion, contraction, hash frequencies & anagram groups",
    description: "Master the sliding window technique, character frequency maps, palindrome invariants, and substring parsing asked in live screen interviews.",
    targetCompanies: ["Amazon", "Microsoft", "Meta", "Adobe", "Salesforce"],
    targetRole: "Full-Stack & Frontend Engineer • Core Problem Solving",
    badgeColor: {
      border: "border-emerald-500/30 dark:border-emerald-500/40",
      bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      accent: "bg-emerald-500",
      ring: "focus-visible:ring-emerald-500/30",
      progressBar: "bg-emerald-600 dark:bg-emerald-400",
    },
    problemNumbers: [15, 17, 18, 21, 25, 34, 41, 42, 63, 67, 71, 75, 78, 80, 90, 94, 98, 99],
  },
  {
    id: "backtracking-recursion-essentials",
    slug: "backtracking-recursion-essentials",
    title: "Backtracking & Recursion Patterns",
    subtitle: "State-space trees, subset generation, permutations & grid traversals",
    description: "Learn the mental models behind recursive decision branches, prune conditions, backtracking state restorations, and constraint satisfaction.",
    targetCompanies: ["Google", "Microsoft", "Amazon", "Oracle", "Cisco"],
    targetRole: "Tier-1 Product SDE • Systems & Algorithms",
    badgeColor: {
      border: "border-rose-500/30 dark:border-rose-500/40",
      bg: "bg-rose-500/5 dark:bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-300",
      accent: "bg-rose-500",
      ring: "focus-visible:ring-rose-500/30",
      progressBar: "bg-rose-600 dark:bg-rose-400",
    },
    problemNumbers: [38, 40, 43, 44, 48, 74, 84, 85, 87, 91],
  },
  {
    id: "binary-search-matrix-mastery",
    slug: "binary-search-matrix-mastery",
    title: "Binary Search & Matrix Mastery",
    subtitle: "Rotated array pivots, answer spaces, and 2D grid searches",
    description: "Conquer O(log N) divide-and-conquer algorithms, condition boundaries, search in rotated sorted arrays, and 2D row/column ordered matrices.",
    targetCompanies: ["Google", "Amazon", "Bloomberg", "Morgan Stanley"],
    targetRole: "High-Frequency Trading & Tier-1 Backend Engineer",
    badgeColor: {
      border: "border-cyan-500/30 dark:border-cyan-500/40",
      bg: "bg-cyan-500/5 dark:bg-cyan-500/10",
      text: "text-cyan-700 dark:text-cyan-300",
      accent: "bg-cyan-500",
      ring: "focus-visible:ring-cyan-500/30",
      progressBar: "bg-cyan-600 dark:bg-cyan-400",
    },
    problemNumbers: [4, 7, 11, 12, 20, 23, 26, 30, 35, 37, 39, 45, 46, 68, 93],
  },
];

export function getTrackById(id: string): PrepTrack | undefined {
  return PREP_TRACKS.find((t) => t.id === id || t.slug === id);
}

export function isProblemInTrack(problemNumber: number, trackId: string): boolean {
  const track = getTrackById(trackId);
  return track ? track.problemNumbers.includes(problemNumber) : false;
}
