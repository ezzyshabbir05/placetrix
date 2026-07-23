"use client";

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";
import { UserProfile } from "@/lib/supabase/profile";
import {
  updateCandidatePersonalDetails,
  saveExperienceAction,
  deleteExperienceAction,
  saveProjectAction,
  deleteProjectAction,
  saveCertificationAction,
  deleteCertificationAction,
  updateCandidateBioAction,
  syncCandidateSkillsAction,
  updateCandidateAccountAction,
  updateCandidateEducationSectionAction,
  updateCandidateProfessionalLinksAction
} from "./actions";
import {
  CandidateEducation,
  CandidateExperience,
  CandidateProject,
  CandidateCertification,
  Skill
} from "@/types/profile-extensions";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput,
  ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem,
  ComboboxLabel, ComboboxList, ComboboxValue, useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import {
  Upload, Plus, Minus, Copy, CalendarIcon, Loader2, Camera,
  CheckCircle2, XCircle, AtSign, ShieldAlert, HelpCircle,
  Pencil, X, Info, CheckCircle, User, GraduationCap, Briefcase,
  Link2, Trash2, Edit2, FileText, Check, FileDown, Award, FolderGit2, Tag, Share2
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Constants ───────────────────────────────────────────────────────────────

// SOFTWARE_SKILLS replaced by dynamic skills fetched from the DB (allSkills prop)

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const GENDER_MAP: Record<string, string> = { Male: "M", Female: "F", Other: "O" };
const GENDER_REVERSE: Record<string, string> = { M: "Male", F: "Female", O: "Other" };
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));
const PASSOUT_YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() - 5 + i));
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const EDUCATION_LEVEL_OPTIONS = [
  "Class 10 (SSC)",
  "Class 12 (HSC)",
  "Diploma",
  "Undergraduate (UG)",
  "Postgraduate (PG)",
  "Other"
];

const EDUCATION_TYPE_LABELS: Record<string, string> = {
  ssc: "Class 10 (SSC)",
  hsc: "Class 12 (HSC)",
  diploma: "Diploma",
  ug: "Undergraduate (UG)",
  pg: "Postgraduate (PG)",
  other: "Other"
};

const EDUCATION_LABEL_TO_TYPE: Record<string, string> = {
  "Class 10 (SSC)": "ssc",
  "Class 12 (HSC)": "hsc",
  "Diploma": "diploma",
  "Undergraduate (UG)": "ug",
  "Postgraduate (PG)": "pg",
  "Other": "other"
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "account" | "personal" | "education" | "professional" | "bio";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged";

interface InstituteOption {
  id: string;
  institute_name: string;
  courses: string[] | null;
  affiliation: string | null;
}

interface EventCertificate {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
}

interface Props {
  userProfile: UserProfile;
  initialData: Record<string, any> | null;
  educationData: CandidateEducation[];
  experienceData: CandidateExperience[];
  projectsData: CandidateProject[];
  certificationsData: CandidateCertification[];
  eventCertificates?: EventCertificate[];
  allSkills: Skill[];
  initialSkillIds: string[];
  semestersCount?: number;
  courseConfigured?: boolean;
  allInstitutes?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RequiredMark() {
  return <span className="text-destructive ml-0.5">*</span>;
}

function getGraduationYearHint(selectedYear: string): string | null {
  if (!selectedYear) return null;
  const gradYear = Number(selectedYear);
  const currentYear = new Date().getFullYear();
  if (gradYear < currentYear) return `You graduated in ${gradYear}`;
  if (gradYear === currentYear) return `Graduating this year (${gradYear})`;
  return `Graduating in ${gradYear} — ${gradYear - currentYear} year${gradYear - currentYear > 1 ? "s" : ""} from now`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function ReadonlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">
        {value?.trim() ? value : <span className="text-muted-foreground font-normal">—</span>}
      </p>
    </div>
  );
}

function SectionComplete() {
  return (
    <Badge variant="secondary" className="h-8 px-3 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
      <CheckCircle className="h-3.5 w-3.5" />
      Complete
    </Badge>
  );
}

function SectionIncomplete() {
  return (
    <Badge variant="outline" className="h-8 px-3 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
      <Info className="h-3.5 w-3.5" />
      Not filled
    </Badge>
  );
}

function capitalizeFirstLetterOnly(str: string): string {
  if (!str) return str;
  const sanitized = str.replace(/[<>]/g, '');
  if (!sanitized) return sanitized;
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(str: string): Date {
  return new Date(`${str}T00:00:00`);
}

function getInitials(firstName: string, lastName: string, email: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  return email[0]?.toUpperCase() ?? "?";
}

const SUPPORTED_DEVICONS = new Set([
  "cplusplus", "csharp", "fsharp", "amazonwebservices", "googlecloud", "azure",
  "tailwindcss", "nodejs", "nextjs", "react", "vuejs", "angular", "spring",
  "express", "postgresql", "mysql", "mongodb", "redis",
  "sqlite", "mariadb", "html5", "css3", "sass", "git", "github", "gitlab",
  "docker", "kubernetes", "terraform", "jenkins", "ansible", "figma", "photoshop",
  "illustrator", "xd", "premierepro", "python", "java", "kotlin", "scala", "swift",
  "objectivec", "ruby", "rails", "php", "go", "rust", "dart", "flutter",
  "typescript", "javascript", "bash", "linux", "ubuntu", "android", "apple",
  "wordpress", "jira", "slack", "trello", "graphql", "webpack",
  "babel", "gulp", "npm", "yarn", "postman", "django", "flask", "laravel",
  "symfony", "bootstrap",
  "apachespark", "matplotlib", "numpy", "opencv", "pandas", "pytorch", "tensorflow",
  "cassandra", "cloudflare", "dynamodb", "elasticsearch", "firebase", "heroku",
  "netlify", "oracle", "supabase", "vercel", "canva", "chakraui", "fastapi",
  "fastify", "grpc", "ionic", "materialui", "nestjs", "nuxt", "redux", "c",
  "matlab", "powershell", "r", "bitbucket", "confluence", "githubactions",
  "jest", "junit", "nginx", "pytest", "selenium", "swagger", "vite", "cypressio",
  "svelte"
]);

const DEVICON_SUFFIXES: Record<string, string> = {
  "express": "original",
  "tensorflow": "original",
  "ionic": "original"
};

function getSkillIconClass(skillName: string): string | null {
  const normalized = skillName.toLowerCase().trim();

  const map: Record<string, string> = {
    "c++": "cplusplus",
    "c#": "csharp",
    "f#": "fsharp",
    "aws": "amazonwebservices",
    "amazon web services": "amazonwebservices",
    "google cloud": "googlecloud",
    "gcp": "googlecloud",
    "microsoft azure": "azure",
    "azure": "azure",
    "tailwind css": "tailwindcss",
    "tailwind": "tailwindcss",
    "node.js": "nodejs",
    "node": "nodejs",
    "next.js": "nextjs",
    "next": "nextjs",
    "react.js": "react",
    "react js": "react",
    "vue.js": "vuejs",
    "vue js": "vuejs",
    "vue": "vuejs",
    "angular.js": "angularjs",
    "angular": "angular",
    "spring boot": "spring",
    "express.js": "express",
    "expressjs": "express",
    "express": "express",
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "sql server": "microsoftsqlserver",
    "mysql": "mysql",
    "mongodb": "mongodb",
    "redis": "redis",
    "sqlite": "sqlite",
    "mariadb": "mariadb",
    "html": "html5",
    "html5": "html5",
    "css": "css3",
    "css3": "css3",
    "sass": "sass",
    "scss": "sass",
    "git": "git",
    "github": "github",
    "gitlab": "gitlab",
    "docker": "docker",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "terraform": "terraform",
    "jenkins": "jenkins",
    "ansible": "ansible",
    "figma": "figma",
    "photoshop": "photoshop",
    "illustrator": "illustrator",
    "xd": "xd",
    "adobe xd": "xd",
    "premiere pro": "premierepro",
    "premiere": "premierepro",
    "python": "python",
    "java": "java",
    "kotlin": "kotlin",
    "scala": "scala",
    "swift": "swift",
    "objective-c": "objectivec",
    "objective c": "objectivec",
    "ruby": "ruby",
    "rails": "rails",
    "ruby on rails": "rails",
    "php": "php",
    "go": "go",
    "golang": "go",
    "rust": "rust",
    "dart": "dart",
    "flutter": "flutter",
    "typescript": "typescript",
    "ts": "typescript",
    "javascript": "javascript",
    "js": "javascript",
    "apache spark": "apachespark",
    "matplotlib": "matplotlib",
    "numpy": "numpy",
    "opencv": "opencv",
    "pandas": "pandas",
    "pytorch": "pytorch",
    "tensorflow": "tensorflow",
    "cassandra": "cassandra",
    "cloudflare": "cloudflare",
    "dynamodb": "dynamodb",
    "elasticsearch": "elasticsearch",
    "firebase": "firebase",
    "heroku": "heroku",
    "netlify": "netlify",
    "oracle": "oracle",
    "supabase": "supabase",
    "vercel": "vercel",
    "canva": "canva",
    "chakra ui": "chakraui",
    "fastapi": "fastapi",
    "fastify": "fastify",
    "grpc": "grpc",
    "ionic": "ionic",
    "material ui": "materialui",
    "nestjs": "nestjs",
    "nuxt.js": "nuxt",
    "nuxt": "nuxt",
    "redux": "redux",
    "sveltekit": "svelte",
    "c": "c",
    "matlab": "matlab",
    "powershell": "powershell",
    "r": "r",
    "bitbucket": "bitbucket",
    "confluence": "confluence",
    "github actions": "githubactions",
    "jest": "jest",
    "junit": "junit",
    "nginx": "nginx",
    "pytest": "pytest",
    "selenium": "selenium",
    "swagger": "swagger",
    "vite": "vite",
    "cypress": "cypressio",
  };

  const resolved = map[normalized] || normalized.replace(/\s+/g, "");
  return SUPPORTED_DEVICONS.has(resolved) ? resolved : null;
}

function SkillIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = getSkillIconClass(name);

  // Align sizes dynamically based on target classes
  let sizeClass = "w-4 h-4 text-base"; // default 16px
  if (className?.includes("text-[11px]") || className?.includes("text-[10px]") || className?.includes("text-[10px]")) {
    sizeClass = "w-[11px] h-[11px] text-[11px]";
  } else if (className?.includes("text-base")) {
    sizeClass = "w-4 h-4 text-base";
  }

  // Strip text-size classes from the className to avoid duplicates/conflicts
  const cleanClassName = className
    ?.replace(/\btext-(?:base|lg|sm|xs|\[11px\]|\[10px\])\b/g, "")
    ?.trim();

  if (iconClass) {
    const suffix = DEVICON_SUFFIXES[iconClass] || "plain";
    return (
      <span className={cn("inline-flex items-center justify-center shrink-0 text-muted-foreground", sizeClass, cleanClassName)}>
        <i className={`devicon-${iconClass}-${suffix}`} style={{ fontSize: "inherit", lineHeight: 1 }} />
      </span>
    );
  }

  return (
    <Tag className={cn("text-muted-foreground shrink-0", sizeClass, cleanClassName)} />
  );
}

function getStorageUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string | null
): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "available") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "taken" || status === "invalid") return <XCircle className="h-4 w-4 text-destructive" />;
  return null;
}

function usernameStatusMessage(status: UsernameStatus): { text: string; className: string } | null {
  if (status === "checking") return { text: "Checking availability…", className: "text-muted-foreground" };
  if (status === "available") return { text: "Username is available!", className: "text-emerald-600 dark:text-emerald-400" };
  if (status === "taken") return { text: "Username is already taken.", className: "text-destructive" };
  if (status === "invalid") return { text: "3–20 characters: letters, numbers, underscores only.", className: "text-destructive" };
  if (status === "unchanged") return { text: "This is your current username.", className: "text-muted-foreground" };
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandidateProfileClient({
  userProfile,
  initialData,
  educationData,
  experienceData,
  projectsData,
  certificationsData,
  eventCertificates = [],
  allSkills,
  initialSkillIds,
  semestersCount = 8,
  courseConfigured = true,
  allInstitutes = []
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("incomplete") === "true") {
      toast.error("Profile Incomplete", {
        description: "Please fill in all mandatory fields to unlock all features of Placetrix.",
        id: "profile-incomplete-toast",
      });
    }
  }, [searchParams]);

  const isFirstTime = !userProfile.profile_updated;
  const [editingSection, setEditingSection] = useState<SectionId | null>(
    isFirstTime ? "personal" : null
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Username
  const [username, setUsername] = useState(userProfile.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialUsername = useRef(userProfile.username ?? "");

  // Avatar
  const storedImagePath = useRef<string | null>(userProfile.avatar_path ?? null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(
    getStorageUrl(supabase, "avatars", storedImagePath.current)
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Personal
  const [firstName, setFirstName] = useState(capitalizeFirstLetterOnly(initialData?.first_name ?? ""));
  const [middleName, setMiddleName] = useState(capitalizeFirstLetterOnly(initialData?.middle_name ?? ""));
  const [lastName, setLastName] = useState(capitalizeFirstLetterOnly(initialData?.last_name ?? ""));
  const [gender, setGender] = useState(
    initialData?.gender ? GENDER_REVERSE[initialData.gender] ?? "" : ""
  );
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phone_number ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    initialData?.date_of_birth ? parseLocalDate(initialData.date_of_birth) : undefined
  );
  const [dobOpen, setDobOpen] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState(initialData?.aadhaar_number ?? "");
  const [currentAddress, setCurrentAddress] = useState(initialData?.current_address ?? "");
  const [permanentAddress, setPermanentAddress] = useState(initialData?.permanent_address ?? "");

  // Bio
  const [bio, setBio] = useState(initialData?.bio ?? "");

  // Education Records extraction
  const sscRecord = educationData?.find(e => e.type === "ssc");
  const hscRecord = educationData?.find(e => e.type === "hsc");
  const diplomaRecord = educationData?.find(e => e.type === "diploma");

  const [instituteId, setInstituteId] = useState<string>(userProfile.institute_id ?? "");
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [tempFileName, setTempFileName] = useState("");

  useEffect(() => {
    return () => {
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
      }
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
    };
  }, [tempImageSrc, pendingAvatarPreview]);

  const [instituteName, setInstituteName] = useState("");
  const [courseName, setCourseName] = useState(initialData?.course_name ?? "");
  const [passoutYear, setPassoutYear] = useState(
    initialData?.passout_year ? String(initialData.passout_year) : ""
  );
  const [universityPrn, setUniversityPrn] = useState(initialData?.university_prn ?? "");

  // SSC Details
  const [sscPercentage, setSscPercentage] = useState(
    sscRecord?.grade_or_percentage != null ? Number(sscRecord.grade_or_percentage).toFixed(2) : ""
  );
  const [sscPassYear, setSscPassYear] = useState(
    sscRecord?.passout_year ? String(sscRecord.passout_year) : ""
  );
  const [sscInstitution, setSscInstitution] = useState(
    sscRecord?.institution_name || ""
  );

  // HSC Details
  const [isHsc, setIsHsc] = useState(!!hscRecord);
  const [hscPercentage, setHscPercentage] = useState(
    hscRecord?.grade_or_percentage != null ? Number(hscRecord.grade_or_percentage).toFixed(2) : ""
  );
  const [hscPassYear, setHscPassYear] = useState(
    hscRecord?.passout_year ? String(hscRecord.passout_year) : ""
  );
  const [hscInstitution, setHscInstitution] = useState(
    hscRecord?.institution_name || ""
  );

  // Diploma Details
  const [isDiploma, setIsDiploma] = useState(!!diplomaRecord);
  const [diplomaPercentage, setDiplomaPercentage] = useState(
    diplomaRecord?.grade_or_percentage != null ? Number(diplomaRecord.grade_or_percentage).toFixed(2) : ""
  );
  const [diplomaPassYear, setDiplomaPassYear] = useState(
    diplomaRecord?.passout_year ? String(diplomaRecord.passout_year) : ""
  );
  const [diplomaInstitution, setDiplomaInstitution] = useState(
    diplomaRecord?.institution_name || ""
  );

  // Load semester SGPAs from JSONB array
  const [sgpaValues, setSgpaValues] = useState<string[]>(
    Array.from({ length: semestersCount }, (_, i) => {
      const val = initialData?.sgpa_semesters?.[i];
      return val != null && val !== 0 && val !== "" ? (typeof val === "number" ? val.toFixed(2) : Number(val).toFixed(2)) : "";
    })
  );
  const [currentSemestersCount, setCurrentSemestersCount] = useState<number>(semestersCount);

  const calculatedCgpa = useMemo(() => {
    const validSgpas = sgpaValues
      .map(v => v ? parseFloat(v) : null)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (validSgpas.length === 0) return null;
    const sum = validSgpas.reduce((acc, val) => acc + val, 0);
    return sum / validSgpas.length;
  }, [sgpaValues]);

  // Experiences list and dialog
  const [experiences, setExperiences] = useState<CandidateExperience[]>(experienceData || []);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [activeExperience, setActiveExperience] = useState<Partial<CandidateExperience> | null>(null);

  // Projects list and dialog
  const [projects, setProjects] = useState<CandidateProject[]>(projectsData || []);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Partial<CandidateProject> | null>(null);

  // Certifications list and dialog
  const [certifications, setCertifications] = useState<CandidateCertification[]>(certificationsData || []);
  const [certificationDialogOpen, setCertificationDialogOpen] = useState(false);
  const [activeCertification, setActiveCertification] = useState<Partial<CandidateCertification> | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [pendingCertFile, setPendingCertFile] = useState<File | null>(null);



  useEffect(() => {
    setExperiences(experienceData || []);
  }, [experienceData]);

  useEffect(() => {
    setProjects(projectsData || []);
  }, [projectsData]);

  useEffect(() => {
    setCertifications(certificationsData || []);
  }, [certificationsData]);

  // Professional — skill IDs (UUIDs from candidate_skills table)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(initialSkillIds ?? []);

  // DB-driven grouped skills for read-only view
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    const selectedSet = new Set(selectedSkillIds);
    allSkills.forEach((skill) => {
      if (!selectedSet.has(skill.id)) return;
      if (!groups[skill.category]) groups[skill.category] = [];
      groups[skill.category].push(skill);
    });
    return groups;
  }, [selectedSkillIds, allSkills]);

  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url ?? "");
  const [githubUrl, setGithubUrl] = useState(initialData?.github_url ?? "");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(
    initialData?.portfolio_links?.length ? initialData.portfolio_links : [""]
  );

  // Institute lookup
  const [institutes, setInstitutes] = useState<InstituteOption[]>(allInstitutes);
  const [availableCoursesData, setAvailableCoursesData] = useState<{ id: string; course_name: string; semesters_count: number }[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [selectedAffiliation, setSelectedAffiliation] = useState<string | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const skillsAnchor = useComboboxAnchor();
  const projectSkillsAnchor = useComboboxAnchor();
  const defaultDobDate = new Date(2000, 0, 1);

  // Section completeness (from server data)
  const accountComplete = !!(userProfile.username?.trim());
  const personalComplete = !!(
    initialData?.first_name && initialData?.middle_name && initialData?.last_name &&
    initialData?.gender && initialData?.phone_number && initialData?.date_of_birth
  );
  const educationComplete = !!(
    userProfile.institute_id && initialData?.course_name &&
    initialData?.passout_year &&
    sscPercentage && sscPassYear && sscInstitution &&
    ((isHsc && hscPercentage && hscPassYear && hscInstitution) ||
      (isDiploma && diplomaPercentage && diplomaPassYear && diplomaInstitution))
  );
  const professionalComplete = !!(initialSkillIds?.length > 0);

  // ─── Username debounce ───────────────────────────────────────────────────────

  function handleUsernameChange(value: string) {
    const trimmed = value.trim();
    setUsername(trimmed);
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    if (!trimmed) { setUsernameStatus("idle"); return; }
    if (trimmed === initialUsername.current) { setUsernameStatus("unchanged"); return; }
    if (!USERNAME_REGEX.test(trimmed)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    usernameDebounceRef.current = setTimeout(async () => {
      const { data, error } = await (supabase as any).rpc("check_username_available", {
        p_username: trimmed,
        p_user_id: userProfile.id,
      });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data === true ? "available" : "taken");
    }, 500);
  }

  useEffect(() => {
    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, []);

  // ─── Load institutes ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (allInstitutes && allInstitutes.length > 0) {
      setInstitutes(allInstitutes);
      if (userProfile.institute_id) {
        const found = allInstitutes.find((i: any) => i.id === userProfile.institute_id);
        if (found) {
          setInstituteName(found.institute_name);
          setSelectedAffiliation(found.affiliation ?? null);
        }
      }
    } else {
      (async () => {
        const { data } = await (supabase as any)
          .from("institutes")
          .select("id, institute_name, affiliation")
          .order("institute_name");
        if (data) {
          setInstitutes(data);
          if (userProfile.institute_id) {
            const found = data.find((i: any) => i.id === userProfile.institute_id);
            if (found) {
              setInstituteName(found.institute_name);
              setSelectedAffiliation(found.affiliation ?? null);
            }
          }
        }
      })();
    }
  }, [allInstitutes, userProfile.institute_id]);

  useEffect(() => {
    if (instituteId) {
      (async () => {
        const { data } = await (supabase as any)
          .from("institute_courses")
          .select("id, course_name, semesters_count")
          .eq("institute_id", instituteId)
          .order("course_name");
        if (data) {
          setAvailableCoursesData(data);
          setAvailableCourses(data.map((c: any) => c.course_name));
        } else {
          setAvailableCoursesData([]);
          setAvailableCourses([]);
        }
      })();
    } else {
      setAvailableCoursesData([]);
      setAvailableCourses([]);
    }
  }, [instituteId]);

  // Sync state when userProfile.institute_id updates from router.refresh()
  useEffect(() => {
    if (userProfile.institute_id && institutes.length > 0) {
      const found = institutes.find((i) => i.id === userProfile.institute_id);
      if (found && found.id !== instituteId) {
        setInstituteId(found.id);
        setInstituteName(found.institute_name);
        setSelectedAffiliation(found.affiliation ?? null);
      }
    }
  }, [userProfile.institute_id, institutes]);

  useEffect(() => {
    const found = institutes.find((i) => i.id === instituteId);
    if (found) {
      setSelectedAffiliation(found.affiliation ?? null);
    }
  }, [instituteId, institutes]);

  useEffect(() => {
    if (availableCourses.length > 0 && courseName && !availableCourses.includes(courseName)) {
      setCourseName("");
    }
  }, [availableCourses]);

  useEffect(() => {
    const matched = availableCoursesData.find(c => c.course_name === courseName);
    if (matched) {
      setCurrentSemestersCount(matched.semesters_count);
    } else {
      setCurrentSemestersCount(semestersCount);
    }
  }, [courseName, availableCoursesData, semestersCount]);

  useEffect(() => {
    setSgpaValues(prev => {
      if (prev.length === currentSemestersCount) return prev;
      return Array.from({ length: currentSemestersCount }, (_, i) => prev[i] || "");
    });
  }, [currentSemestersCount]);

  const isCourseConfigured = useMemo(() => {
    if (!courseName) return true;
    if (availableCoursesData.length === 0) return courseConfigured;
    return availableCoursesData.some(c => c.course_name === courseName);
  }, [courseName, availableCoursesData, courseConfigured]);

  // ─── Section open/close ──────────────────────────────────────────────────────

  // ─── Section change detectors ──────────────────────────────────────────────

  function hasAccountChanges(): boolean {
    return username !== (userProfile.username ?? "");
  }

  function hasBioChanges(): boolean {
    return bio !== (initialData?.bio ?? "");
  }

  function hasPersonalChanges(): boolean {
    const origFirstName = capitalizeFirstLetterOnly(initialData?.first_name ?? "");
    const origMiddleName = capitalizeFirstLetterOnly(initialData?.middle_name ?? "");
    const origLastName = capitalizeFirstLetterOnly(initialData?.last_name ?? "");
    const origGender = initialData?.gender ? GENDER_REVERSE[initialData.gender] ?? "" : "";
    const origPhone = initialData?.phone_number ?? "";
    const origDob = initialData?.date_of_birth ? parseLocalDate(initialData.date_of_birth) : undefined;
    const origAadhaar = initialData?.aadhaar_number ?? "";
    const origCurrentAddr = initialData?.current_address ?? "";
    const origPermAddr = initialData?.permanent_address ?? "";

    const dobTime = dateOfBirth ? toLocalDateString(dateOfBirth) : "";
    const origDobTime = origDob ? toLocalDateString(origDob) : "";

    return (
      firstName !== origFirstName ||
      middleName !== origMiddleName ||
      lastName !== origLastName ||
      gender !== origGender ||
      phoneNumber !== origPhone ||
      dobTime !== origDobTime ||
      aadhaarNumber !== origAadhaar ||
      currentAddress !== origCurrentAddr ||
      permanentAddress !== origPermAddr
    );
  }

  function hasProfessionalChanges(): boolean {
    const origLinkedin = initialData?.linkedin_url ?? "";
    const origGithub = initialData?.github_url ?? "";
    const origPortfolio = initialData?.portfolio_links ?? [""];

    const origSet = new Set(initialSkillIds);
    const currSet = new Set(selectedSkillIds);
    const skillsEqual = origSet.size === currSet.size && [...origSet].every((id) => currSet.has(id));

    const portfolioEqual =
      portfolioLinks.length === origPortfolio.length &&
      portfolioLinks.every((l, i) => l === origPortfolio[i]);

    return (
      !skillsEqual ||
      linkedinUrl !== origLinkedin ||
      githubUrl !== origGithub ||
      !portfolioEqual
    );
  }

  function hasEducationChanges(): boolean {
    const origInstId = userProfile.institute_id ?? "";
    const origCourse = initialData?.course_name ?? "";
    const origPassout = initialData?.passout_year ? String(initialData.passout_year) : "";
    const origPrn = initialData?.university_prn ?? "";

    const origSscPct = sscRecord?.grade_or_percentage != null ? Number(sscRecord.grade_or_percentage).toFixed(2) : "";
    const origSscYear = sscRecord?.passout_year ? String(sscRecord.passout_year) : "";
    const origSscInst = sscRecord?.institution_name || "";

    const origIsHsc = !!hscRecord;
    const origHscPct = hscRecord?.grade_or_percentage != null ? Number(hscRecord.grade_or_percentage).toFixed(2) : "";
    const origHscYear = hscRecord?.passout_year ? String(hscRecord.passout_year) : "";
    const origHscInst = hscRecord?.institution_name || "";

    const origIsDiploma = !!diplomaRecord;
    const origDipPct = diplomaRecord?.grade_or_percentage != null ? Number(diplomaRecord.grade_or_percentage).toFixed(2) : "";
    const origDipYear = diplomaRecord?.passout_year ? String(diplomaRecord.passout_year) : "";
    const origDipInst = diplomaRecord?.institution_name || "";

    const origSgpas = Array.from({ length: currentSemestersCount }, (_, i) => {
      const val = initialData?.sgpa_semesters?.[i];
      return val != null && val !== 0 && val !== "" ? (typeof val === "number" ? val.toFixed(2) : Number(val).toFixed(2)) : "";
    });
    const sgpaEqual = sgpaValues.length === origSgpas.length && sgpaValues.every((val, i) => val === origSgpas[i]);

    const numOrEmpty = (v: string) => v ? parseFloat(v) : null;

    return (
      instituteId !== origInstId ||
      courseName !== origCourse ||
      passoutYear !== origPassout ||
      universityPrn !== origPrn ||
      numOrEmpty(sscPercentage) !== numOrEmpty(origSscPct) ||
      sscPassYear !== origSscYear ||
      sscInstitution !== origSscInst ||
      isHsc !== origIsHsc ||
      numOrEmpty(hscPercentage) !== numOrEmpty(origHscPct) ||
      hscPassYear !== origHscYear ||
      hscInstitution !== origHscInst ||
      isDiploma !== origIsDiploma ||
      numOrEmpty(diplomaPercentage) !== numOrEmpty(origDipPct) ||
      diplomaPassYear !== origDipYear ||
      diplomaInstitution !== origDipInst ||
      !sgpaEqual
    );
  }

  // ─── Section open/close ──────────────────────────────────────────────────────

  function openSection(section: SectionId) {
    if (editingSection && editingSection !== section) {
      let hasChanges = false;
      if (editingSection === "account") hasChanges = hasAccountChanges();
      else if (editingSection === "personal") hasChanges = hasPersonalChanges();
      else if (editingSection === "education") hasChanges = hasEducationChanges();
      else if (editingSection === "professional") hasChanges = hasProfessionalChanges();
      else if (editingSection === "bio") hasChanges = hasBioChanges();

      if (hasChanges) {
        const confirmDiscard = window.confirm("You have unsaved changes in the current section. Discard changes and proceed?");
        if (!confirmDiscard) return;
      }
      cancelSection(editingSection);
    }
    setErrors({});
    setEditingSection(section);
  }

  function cancelSection(section: SectionId) {
    let hasChanges = false;
    if (section === "account") hasChanges = hasAccountChanges();
    else if (section === "personal") hasChanges = hasPersonalChanges();
    else if (section === "education") hasChanges = hasEducationChanges();
    else if (section === "professional") hasChanges = hasProfessionalChanges();
    else if (section === "bio") hasChanges = hasBioChanges();

    if (hasChanges) {
      const confirmCancel = window.confirm("Are you sure you want to discard your unsaved changes?");
      if (!confirmCancel) return;
    }

    setErrors({});
    if (section === "account") {
      setUsername(userProfile.username ?? "");
      setUsernameStatus("idle");
    } else if (section === "personal") {
      setFirstName(capitalizeFirstLetterOnly(initialData?.first_name ?? ""));
      setMiddleName(capitalizeFirstLetterOnly(initialData?.middle_name ?? ""));
      setLastName(capitalizeFirstLetterOnly(initialData?.last_name ?? ""));
      setGender(initialData?.gender ? GENDER_REVERSE[initialData.gender] ?? "" : "");
      setPhoneNumber(initialData?.phone_number ?? "");
      setDateOfBirth(initialData?.date_of_birth ? parseLocalDate(initialData.date_of_birth) : undefined);
      setAadhaarNumber(initialData?.aadhaar_number ?? "");
      setCurrentAddress(initialData?.current_address ?? "");
      setPermanentAddress(initialData?.permanent_address ?? "");
    } else if (section === "education") {
      const oldInst = institutes.find(i => i.id === (userProfile.institute_id ?? ""));
      setInstituteId(userProfile.institute_id ?? "");
      setInstituteName(oldInst ? oldInst.institute_name : "");
      setCourseName(initialData?.course_name ?? "");
      setPassoutYear(initialData?.passout_year ? String(initialData.passout_year) : "");
      setSscPercentage(sscRecord?.grade_or_percentage != null ? Number(sscRecord.grade_or_percentage).toFixed(2) : "");
      setSscPassYear(sscRecord?.passout_year ? String(sscRecord.passout_year) : "");
      setSscInstitution(sscRecord?.institution_name || "");
      setIsHsc(!!hscRecord);
      setHscPercentage(hscRecord?.grade_or_percentage != null ? Number(hscRecord.grade_or_percentage).toFixed(2) : "");
      setHscPassYear(hscRecord?.passout_year ? String(hscRecord.passout_year) : "");
      setHscInstitution(hscRecord?.institution_name || "");
      setIsDiploma(!!diplomaRecord);
      setDiplomaPercentage(diplomaRecord?.grade_or_percentage != null ? Number(diplomaRecord.grade_or_percentage).toFixed(2) : "");
      setDiplomaPassYear(diplomaRecord?.passout_year ? String(diplomaRecord.passout_year) : "");
      setDiplomaInstitution(diplomaRecord?.institution_name || "");
      setUniversityPrn(initialData?.university_prn ?? "");
      setSgpaValues(Array.from({ length: currentSemestersCount }, (_, i) => {
        const val = initialData?.sgpa_semesters?.[i];
        return val != null && val !== 0 && val !== "" ? (typeof val === "number" ? val.toFixed(2) : Number(val).toFixed(2)) : "";
      }));
    } else if (section === "professional") {
      setSelectedSkillIds(initialSkillIds ?? []);
      setLinkedinUrl(initialData?.linkedin_url ?? "");
      setGithubUrl(initialData?.github_url ?? "");
      setPortfolioLinks(initialData?.portfolio_links?.length ? initialData.portfolio_links : [""]);
    } else if (section === "bio") {
      setBio(initialData?.bio ?? "");
    }
    setEditingSection(null);
  }

  // ─── Avatar upload ───────────────────────────────────────────────────────────

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setTempImageSrc(blobUrl);
    setTempFileName(file.name);
    setCropModalOpen(true);
  }

  const handleCropModalClose = () => {
    setCropModalOpen(false);
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc);
      setTempImageSrc(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  async function handleCroppedAvatarUpload(croppedFile: File) {
    const localPreviewUrl = URL.createObjectURL(croppedFile);
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }
    setPendingAvatarPreview(localPreviewUrl);
    setPendingAvatarFile(croppedFile);
    setAvatarSrc(localPreviewUrl);
    setCropModalOpen(false);
    if (tempImageSrc) {
      URL.revokeObjectURL(tempImageSrc);
      setTempImageSrc(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  const handleCancelAvatarChange = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
      setPendingAvatarPreview(null);
    }
    setPendingAvatarFile(null);
    setAvatarSrc(getStorageUrl(supabase, "avatars", storedImagePath.current));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleSaveAvatar = async () => {
    if (!pendingAvatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const oldPath = storedImagePath.current;
      const timestamp = Date.now();
      const newPath = `candidates/${userProfile.id}/profile/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(newPath, pendingAvatarFile, {
        upsert: false,
        contentType: pendingAvatarFile.type,
      });
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any)
        .from("profiles")
        .update({ avatar_path: newPath })
        .eq("id", userProfile.id);
      if (dbError) throw dbError;

      await supabase.auth.updateUser({ data: { avatar_path: newPath } });

      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath]);
        if (deleteError) console.warn("Could not delete old avatar:", deleteError.message);
      }

      storedImagePath.current = newPath;
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath);
      setAvatarSrc(`${newPublicUrl}?v=${timestamp}`);
      toast.success("Profile picture updated!");
      setPendingAvatarFile(null);
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
        setPendingAvatarPreview(null);
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ─── Institute select ────────────────────────────────────────────────────────

  function handleInstituteSelect(name: string | null) {
    if (!name) {
      setInstituteId(""); setInstituteName(""); setAvailableCourses([]); setSelectedAffiliation(null); return;
    }
    const found = institutes.find((i) => i.institute_name === name);
    if (found) {
      setInstituteId(found.id);
      setInstituteName(found.institute_name);
      setAvailableCourses(found.courses ?? []);
      setSelectedAffiliation(found.affiliation ?? null);
    }
  }

  // ─── SGPA ────────────────────────────────────────────────────────────────────

  function handleSgpaChange(index: number, value: string) {
    setSgpaValues((prev) => { const u = [...prev]; u[index] = value; return u; });
  }

  // ─── Portfolio links ─────────────────────────────────────────────────────────

  function addPortfolioLink() { setPortfolioLinks((prev) => [...prev, ""]); }
  function handlePortfolioLinkChange(index: number, value: string) {
    setPortfolioLinks((prev) => {
      const u = [...prev];
      u[index] = value.replace(/[<>]/g, '').slice(0, 200);
      return u;
    });
  }
  function removePortfolioLink(index: number) {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Validation ───────────────────────────────────────────────────────────────

  function validateAccount(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!username.trim()) {
      e.username = "Username is required.";
    } else if (!USERNAME_REGEX.test(username)) {
      e.username = "3–20 characters: letters, numbers, and underscores only.";
    }
    if (usernameStatus === "taken") e.username = "This username is already taken.";
    if (usernameStatus === "checking") e.username = "Please wait for username availability check.";
    return e;
  }

  function validatePersonal(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!firstName.trim()) {
      e.firstName = "First name is required";
    } else if (!/^[a-zA-Z]+$/.test(firstName.trim())) {
      e.firstName = "First name must contain only alphabets";
    } else if (firstName.trim().length < 2) {
      e.firstName = "First name must be at least 2 characters";
    } else if (firstName.trim().length > 50) {
      e.firstName = "First name cannot exceed 50 characters";
    }

    if (!middleName.trim()) {
      e.middleName = "Middle name is required";
    } else if (!/^[a-zA-Z]+$/.test(middleName.trim())) {
      e.middleName = "Middle name must contain only alphabets";
    } else if (middleName.trim().length > 50) {
      e.middleName = "Middle name cannot exceed 50 characters";
    }

    if (!lastName.trim()) {
      e.lastName = "Last name is required";
    } else if (!/^[a-zA-Z]+$/.test(lastName.trim())) {
      e.lastName = "Last name must contain only alphabets";
    } else if (lastName.trim().length < 2) {
      e.lastName = "Last name must be at least 2 characters";
    } else if (lastName.trim().length > 50) {
      e.lastName = "Last name cannot exceed 50 characters";
    }

    if (!gender) e.gender = "Gender is required";
    if (!phoneNumber.trim()) e.phoneNumber = "Contact number is required";
    else if (!/^[0-9]{10}$/.test(phoneNumber)) e.phoneNumber = "Must be exactly 10 digits";
    if (!dateOfBirth) {
      e.dateOfBirth = "Date of birth is required";
    } else {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (dobDate > today) {
        e.dateOfBirth = "Date of birth cannot be in the future.";
      } else {
        const minAgeDate = new Date();
        minAgeDate.setFullYear(today.getFullYear() - 15);
        if (dobDate > minAgeDate) {
          e.dateOfBirth = "Candidate must be at least 15 years old.";
        }
      }
    }
    if (aadhaarNumber && !aadhaarNumber.includes("*") && !/^[0-9]{12}$/.test(aadhaarNumber))
      e.aadhaarNumber = "Aadhaar must be exactly 12 digits";
    return e;
  }

  function validateEducation(): Record<string, string> {
    const e: Record<string, string> = {};

    // College / Institute — always required
    if (!instituteId) e.instituteId = "Please select your college / institution.";
    if (!courseName.trim()) e.courseName = "Branch / course is required.";
    if (!passoutYear) e.passoutYear = "Expected graduation year is required.";

    // SSC Validation
    if (!sscPercentage) {
      e.sscPercentage = "SSC percentage is required";
    } else {
      const sscPct = parseFloat(sscPercentage);
      if (isNaN(sscPct) || sscPct < 0 || sscPct > 100) {
        e.sscPercentage = "SSC percentage must be between 0 and 100.";
      }
    }
    if (!sscPassYear) e.sscPassYear = "SSC passing year is required";
    if (!sscInstitution.trim()) e.sscInstitution = "SSC school name is required";

    // HSC/Diploma selection validation
    if (!isHsc && !isDiploma) {
      e.educationAfterSsc = "Select at least one option (HSC or Diploma)";
    }

    if (isHsc) {
      if (!hscPercentage) {
        e.hscPercentage = "HSC percentage is required";
      } else {
        const hscPct = parseFloat(hscPercentage);
        if (isNaN(hscPct) || hscPct < 0 || hscPct > 100) {
          e.hscPercentage = "HSC percentage must be between 0 and 100.";
        }
      }
      if (!hscPassYear) e.hscPassYear = "HSC passing year is required";
      if (!hscInstitution.trim()) e.hscInstitution = "HSC college name is required";
    }

    if (isDiploma) {
      if (!diplomaPercentage) {
        e.diplomaPercentage = "Diploma percentage is required";
      } else {
        const dipPct = parseFloat(diplomaPercentage);
        if (isNaN(dipPct) || dipPct < 0 || dipPct > 100) {
          e.diplomaPercentage = "Diploma percentage must be between 0 and 100.";
        }
      }
      if (!diplomaPassYear) e.diplomaPassYear = "Diploma passing year is required";
      if (!diplomaInstitution.trim()) e.diplomaInstitution = "Diploma institute name is required";
    }

    if (universityPrn.trim()) {
      if (universityPrn.trim().length > 50) {
        e.universityPrn = "University PRN cannot exceed 50 characters.";
      } else if (!/^[a-zA-Z0-9\s\-/]+$/.test(universityPrn.trim())) {
        e.universityPrn = "University PRN can only contain letters, numbers, spaces, hyphens, and slashes.";
      }
    }

    // Validate SGPAs
    sgpaValues.forEach((val, i) => {
      if (val) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 10) {
          e.sgpa = `SGPA for Sem ${i + 1} must be a valid number between 0.00 and 10.00.`;
        }
      }
    });

    return e;
  }

  function validateProfessional(): Record<string, string> {
    const e: Record<string, string> = {};
    if (selectedSkillIds.length === 0) e.skills = "Select at least one skill";

    if (linkedinUrl.trim() && !/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/i.test(linkedinUrl)) {
      e.linkedinUrl = "Please enter a valid LinkedIn URL.";
    }
    if (githubUrl.trim() && !/^(https?:\/\/)?(www\.)?github\.com\/.*$/i.test(githubUrl)) {
      e.githubUrl = "Please enter a valid GitHub URL.";
    }

    const invalidLinks = portfolioLinks.filter(l => l.trim() && !/^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*$/i.test(l));
    if (invalidLinks.length > 0) {
      e.portfolioLinks = "One or more portfolio links are invalid URLs.";
    }
    return e;
  }

  // ─── Per-section save ─────────────────────────────────────────────────────────

  function handleSaveSection(section: SectionId) {
    let newErrors: Record<string, string> = {};
    if (section === "account") newErrors = validateAccount();
    else if (section === "personal") newErrors = validatePersonal();
    else if (section === "education") newErrors = validateEducation();
    else if (section === "professional") newErrors = validateProfessional();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the validation errors before saving.");
      return;
    }

    startTransition(async () => {
      try {
        if (section === "account") {
          if (username.trim() !== (userProfile.username ?? "")) {
            try {
              await updateCandidateAccountAction(username);
              if (username.trim()) {
                initialUsername.current = username.trim();
                setUsernameStatus("unchanged");
              }
            } catch (error: any) {
              if (error.message.includes("taken")) {
                setErrors({ username: "This username is already taken." });
                setUsernameStatus("taken");
              } else {
                toast.error("Failed to update username. Please try again.");
              }
              return;
            }
          }
          toast.success("Account settings saved!");
        }

        else if (section === "personal") {
          const payload: Record<string, any> = {
            profile_id: userProfile.id,
            first_name: firstName.trim() || null,
            middle_name: middleName.trim() || null,
            last_name: lastName.trim() || null,
            gender: GENDER_MAP[gender] ?? null,
            phone_number: phoneNumber.trim() || null,
            date_of_birth: dateOfBirth ? toLocalDateString(dateOfBirth) : null,
            aadhaar_number: aadhaarNumber.trim() || null,
            current_address: currentAddress.trim() || null,
            permanent_address: permanentAddress.trim() || null,
          };
          await updateCandidatePersonalDetails(payload);

          const newFullName = [firstName.trim(), middleName.trim(), lastName.trim()]
            .filter(Boolean).join(" ") || userProfile.full_name;
          await supabase.auth.updateUser({ data: { full_name: newFullName, display_name: newFullName, account_type: userProfile.account_type } });
          toast.success("Personal details saved!");
        }

        else if (section === "education") {
          const matchedCourse = availableCoursesData.find(c => c.course_name === courseName);
          const courseId = matchedCourse?.id || null;

          await updateCandidateEducationSectionAction({
            courseId,
            passoutYear,
            universityPrn,
            instituteId,
            isCourseConfigured,
            sgpaValues,
            sscPercentage,
            sscPassYear,
            sscInstitution,
            isHsc,
            hscPercentage,
            hscPassYear,
            hscInstitution,
            isDiploma,
            diplomaPercentage,
            diplomaPassYear,
            diplomaInstitution
          });

          toast.success("Education details saved!");
        }

        else if (section === "bio") {
          await updateCandidateBioAction(bio);
          toast.success("About summary saved!");
        }

        else if (section === "professional") {
          // Save skills via candidate_skills table
          await syncCandidateSkillsAction(selectedSkillIds);

          // Save other professional details
          try {
            await updateCandidateProfessionalLinksAction({
              linkedin_url: linkedinUrl,
              github_url: githubUrl,
              portfolio_links: portfolioLinks
            });
            toast.success("Professional details saved!");
          } catch (error: any) {
            if (error.message.includes("Personal Details first")) {
              toast.error("Please save Personal Details first.");
            } else {
              toast.error("Failed to save professional details. Please try again.");
            }
          }
        }

        setErrors({});
        setEditingSection(null);
        router.refresh();
      } catch (err: any) {
        console.error("Save error:", err);
        toast.error(err?.message || "Failed to save. Please try again.");
      }
    });
  }

  // ─── Bio and Sub-table Handlers ──────────────────────────────────────────────



  const handleAddExperience = () => {
    setActiveExperience({
      title: "",
      company_name: "",
      location: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    });
    setExperienceDialogOpen(true);
  };

  const handleEditExperience = (exp: CandidateExperience) => {
    setActiveExperience(exp);
    setExperienceDialogOpen(true);
  };

  const handleSaveExperience = async () => {
    if (!activeExperience?.title || !activeExperience?.company_name || !activeExperience?.start_date) {
      toast.error("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      try {
        await saveExperienceAction(activeExperience);
        toast.success("Experience saved successfully!");
        setExperienceDialogOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save experience.");
      }
    });
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;
    startTransition(async () => {
      try {
        await deleteExperienceAction(id);
        toast.success("Experience deleted successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete experience.");
      }
    });
  };

  const handleAddProject = () => {
    setActiveProject({
      title: "",
      description: "",
      project_url: "",
      start_date: "",
      end_date: "",
      is_ongoing: false,
      associated_with: "",
      skills: [],
    });
    setProjectDialogOpen(true);
  };

  const handleEditProject = (proj: CandidateProject) => {
    setActiveProject(proj);
    setProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!activeProject?.title || !activeProject?.description) {
      toast.error("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      try {
        await saveProjectAction(activeProject);
        toast.success("Project saved successfully!");
        setProjectDialogOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save project.");
      }
    });
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    startTransition(async () => {
      try {
        await deleteProjectAction(id);
        toast.success("Project deleted successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete project.");
      }
    });
  };

  const handleAddCertification = () => {
    setActiveCertification({
      name: "",
      issuing_org: "",
      issue_date: "",
      expiration_date: "",
      does_not_expire: true,
      credential_id: "",
      credential_url: "",
      certificate_path: "",
    });
    setPendingCertFile(null);
    setCertificationDialogOpen(true);
  };

  const handleEditCertification = (cert: CandidateCertification) => {
    setActiveCertification(cert);
    setPendingCertFile(null);
    setCertificationDialogOpen(true);
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size allowed is 5MB.");
      return;
    }
    setPendingCertFile(file);
  };

  const handleSaveCertification = async () => {
    if (!activeCertification?.name || !activeCertification?.issuing_org || !activeCertification?.issue_date) {
      toast.error("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      try {
        let updatedCert = { ...activeCertification };
        if (pendingCertFile) {
          setUploadingCert(true);
          const path = `${userProfile.id}/${Date.now()}_${pendingCertFile.name}`;
          const { data, error } = await supabase.storage.from("certificates").upload(path, pendingCertFile);
          if (error) throw error;
          updatedCert.certificate_path = data.path;
        }

        await saveCertificationAction(updatedCert);
        toast.success("Certification saved successfully!");
        setCertificationDialogOpen(false);
        setPendingCertFile(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save certification.");
      } finally {
        setUploadingCert(false);
      }
    });
  };

  const handleDeleteCertification = async (id: string) => {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    startTransition(async () => {
      try {
        await deleteCertificationAction(id);
        toast.success("Certification deleted successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete certification.");
      }
    });
  };

  const downloadEventCertificate = (cert: EventCertificate) => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Draw elegant background border
      doc.setDrawColor(15, 23, 42); // Navy slate
      doc.setLineWidth(1);
      doc.rect(10, 10, width - 20, height - 20);

      doc.setDrawColor(194, 120, 3); // Gold accent border
      doc.setLineWidth(0.5);
      doc.rect(12, 12, width - 24, height - 24);

      // Certificate Title
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("CERTIFICATE OF PARTICIPATION", width / 2, 45, { align: "center" });

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text("This is proudly presented to", width / 2, 60, { align: "center" });

      // Candidate Name
      const fullName = `${firstName} ${lastName}`.trim() || userProfile.full_name;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(194, 120, 3); // Gold for the name
      doc.text(fullName, width / 2, 78, { align: "center" });

      // Divider line under name
      doc.setDrawColor(194, 120, 3);
      doc.setLineWidth(0.5);
      doc.line(width / 2 - 40, 84, width / 2 + 40, 84);

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(70, 70, 70);
      doc.text(
        `for active participation and successful completion of the campus workshop/seminar`,
        width / 2,
        96,
        { align: "center" }
      );

      // Event Title
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(`"${cert.eventTitle}"`, width / 2, 110, { align: "center" });

      // Event Date details
      const eventDateStr = new Date(cert.eventDate).toLocaleDateString("en-IN", {
        dateStyle: "long",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Held on ${eventDateStr}`, width / 2, 125, { align: "center" });

      // Bottom Brand Signature
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("PlaceTrix Platform", width / 2, 160, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Verified Academic & Training Record", width / 2, 166, { align: "center" });

      // Save PDF
      const fileName = `Certificate_${cert.eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      doc.save(fileName);
      toast.success("Certificate downloaded!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const instituteNames = useMemo(() => institutes.map((i) => i.institute_name), [institutes]);
  const usernameMsg = usernameStatusMessage(usernameStatus);
  const editing = (s: SectionId) => editingSection === s;

  // ─── Share Profile ───────────────────────────────────────────────────────────

  const handleShareProfile = async () => {
    if (!userProfile.username) return;
    const profileUrl = `${window.location.origin}/u/${userProfile.username}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${userProfile.full_name}'s Profile on PlaceTrix`,
          text: `Check out ${userProfile.full_name}'s candidate profile on PlaceTrix.`,
          url: profileUrl,
        });
        return;
      } catch {
        // User cancelled share or share failed — fall through to clipboard copy
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied!", { description: profileUrl });
    } catch {
      toast.error("Could not copy link. Please copy it manually: " + profileUrl);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal, academic, and professional details</p>
        </div>
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!userProfile.username}
                  onClick={handleShareProfile}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share Profile
                </Button>
              </span>
            </TooltipTrigger>
            {!userProfile.username && (
              <TooltipContent side="bottom">
                Set a username first to share your profile
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-6">



        {/* Onboarding Banner */}
        {isFirstTime && !bannerDismissed && (
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Welcome! Let's complete your candidate profile</AlertTitle>
            <AlertDescription className="mt-1 flex items-start justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Click <strong>Edit</strong> on each section to fill in your details.
                Start with <strong>Personal Details</strong>, then <strong>Education</strong>, and finally <strong>Professional Details</strong>.
                Required fields are marked with <span className="text-destructive font-bold">*</span>.
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Account Settings */}
        <Card className={cn("transition-all duration-200", editing("account") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Your unique username is used to identify you on the platform</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("account") && (accountComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("account") && (
                <Button variant="outline" size="sm" onClick={() => openSection("account")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing("account") ? (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="username">Username <span className="text-destructive font-bold">*</span></Label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="yourusername"
                    className={cn(
                      "pl-9 pr-9",
                      errors.username && "border-destructive focus-visible:ring-destructive"
                    )}
                    value={username}
                    maxLength={20}
                    onChange={(e) => handleUsernameChange(e.target.value.replace(/\s/g, ""))}
                    autoComplete="username"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <UsernameStatusIcon status={usernameStatus} />
                  </span>
                </div>
                {errors.username ? (
                  <p className="text-xs text-destructive">{errors.username}</p>
                ) : usernameMsg ? (
                  <p className={cn("text-xs", usernameMsg.className)}>{usernameMsg.text}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    3–20 characters: letters, numbers, and underscores only
                  </p>
                )}
              </div>
            ) : initialUsername.current ? (
              <div className="max-w-sm space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Username</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">@{initialUsername.current}</span>
                </div>
              </div>
            ) : (
              <div className="max-w-sm">
                <p className="text-xs text-muted-foreground mb-1">Username</p>
                <p className="text-sm font-medium text-muted-foreground italic">Not set yet</p>
                <p className="text-xs text-muted-foreground mt-1">Set your username — it cannot be changed once saved</p>
              </div>
            )}
          </CardContent>
          {editing("account") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("account")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("account")} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Profile Photo — always interactive */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>Upload a clear, professional photo. Supports JPEG, PNG or WEBP, max 2MB.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
              >
                <Avatar className="h-24 w-24 border-2 border-muted transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage src={avatarSrc ?? undefined} alt="Profile picture" className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold">
                    {getInitials(firstName, lastName, userProfile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-medium">Change</span>
                </div>
                <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
                  {isUploadingAvatar
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />}
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-2.5">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="shadow-sm"
                >
                  {isUploadingAvatar ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload Photo</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  {pendingAvatarFile ? "New photo selected. Click Save Photo below to confirm." : "Click the avatar or button to upload a new photo."}
                </p>
              </div>
            </div>
          </CardContent>
          {pendingAvatarFile && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={handleCancelAvatarChange} disabled={isUploadingAvatar}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAvatar} disabled={isUploadingAvatar}>
                {isUploadingAvatar && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Photo
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* About Summary */}
        <Card className={cn("transition-all duration-200", editing("bio") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>About Summary</CardTitle>
              <CardDescription>A brief summary of your background, experience, and interests</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("bio") && (
                <Button variant="outline" size="sm" onClick={() => openSection("bio")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing("bio") ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Tell us about yourself, your accomplishments, career goals, or passion projects..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/1000 characters</p>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {bio || <span className="text-muted-foreground italic">No bio summary added yet. Click edit to write one.</span>}
              </p>
            )}
          </CardContent>
          {editing("bio") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("bio")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("bio")} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Summary
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Personal Details */}
        <Card className={cn("transition-all duration-200", editing("personal") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Your basic personal information</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("personal") && (personalComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("personal") && (
                <Button variant="outline" size="sm" onClick={() => openSection("personal")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("personal") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>First Name<RequiredMark /></Label>
                    <Input
                      placeholder="First name"
                      maxLength={50}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                      onBlur={() => setFirstName(capitalizeFirstLetterOnly(firstName))}
                    />
                    <FieldError message={errors.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name<RequiredMark /></Label>
                    <Input
                      placeholder="Middle name"
                      maxLength={50}
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                      onBlur={() => setMiddleName(capitalizeFirstLetterOnly(middleName))}
                    />
                    <FieldError message={errors.middleName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name<RequiredMark /></Label>
                    <Input
                      placeholder="Last name"
                      maxLength={50}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                      onBlur={() => setLastName(capitalizeFirstLetterOnly(lastName))}
                    />
                    <FieldError message={errors.lastName} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Gender<RequiredMark /></Label>
                    <Combobox items={GENDER_OPTIONS} value={gender} onValueChange={(v) => setGender(v ?? "")}>
                      <ComboboxInput placeholder="Select gender" />
                      <ComboboxContent>
                        <ComboboxEmpty>No gender found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.gender} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number<RequiredMark /></Label>
                    <Input
                      placeholder="10-digit mobile number"
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    />
                    <FieldError message={errors.phoneNumber} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth<RequiredMark /></Label>
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start font-normal", !dateOfBirth && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateOfBirth ? formatDate(dateOfBirth) : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          defaultMonth={dateOfBirth ?? defaultDobDate}
                          captionLayout="dropdown"
                          startMonth={new Date(1950, 0)}
                          endMonth={new Date(2010, 11)}
                          onSelect={(date) => { setDateOfBirth(date); setDobOpen(false); }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldError message={errors.dateOfBirth} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => {
                      if (aadhaarNumber.includes("*")) {
                        setAadhaarNumber("");
                      }
                    }}
                    onBlur={() => {
                      if (!aadhaarNumber.trim() && initialData?.aadhaar_number) {
                        setAadhaarNumber(initialData.aadhaar_number);
                      }
                    }}
                  />
                  <FieldError message={errors.aadhaarNumber} />
                </div>

                <div className="space-y-2">
                  <Label>Current Address</Label>
                  <Textarea placeholder="Current address" rows={3} value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value.replace(/[<>]/g, ''))} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permanent Address</Label>
                    <Button variant="ghost" size="sm" type="button" onClick={() => setPermanentAddress(currentAddress)}>
                      <Copy className="h-3 w-3 mr-1" />Same as current
                    </Button>
                  </div>
                  <Textarea placeholder="Permanent address" rows={3} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value.replace(/[<>]/g, ''))} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <ReadonlyField label="First Name" value={firstName} />
                  <ReadonlyField label="Middle Name" value={middleName} />
                  <ReadonlyField label="Last Name" value={lastName} />
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <ReadonlyField label="Gender" value={gender} />
                  <ReadonlyField label="Contact Number" value={phoneNumber} />
                  <ReadonlyField label="Date of Birth" value={dateOfBirth ? formatDate(dateOfBirth) : null} />
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="Aadhaar Number" value={aadhaarNumber ? aadhaarNumber.replace(/.(?=.{4})/g, "*").replace(/(.{4})(.{4})(.{4})/, "$1 $2 $3") : null} />
                  <div className="hidden sm:block" />
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Current Address" value={currentAddress} />
                  </div>
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Permanent Address" value={permanentAddress} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {editing("personal") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("personal")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("personal")} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Education Details */}
        <Card className={cn("transition-all duration-200", editing("education") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Education Details</CardTitle>
              <CardDescription>Your academic background and qualifications</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("education") && (educationComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("education") && (
                <Button variant="outline" size="sm" onClick={() => openSection("education")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("education") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Institution selector — always editable */}
                  <div className="md:col-span-2 space-y-2">
                    <Label>College / Institution<RequiredMark /></Label>
                    <Combobox
                      items={instituteNames}
                      value={instituteName}
                      onValueChange={handleInstituteSelect}
                    >
                      <ComboboxInput placeholder="Search and select your college…" />
                      <ComboboxContent>
                        <ComboboxEmpty>No college found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => (
                            <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.instituteId} />
                  </div>

                  {/* Affiliation — always read-only (derived from institute) */}
                  <div className="space-y-2">
                    <Label>Affiliation</Label>
                    <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-none">
                      {selectedAffiliation || <span className="italic">—</span>}
                    </div>
                  </div>

                  {/* Branch / Course — editable once institute is selected */}
                  <div className="space-y-2">
                    <Label>Branch / Course<RequiredMark /></Label>
                    {instituteId && availableCourses.length > 0 ? (
                      <Combobox
                        items={availableCourses}
                        value={courseName}
                        onValueChange={(v) => setCourseName(v ?? "")}
                      >
                        <ComboboxInput placeholder="Select your branch…" />
                        <ComboboxContent>
                          <ComboboxEmpty>No course found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => (
                              <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    ) : (
                      <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed select-none">
                        {instituteId
                          ? <span className="italic">Loading courses…</span>
                          : <span className="italic">Select a college first</span>}
                      </div>
                    )}
                    <FieldError message={errors.courseName} />
                  </div>

                  {/* Expected Graduation Year — editable */}
                  <div className="space-y-2">
                    <Label>Expected Graduation Year<RequiredMark /></Label>
                    <Combobox
                      items={PASSOUT_YEAR_OPTIONS}
                      value={passoutYear}
                      onValueChange={(v) => setPassoutYear(v ?? "")}
                    >
                      <ComboboxInput placeholder="Select year" />
                      <ComboboxContent>
                        <ComboboxEmpty>No year found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => (
                            <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.passoutYear} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground -mt-2">
                  Select your college to load available branches. Affiliation is auto-filled.
                </p>

                <Separator />

                {/* SSC Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Class 10 (SSC) details</h4>
                  <div className="space-y-2">
                    <Label>School / Institution Name<RequiredMark /></Label>
                    <Input
                      placeholder="e.g. St. Mary's High School"
                      value={sscInstitution}
                      onChange={(e) => setSscInstitution(e.target.value)}
                    />
                    <FieldError message={errors.sscInstitution} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SSC Percentage<RequiredMark /></Label>
                      <Input placeholder="e.g. 85.60" type="number" step={0.01} min={0} max={100} value={sscPercentage} onChange={(e) => setSscPercentage(e.target.value)} />
                      <FieldError message={errors.sscPercentage} />
                    </div>
                    <div className="space-y-2">
                      <Label>SSC Passing Year<RequiredMark /></Label>
                      <Combobox items={YEAR_OPTIONS} value={sscPassYear} onValueChange={(v) => setSscPassYear(v ?? "")}>
                        <ComboboxInput placeholder="Select year" />
                        <ComboboxContent>
                          <ComboboxEmpty>No year found.</ComboboxEmpty>
                          <ComboboxList>
                            {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <FieldError message={errors.sscPassYear} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* HSC / Diploma Checkboxes */}
                <div className="space-y-3">
                  <Label>Education After SSC<RequiredMark /></Label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isHsc} onChange={(e) => setIsHsc(e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span className="text-sm">HSC</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isDiploma} onChange={(e) => setIsDiploma(e.target.checked)} className="h-4 w-4 accent-primary" />
                      <span className="text-sm">Diploma</span>
                    </label>
                  </div>
                  <FieldError message={errors.educationAfterSsc} />

                  {isHsc && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-semibold text-foreground">Class 12 (HSC) details</h4>
                      <div className="space-y-2">
                        <Label>Junior College / Institution Name<RequiredMark /></Label>
                        <Input
                          placeholder="e.g. St. Xavier's Junior College"
                          value={hscInstitution}
                          onChange={(e) => setHscInstitution(e.target.value)}
                        />
                        <FieldError message={errors.hscInstitution} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>HSC Percentage<RequiredMark /></Label>
                          <Input placeholder="e.g. 78.40" type="number" step={0.01} max={100} value={hscPercentage} onChange={(e) => setHscPercentage(e.target.value)} />
                          <FieldError message={errors.hscPercentage} />
                        </div>
                        <div className="space-y-2">
                          <Label>HSC Passing Year<RequiredMark /></Label>
                          <Combobox items={YEAR_OPTIONS} value={hscPassYear} onValueChange={(v) => setHscPassYear(v ?? "")}>
                            <ComboboxInput placeholder="Select year" />
                            <ComboboxContent>
                              <ComboboxEmpty>No year found.</ComboboxEmpty>
                              <ComboboxList>
                                {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          <FieldError message={errors.hscPassYear} />
                        </div>
                      </div>
                    </div>
                  )}

                  {isDiploma && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-semibold text-foreground">Diploma details</h4>
                      <div className="space-y-2">
                        <Label>Diploma Institute / Institution Name<RequiredMark /></Label>
                        <Input
                          placeholder="e.g. Government Polytechnic"
                          value={diplomaInstitution}
                          onChange={(e) => setDiplomaInstitution(e.target.value)}
                        />
                        <FieldError message={errors.diplomaInstitution} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Diploma Percentage<RequiredMark /></Label>
                          <Input placeholder="e.g. 72.00" type="number" step={0.01} max={100} value={diplomaPercentage} onChange={(e) => setDiplomaPercentage(e.target.value)} />
                          <FieldError message={errors.diplomaPercentage} />
                        </div>
                        <div className="space-y-2">
                          <Label>Diploma Passing Year<RequiredMark /></Label>
                          <Combobox items={YEAR_OPTIONS} value={diplomaPassYear} onValueChange={(v) => setDiplomaPassYear(v ?? "")}>
                            <ComboboxInput placeholder="Select year" />
                            <ComboboxContent>
                              <ComboboxEmpty>No year found.</ComboboxEmpty>
                              <ComboboxList>
                                {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                          <FieldError message={errors.diplomaPassYear} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>University PRN</Label>
                    <Input
                      placeholder="University PRN / Enrollment number"
                      maxLength={50}
                      value={universityPrn}
                      onChange={(e) => setUniversityPrn(e.target.value.replace(/[<>]/g, ''))}
                    />
                    <FieldError message={errors.universityPrn} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Semester SGPA</Label>
                  {isCourseConfigured ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {sgpaValues.map((val, i) => (
                        <div key={i} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Sem {i + 1}</Label>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step={0.01}
                            min={0}
                            max={10}
                            value={val}
                            onChange={(e) => handleSgpaChange(i, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Course Semesters Not Configured</AlertTitle>
                      <AlertDescription>
                        Please contact your institute coordinator to configure the semesters count for &quot;{courseName}&quot;.
                      </AlertDescription>
                    </Alert>
                  )}
                  <FieldError message={errors.sgpa} />
                </div>


              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Institution" value={instituteName} />
                  </div>
                  <ReadonlyField label="Branch / Course" value={courseName} />
                  <ReadonlyField label="Expected Graduation Year" value={passoutYear} />
                  <div className="sm:col-span-2">
                    <ReadonlyField label="Affiliation" value={selectedAffiliation} />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="sm:col-span-2">
                    <ReadonlyField label="SSC School / Institution" value={sscInstitution} />
                  </div>
                  <ReadonlyField label="SSC Percentage" value={sscPercentage && !isNaN(parseFloat(sscPercentage)) ? `${parseFloat(sscPercentage).toFixed(2)}%` : null} />
                  <ReadonlyField label="SSC Passing Year" value={sscPassYear} />

                  {isHsc && (
                    <>
                      <div className="sm:col-span-2">
                        <ReadonlyField label="HSC Junior College" value={hscInstitution} />
                      </div>
                      <ReadonlyField label="HSC Percentage" value={hscPercentage && !isNaN(parseFloat(hscPercentage)) ? `${parseFloat(hscPercentage).toFixed(2)}%` : null} />
                      <ReadonlyField label="HSC Passing Year" value={hscPassYear} />
                    </>
                  )}

                  {isDiploma && (
                    <>
                      <div className="sm:col-span-2">
                        <ReadonlyField label="Diploma Institute" value={diplomaInstitution} />
                      </div>
                      <ReadonlyField label="Diploma Percentage" value={diplomaPercentage && !isNaN(parseFloat(diplomaPercentage)) ? `${parseFloat(diplomaPercentage).toFixed(2)}%` : null} />
                      <ReadonlyField label="Diploma Passing Year" value={diplomaPassYear} />
                    </>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="University PRN" value={universityPrn} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Semester SGPA</p>
                  {isCourseConfigured ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sgpaValues.map((val, i) => (
                        <div key={i}>
                          <p className="text-[10px] text-muted-foreground">Sem {i + 1}</p>
                          <p className="text-sm font-medium">{val && !isNaN(parseFloat(val)) ? parseFloat(val).toFixed(2) : "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="destructive" className="py-2">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle className="text-xs">Course Semesters Not Configured</AlertTitle>
                      <AlertDescription className="text-xs">
                        Please contact your institute coordinator to configure the semesters count for &quot;{courseName}&quot;.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>


              </div>
            )}
          </CardContent>

          {editing("education") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("education")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("education")} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Professional Details */}
        <Card className={cn("transition-all duration-200", editing("professional") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Skills and online profiles</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!editing("professional") && (professionalComplete ? <SectionComplete /> : <SectionIncomplete />)}
              {!editing("professional") && (
                <Button variant="outline" size="sm" onClick={() => openSection("professional")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {editing("professional") ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Skills<RequiredMark /></Label>
                  <Combobox
                    items={(() => {
                      const grouped = allSkills.reduce<Record<string, string[]>>((acc, skill) => {
                        if (!acc[skill.category]) acc[skill.category] = [];
                        acc[skill.category].push(skill.id);
                        return acc;
                      }, {});
                      return Object.entries(grouped).map(([category, items]) => ({ value: category, items }));
                    })()}
                    value={selectedSkillIds}
                    onValueChange={(v) => setSelectedSkillIds(v as string[])}
                    multiple
                    itemToStringLabel={(id) => allSkills.find((s) => s.id === id)?.name ?? id}
                  >
                    <ComboboxChips ref={skillsAnchor}>
                      {selectedSkillIds.map((id) => {
                        const skill = allSkills.find((s) => s.id === id);
                        return (
                          <ComboboxChip key={id} showRemove>
                            <SkillIcon name={skill?.name ?? ""} className="mr-1 text-[11px]" />
                            {skill?.name ?? id}
                          </ComboboxChip>
                        );
                      })}
                      <ComboboxChipsInput placeholder={selectedSkillIds.length ? "Add more…" : "Search skills…"} />
                    </ComboboxChips>
                    <ComboboxContent anchor={skillsAnchor}>
                      <ComboboxEmpty>No skill found.</ComboboxEmpty>
                      <ComboboxList>
                        {(group: { value: string; items: string[] }) => (
                          <ComboboxGroup key={group.value} items={group.items}>
                            <ComboboxLabel>{group.value}</ComboboxLabel>
                            <ComboboxCollection>
                              {(id: string) => {
                                const skill = allSkills.find((s) => s.id === id);
                                return (
                                  <ComboboxItem key={id} value={id}>
                                    <SkillIcon name={skill?.name ?? ""} className="mr-1.5 text-base" />
                                    <span className="text-sm font-medium">{skill?.name ?? id}</span>
                                  </ComboboxItem>
                                );
                              }}
                            </ComboboxCollection>
                          </ComboboxGroup>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError message={errors.skills} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input placeholder="https://linkedin.com/in/yourprofile" type="url" maxLength={200} value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value.replace(/[<>]/g, ''))} />
                    <FieldError message={errors.linkedinUrl} />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input placeholder="https://github.com/yourusername" type="url" maxLength={200} value={githubUrl} onChange={(e) => setGithubUrl(e.target.value.replace(/[<>]/g, ''))} />
                    <FieldError message={errors.githubUrl} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Portfolio / Project Links</Label>
                  {portfolioLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={link}
                        onChange={(e) => handlePortfolioLinkChange(index, e.target.value)}
                        placeholder="https://yourproject.com"
                        type="url"
                        maxLength={200}
                      />
                      <Button variant="ghost" size="icon" type="button" onClick={() => removePortfolioLink(index)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPortfolioLink} type="button">
                    <Plus className="h-4 w-4 mr-2" />Add link
                  </Button>
                  <FieldError message={errors.portfolioLinks} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Skills & Expertise</p>
                  {selectedSkillIds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(groupedSkills).map(([category, skills]) => (
                        <div key={category} className="space-y-1.5 p-3 rounded-lg border bg-muted/10 border-border/50">
                          <h5 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{category}</h5>
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {skills.map((skill, index) => (
                              <span key={skill.id} className="inline-flex items-center text-sm text-foreground">
                                <SkillIcon name={skill.name} className="mr-1 text-base" />
                                {skill.name}
                                {index < skills.length - 1 && <span className="text-muted-foreground ml-1.5">,</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="LinkedIn" value={linkedinUrl} />
                  <ReadonlyField label="GitHub" value={githubUrl} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Portfolio / Project Links</p>
                  {portfolioLinks.filter(l => l.trim()).length > 0 ? (
                    <div className="space-y-1">
                      {portfolioLinks.filter(l => l.trim()).map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline truncate max-w-md"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-normal">—</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          {editing("professional") && (
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => cancelSection("professional")} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveSection("professional")} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>



        {/* Work Experience Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Work Experience</CardTitle>
              <CardDescription>Your professional work and internship history</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddExperience}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Experience
            </Button>
          </CardHeader>
          <CardContent>
            {experiences.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No work experience listed yet.</p>
            ) : (
              <div className="space-y-0">
                {experiences.map((exp, idx) => (
                  <div key={exp.id}>
                    <div className="flex gap-4 items-start py-4 justify-between">
                      <div className="flex gap-4 items-start flex-1 min-w-0">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-semibold leading-none">{exp.title}</h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            {exp.company_name} {exp.location ? `• ${exp.location}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })} –{" "}
                            {exp.is_current
                              ? "Present"
                              : exp.end_date
                                ? new Date(exp.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                : "—"}
                          </p>
                          {exp.description && (
                            <p className="text-xs text-foreground/80 mt-2 whitespace-pre-line leading-normal">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditExperience(exp)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExperience(exp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {idx < experiences.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Academic, personal, or open-source projects</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddProject}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Project
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No projects listed yet.</p>
            ) : (
              <div className="space-y-0">
                {projects.map((proj, idx) => (
                  <div key={proj.id}>
                    <div className="flex gap-4 items-start py-4 justify-between">
                      <div className="flex gap-4 items-start flex-1 min-w-0">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold leading-none">{proj.title}</h4>
                            {proj.project_url && (
                              <a href={proj.project_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {proj.associated_with && (
                            <p className="text-xs text-muted-foreground font-medium">
                              Associated with: {proj.associated_with}
                            </p>
                          )}
                          {(proj.start_date || proj.end_date || proj.is_ongoing) && (
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {proj.start_date
                                ? new Date(proj.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                : "—"}{" "}
                              –{" "}
                              {proj.is_ongoing
                                ? "Present"
                                : proj.end_date
                                  ? new Date(proj.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                  : "—"}
                            </p>
                          )}
                          <p className="text-xs text-foreground/80 mt-2 whitespace-pre-line leading-normal">
                            {proj.description}
                          </p>
                          {proj.skills && proj.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {proj.skills.map((skill) => (
                                <Badge key={skill} variant="default" className="text-[10px] px-1.5 py-0 inline-flex items-center gap-1">
                                  <SkillIcon name={skill} className="text-[10px]" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditProject(proj)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProject(proj.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {idx < projects.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certifications Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Licenses & Certifications</CardTitle>
              <CardDescription>Professional certifications and credentials</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddCertification}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Certification
            </Button>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No certifications listed yet.</p>
            ) : (
              <div className="space-y-0">
                {certifications.map((cert, idx) => (
                  <div key={cert.id}>
                    <div className="flex gap-4 items-start py-4 justify-between">
                      <div className="flex gap-4 items-start flex-1 min-w-0">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-semibold leading-none">{cert.name}</h4>
                          <p className="text-xs text-muted-foreground font-medium">{cert.issuing_org}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            Issued {new Date(cert.issue_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            {!cert.does_not_expire && cert.expiration_date
                              ? ` • Expires ${new Date(cert.expiration_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                              : " • No Expiration Date"}
                          </p>
                          {cert.credential_id && (
                            <p className="text-[11px] text-muted-foreground">Credential ID: {cert.credential_id}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {cert.credential_url && (
                              <a
                                href={cert.credential_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Link2 className="h-3 w-3" /> Show credential
                              </a>
                            )}
                            {cert.certificate_path && (
                              <a
                                href={getStorageUrl(supabase, "certificates", cert.certificate_path) ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3" /> View certificate document
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditCertification(cert)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCertification(cert.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {idx < certifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Events Participation Certificates Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Events Certificates of Participation</CardTitle>
              <CardDescription>Verified participation certificates for concluded campus events</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {eventCertificates.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No event participation certificates available yet.</p>
            ) : (
              <div className="space-y-0">
                {eventCertificates.map((cert, idx) => (
                  <div key={cert.ticketId}>
                    <div className="flex gap-4 items-start py-4">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold leading-none">{cert.eventTitle}</h4>
                        <p className="text-xs text-muted-foreground font-medium">PlaceTrix Campus Event</p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Attended {new Date(cert.eventDate).toLocaleDateString("en-US", { month: "short", year: "numeric", day: "numeric" })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => downloadEventCertificate(cert)}
                            className="p-0 h-auto text-xs text-primary hover:underline gap-1"
                          >
                            <FileDown className="h-3 w-3" /> Download Certificate
                          </Button>
                        </div>
                      </div>
                    </div>
                    {idx < eventCertificates.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Experience Dialog */}
      <Dialog open={experienceDialogOpen} onOpenChange={setExperienceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeExperience?.id ? "Edit Experience" : "Add Experience"}</DialogTitle>
            <DialogDescription>Add details about your professional work history.</DialogDescription>
          </DialogHeader>
          {activeExperience && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Software Engineer Intern"
                  value={activeExperience.title}
                  onChange={(e) => setActiveExperience(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={activeExperience.company_name}
                  onChange={(e) => setActiveExperience(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Mumbai, India (or Remote)"
                  value={activeExperience.location || ""}
                  onChange={(e) => setActiveExperience(prev => prev ? { ...prev, location: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date <RequiredMark /></Label>
                  <Input
                    type="date"
                    value={activeExperience.start_date || ""}
                    onChange={(e) => setActiveExperience(prev => prev ? { ...prev, start_date: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    disabled={activeExperience.is_current}
                    value={activeExperience.end_date || ""}
                    onChange={(e) => setActiveExperience(prev => prev ? { ...prev, end_date: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={activeExperience.is_current || false}
                  onChange={(e) => setActiveExperience(prev => prev ? { ...prev, is_current: e.target.checked, end_date: e.target.checked ? "" : prev.end_date } : null)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_current" className="text-sm font-medium text-foreground cursor-pointer">
                  I am currently working in this role
                </label>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe your responsibilities, key achievements, and technologies used..."
                  value={activeExperience.description || ""}
                  onChange={(e) => setActiveExperience(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExperienceDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveExperience} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save Experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeProject?.id ? "Edit Project" : "Add Project"}</DialogTitle>
            <DialogDescription>Add details about projects you have worked on.</DialogDescription>
          </DialogHeader>
          {activeProject && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project Title <RequiredMark /></Label>
                <Input
                  placeholder="e.g. E-Commerce Platform"
                  value={activeProject.title}
                  onChange={(e) => setActiveProject(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Associated With</Label>
                <Input
                  placeholder="e.g. Acme Corp (or Independent)"
                  value={activeProject.associated_with || ""}
                  onChange={(e) => setActiveProject(prev => prev ? { ...prev, associated_with: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project URL</Label>
                <Input
                  placeholder="e.g. https://github.com/username/project"
                  value={activeProject.project_url || ""}
                  onChange={(e) => setActiveProject(prev => prev ? { ...prev, project_url: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={activeProject.start_date || ""}
                    onChange={(e) => setActiveProject(prev => prev ? { ...prev, start_date: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    disabled={activeProject.is_ongoing}
                    value={activeProject.end_date || ""}
                    onChange={(e) => setActiveProject(prev => prev ? { ...prev, end_date: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_ongoing"
                  checked={activeProject.is_ongoing || false}
                  onChange={(e) => setActiveProject(prev => prev ? { ...prev, is_ongoing: e.target.checked, end_date: e.target.checked ? "" : prev.end_date } : null)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_ongoing" className="text-sm font-medium text-foreground cursor-pointer">
                  This project is currently ongoing
                </label>
              </div>
              <div className="space-y-2">
                <Label>Skills Used</Label>
                <Combobox
                  items={(() => {
                    const grouped = allSkills.reduce<Record<string, string[]>>((acc, skill) => {
                      if (!acc[skill.category]) acc[skill.category] = [];
                      acc[skill.category].push(skill.name);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([category, items]) => ({ value: category, items }));
                  })()}
                  value={activeProject.skills || []}
                  onValueChange={(v) => setActiveProject(prev => prev ? { ...prev, skills: v as string[] } : null)}
                  multiple
                >
                  <ComboboxChips ref={projectSkillsAnchor}>
                    {(activeProject.skills || []).map((skill) => (
                      <ComboboxChip key={skill} showRemove>
                        <SkillIcon name={skill} className="mr-1 text-[11px]" />
                        {skill}
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder={(activeProject.skills || []).length ? "Add more…" : "Search skills…"} />
                  </ComboboxChips>
                  <ComboboxContent anchor={projectSkillsAnchor}>
                    <ComboboxEmpty>No skill found.</ComboboxEmpty>
                    <ComboboxList>
                      {(group: { value: string; items: string[] }) => (
                        <ComboboxGroup key={group.value} items={group.items}>
                          <ComboboxLabel>{group.value}</ComboboxLabel>
                          <ComboboxCollection>
                            {(item: string) => (
                              <ComboboxItem key={item} value={item}>
                                <SkillIcon name={item} className="mr-1.5 text-base" />
                                <span className="text-sm font-medium">{item}</span>
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxGroup>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="space-y-2">
                <Label>Description <RequiredMark /></Label>
                <Textarea
                  placeholder="Detail your role in the project, problems solved, and outcomes..."
                  value={activeProject.description}
                  onChange={(e) => setActiveProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProjectDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={certificationDialogOpen} onOpenChange={setCertificationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeCertification?.id ? "Edit Certification" : "Add Certification"}</DialogTitle>
            <DialogDescription>Add professional credentials and certifications.</DialogDescription>
          </DialogHeader>
          {activeCertification && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Certification Name <RequiredMark /></Label>
                <Input
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={activeCertification.name}
                  onChange={(e) => setActiveCertification(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Issuing Organization <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Amazon Web Services (AWS)"
                  value={activeCertification.issuing_org}
                  onChange={(e) => setActiveCertification(prev => prev ? { ...prev, issuing_org: e.target.value } : null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date <RequiredMark /></Label>
                  <Input
                    type="date"
                    value={activeCertification.issue_date || ""}
                    onChange={(e) => setActiveCertification(prev => prev ? { ...prev, issue_date: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    disabled={activeCertification.does_not_expire}
                    value={activeCertification.expiration_date || ""}
                    onChange={(e) => setActiveCertification(prev => prev ? { ...prev, expiration_date: e.target.value } : null)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="does_not_expire"
                  checked={activeCertification.does_not_expire || false}
                  onChange={(e) => setActiveCertification(prev => prev ? { ...prev, does_not_expire: e.target.checked, expiration_date: e.target.checked ? "" : prev.expiration_date } : null)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="does_not_expire" className="text-sm font-medium text-foreground cursor-pointer">
                  This credential does not expire
                </label>
              </div>
              <div className="space-y-2">
                <Label>Credential ID</Label>
                <Input
                  placeholder="e.g. AWS-SEC-123456"
                  value={activeCertification.credential_id || ""}
                  onChange={(e) => setActiveCertification(prev => prev ? { ...prev, credential_id: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Credential URL</Label>
                <Input
                  placeholder="e.g. https://creds.com/aws-solutions-architect"
                  value={activeCertification.credential_url || ""}
                  onChange={(e) => setActiveCertification(prev => prev ? { ...prev, credential_url: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Certificate Document File</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleCertificateUpload}
                    className="hidden"
                    id="certificate_file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("certificate_file")?.click()}
                    disabled={uploadingCert}
                  >
                    {uploadingCert ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Choose File</>
                    )}
                  </Button>
                  {(activeCertification.certificate_path || pendingCertFile) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" />
                      {pendingCertFile ? `${pendingCertFile.name} (will save on submit)` : "Document uploaded"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Supports JPEG, PNG, WEBP or PDF. Max size 5MB.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCertificationDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveCertification} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save Certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={handleCropModalClose}
        imageSrc={tempImageSrc}
        fileName={tempFileName}
        shape="circle"
        onCropComplete={handleCroppedAvatarUpload}
      />
    </div>
  );
}
