"use client";

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  updateCandidateBioAction
} from "./actions";
import {
  CandidateEducation,
  CandidateExperience,
  CandidateProject,
  CandidateCertification
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
  ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem,
  ComboboxList, ComboboxValue, useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { ImageCropperModal } from "@/components/ImageCropperModal";
import {
  Upload, Plus, Minus, Copy, CalendarIcon, Loader2, Camera,
  CheckCircle2, XCircle, AtSign, ShieldAlert, HelpCircle,
  Pencil, X, Info, CheckCircle, User, GraduationCap, Briefcase,
  Link2, Trash2, Edit2, FileText, Check, FileDown, Award, FolderGit2
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Constants ───────────────────────────────────────────────────────────────

const SOFTWARE_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "Go", "Rust", "PHP", "Ruby",
  "Swift", "Kotlin", "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js",
  "Django", "Flask", "Spring Boot", "ASP.NET", "Laravel", "React Native", "Flutter",
  "HTML", "CSS", "Sass", "Tailwind CSS", "Bootstrap", "Material UI", "SQL", "MySQL",
  "PostgreSQL", "MongoDB", "Redis", "Firebase", "Oracle", "SQLite", "Git", "GitHub",
  "GitLab", "Docker", "Kubernetes", "Jenkins", "CI/CD", "AWS", "Azure", "Google Cloud",
  "Heroku", "Netlify", "Vercel", "REST API", "GraphQL", "Microservices", "Linux",
  "Bash", "PowerShell", "Agile", "Scrum", "Jira", "TensorFlow", "PyTorch",
  "Machine Learning", "Deep Learning", "Data Science", "Pandas", "NumPy",
  "Scikit-learn", "Selenium", "Jest", "Cypress", "JUnit", "Postman", "Figma",
  "Adobe XD", "Photoshop", "UI/UX Design",
];

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
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
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
  eventCertificates = []
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
    };
  }, [tempImageSrc]);

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
    Array.from({ length: 8 }, (_, i) => {
      const val = initialData?.sgpa_semesters?.[i];
      return val != null && val !== 0 ? val.toFixed(2) : "";
    })
  );

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



  useEffect(() => {
    setExperiences(experienceData || []);
  }, [experienceData]);

  useEffect(() => {
    setProjects(projectsData || []);
  }, [projectsData]);

  useEffect(() => {
    setCertifications(certificationsData || []);
  }, [certificationsData]);

  // Professional
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills ?? []);
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url ?? "");
  const [githubUrl, setGithubUrl] = useState(initialData?.github_url ?? "");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(
    initialData?.portfolio_links?.length ? initialData.portfolio_links : [""]
  );

  // Institute lookup
  const [institutes, setInstitutes] = useState<InstituteOption[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [selectedAffiliation, setSelectedAffiliation] = useState<string | null>(null);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const skillsAnchor = useComboboxAnchor();
  const defaultDobDate = new Date(2000, 0, 1);

  // Section completeness (from server data)
  const personalComplete = !!(
    initialData?.first_name && initialData?.last_name &&
    initialData?.gender && initialData?.phone_number && initialData?.date_of_birth
  );
  const educationComplete = !!(
    userProfile.institute_id && initialData?.course_name &&
    initialData?.passout_year &&
    sscPercentage && sscPassYear && sscInstitution &&
    ((isHsc && hscPercentage && hscPassYear && hscInstitution) ||
      (isDiploma && diplomaPercentage && diplomaPassYear && diplomaInstitution))
  );
  const professionalComplete = !!(initialData?.skills?.length > 0);

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
    (async () => {
      const { data } = await (supabase as any)
        .from("institutes")
        .select("id, institute_name, courses, affiliation")
        .order("institute_name");
      if (data) {
        setInstitutes(data);
        if (userProfile.institute_id) {
          const found = data.find((i: any) => i.id === userProfile.institute_id);
          if (found) {
            setInstituteName(found.institute_name);
            setAvailableCourses(found.courses ?? []);
            setSelectedAffiliation(found.affiliation ?? null);
          }
        }
      }
    })();
  }, []);

  // Sync state when userProfile.institute_id updates from router.refresh()
  useEffect(() => {
    if (userProfile.institute_id && institutes.length > 0) {
      const found = institutes.find((i) => i.id === userProfile.institute_id);
      if (found && found.id !== instituteId) {
        setInstituteId(found.id);
        setInstituteName(found.institute_name);
        setAvailableCourses(found.courses ?? []);
        setSelectedAffiliation(found.affiliation ?? null);
      }
    }
  }, [userProfile.institute_id, institutes]);

  useEffect(() => {
    const found = institutes.find((i) => i.id === instituteId);
    if (found) {
      setAvailableCourses(found.courses ?? []);
      setSelectedAffiliation(found.affiliation ?? null);
      if (!found.courses?.includes(courseName)) setCourseName("");
    }
  }, [instituteId]);

  // ─── Section open/close ──────────────────────────────────────────────────────

  function openSection(section: SectionId) {
    if (editingSection && editingSection !== section) {
      const confirmDiscard = window.confirm("You are currently editing another section. Unsaved changes will be discarded. Do you want to proceed?");
      if (!confirmDiscard) return;
      cancelSection(editingSection);
    }
    setErrors({});
    setEditingSection(section);
  }

  function cancelSection(section: SectionId) {
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
      setInstituteId(userProfile.institute_id ?? "");
      setCourseName(initialData?.course_name ?? "");
      setPassoutYear(initialData?.passout_year ? String(initialData.passout_year) : "");
      setSscPercentage(sscRecord?.grade_or_percentage != null ? String(sscRecord.grade_or_percentage) : "");
      setSscPassYear(sscRecord?.passout_year ? String(sscRecord.passout_year) : "");
      setSscInstitution(sscRecord?.institution_name || "");
      setIsHsc(!!hscRecord);
      setHscPercentage(hscRecord?.grade_or_percentage != null ? String(hscRecord.grade_or_percentage) : "");
      setHscPassYear(hscRecord?.passout_year ? String(hscRecord.passout_year) : "");
      setHscInstitution(hscRecord?.institution_name || "");
      setIsDiploma(!!diplomaRecord);
      setDiplomaPercentage(diplomaRecord?.grade_or_percentage != null ? String(diplomaRecord.grade_or_percentage) : "");
      setDiplomaPassYear(diplomaRecord?.passout_year ? String(diplomaRecord.passout_year) : "");
      setDiplomaInstitution(diplomaRecord?.institution_name || "");
      setUniversityPrn(initialData?.university_prn ?? "");
      setSgpaValues(Array.from({ length: 8 }, (_, i) => {
        const val = initialData?.sgpa_semesters?.[i];
        return val != null && val !== 0 ? String(val) : "";
      }));
    } else if (section === "professional") {
      setSelectedSkills(initialData?.skills ?? []);
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
    setIsUploadingAvatar(true);
    const localPreviewUrl = URL.createObjectURL(croppedFile);
    setAvatarSrc(localPreviewUrl);
    try {
      const oldPath = storedImagePath.current;
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath]);
        if (deleteError) console.warn("Could not delete old avatar:", deleteError.message);
      }
      const timestamp = Date.now();
      const newPath = `candidates/${userProfile.id}/profile/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(newPath, croppedFile, {
        upsert: false,
        contentType: croppedFile.type,
      });
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any)
        .from("profiles")
        .update({ avatar_path: newPath })
        .eq("id", userProfile.id);
      if (dbError) throw dbError;
      await supabase.auth.updateUser({ data: { avatar_path: newPath } });

      storedImagePath.current = newPath;
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath);
      setAvatarSrc(`${newPublicUrl}?v=${timestamp}`);
      toast.success("Profile picture updated!");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload profile picture. Please try again.");
      setAvatarSrc(getStorageUrl(supabase, "avatars", storedImagePath.current));
    } finally {
      setIsUploadingAvatar(false);
      URL.revokeObjectURL(localPreviewUrl);
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
        setTempImageSrc(null);
      }
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

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
    if (username && !USERNAME_REGEX.test(username))
      e.username = "3–20 characters: letters, numbers, and underscores only.";
    if (usernameStatus === "taken") e.username = "This username is already taken.";
    if (usernameStatus === "checking") e.username = "Please wait for username availability check.";
    return e;
  }

  function validatePersonal(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    else if (firstName.trim().length < 2) e.firstName = "First name must be at least 2 characters";
    else if (firstName.trim().length > 50) e.firstName = "First name cannot exceed 50 characters";

    if (!middleName.trim()) e.middleName = "Middle name is required";
    else if (middleName.trim().length > 50) e.middleName = "Middle name cannot exceed 50 characters";

    if (!lastName.trim()) e.lastName = "Last name is required";
    else if (lastName.trim().length < 2) e.lastName = "Last name must be at least 2 characters";
    else if (lastName.trim().length > 50) e.lastName = "Last name cannot exceed 50 characters";

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
    if (!instituteId) e.institute = "Institution is required";
    if (!courseName) e.courseName = "Branch/Course is required";
    if (!passoutYear) e.passoutYear = "Expected graduation year is required";

    const currentYear = new Date().getFullYear();
    const gradYear = Number(passoutYear);

    if (gradYear && gradYear < currentYear - 5) {
      e.passoutYear = "Expected graduation year must be a reasonable value.";
    }

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
    if (selectedSkills.length === 0) e.skills = "Select at least one skill";

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
          const trimmedUsername = username.trim() || null;
          if (trimmedUsername !== (userProfile.username ?? null)) {
            const { error } = await (supabase as any)
              .from("profiles")
              .update({ username: trimmedUsername })
              .eq("id", userProfile.id);
            if (error) {
              if (error.code === "23505") {
                setErrors({ username: "This username is already taken." });
                setUsernameStatus("taken");
              } else {
                toast.error("Failed to update username. Please try again.");
              }
              return;
            }
            await supabase.auth.updateUser({ data: { username: trimmedUsername, account_type: userProfile.account_type } });
            if (trimmedUsername) {
              initialUsername.current = trimmedUsername;
              setUsernameStatus("unchanged");
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

          const newDisplayName = [firstName.trim(), lastName.trim()]
            .filter(Boolean).join(" ") || userProfile.display_name;
          await (supabase as any).from("profiles").update({ display_name: newDisplayName, profile_updated: true }).eq("id", userProfile.id);
          await supabase.auth.updateUser({ data: { display_name: newDisplayName, account_type: userProfile.account_type } });
          toast.success("Personal details saved!");
        }

        else if (section === "education") {
          // 1. Save main profile details
          const { error: profileError } = await (supabase as any)
            .from("candidate_profiles")
            .upsert({
              profile_id: userProfile.id,
              course_name: courseName || null,
              passout_year: passoutYear ? Number(passoutYear) : null,
              university_prn: universityPrn.trim() || null,
              sgpa_semesters: sgpaValues.map((v) => v ? Number(v) : 0),
            }, { onConflict: 'profile_id' });

          await (supabase as any)
            .from("profiles")
            .update({ institute_id: instituteId || null })
            .eq("id", userProfile.id);
          if (profileError) {
            if (profileError.code === "PGRST116") {
              toast.error("Please save Personal Details first.");
              return;
            }
            throw profileError;
          }

          // 2. Save SSC Education
          if (sscPercentage && sscPassYear) {
            const { data: sscExist } = await (supabase as any)
              .from("candidate_education")
              .select("id")
              .eq("profile_id", userProfile.id)
              .eq("type", "ssc")
              .maybeSingle();

            const { error: sscError } = await (supabase as any)
              .from("candidate_education")
              .upsert({
                id: sscExist?.id || undefined,
                profile_id: userProfile.id,
                type: "ssc",
                institution_name: sscInstitution.trim() || "High School",
                grade_or_percentage: Number(sscPercentage),
                passout_year: Number(sscPassYear),
              });
            if (sscError) throw sscError;
          }

          // 3. Save HSC Education
          if (isHsc && hscPercentage && hscPassYear) {
            const { data: hscExist } = await (supabase as any)
              .from("candidate_education")
              .select("id")
              .eq("profile_id", userProfile.id)
              .eq("type", "hsc")
              .maybeSingle();

            const { error: hscError } = await (supabase as any)
              .from("candidate_education")
              .upsert({
                id: hscExist?.id || undefined,
                profile_id: userProfile.id,
                type: "hsc",
                institution_name: hscInstitution.trim() || "Junior College",
                grade_or_percentage: Number(hscPercentage),
                passout_year: Number(hscPassYear),
              });
            if (hscError) throw hscError;
          } else {
            await (supabase as any)
              .from("candidate_education")
              .delete()
              .eq("profile_id", userProfile.id)
              .eq("type", "hsc");
          }

          // 4. Save Diploma Education
          if (isDiploma && diplomaPercentage && diplomaPassYear) {
            const { data: dipExist } = await (supabase as any)
              .from("candidate_education")
              .select("id")
              .eq("profile_id", userProfile.id)
              .eq("type", "diploma")
              .maybeSingle();

            const { error: dipError } = await (supabase as any)
              .from("candidate_education")
              .upsert({
                id: dipExist?.id || undefined,
                profile_id: userProfile.id,
                type: "diploma",
                institution_name: diplomaInstitution.trim() || "Diploma Institute",
                grade_or_percentage: Number(diplomaPercentage),
                passout_year: Number(diplomaPassYear),
              });
            if (dipError) throw dipError;
          } else {
            await (supabase as any)
              .from("candidate_education")
              .delete()
              .eq("profile_id", userProfile.id)
              .eq("type", "diploma");
          }

          toast.success("Education details saved!");
        }

        else if (section === "bio") {
          await updateCandidateBioAction(bio);
          toast.success("About summary saved!");
        }

        else if (section === "professional") {
          const { error } = await (supabase as any)
            .from("candidate_profiles")
            .update({
              skills: selectedSkills.length > 0 ? selectedSkills : null,
              linkedin_url: linkedinUrl.trim() || null,
              github_url: githubUrl.trim() || null,
              portfolio_links: portfolioLinks.filter((l) => l.trim()),
            })
            .eq("profile_id", userProfile.id);
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Personal Details first.");
              return;
            }
            throw error;
          }
          toast.success("Professional details saved!");
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

  const handleSaveBio = async () => {
    startTransition(async () => {
      try {
        await updateCandidateBioAction(bio);
        toast.success("About summary saved!");
        setEditingSection(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save bio.");
      }
    });
  };

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
    setCertificationDialogOpen(true);
  };

  const handleEditCertification = (cert: CandidateCertification) => {
    setActiveCertification(cert);
    setCertificationDialogOpen(true);
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size allowed is 5MB.");
      return;
    }
    setUploadingCert(true);
    try {
      const path = `${userProfile.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from("certificates").upload(path, file);
      if (error) throw error;
      setActiveCertification(prev => prev ? { ...prev, certificate_path: data.path } : null);
      toast.success("Certificate document uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file.");
    } finally {
      setUploadingCert(false);
    }
  };

  const handleSaveCertification = async () => {
    if (!activeCertification?.name || !activeCertification?.issuing_org || !activeCertification?.issue_date) {
      toast.error("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      try {
        await saveCertificationAction(activeCertification);
        toast.success("Certification saved successfully!");
        setCertificationDialogOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save certification.");
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
      const fullName = `${firstName} ${lastName}`.trim() || userProfile.display_name;
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

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold font-cirka tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal, academic, and professional details</p>
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

        {/* Account Settings — only shown if username not set */}
        {!initialUsername.current ? (
          <Card className={cn("transition-all duration-200", editing("account") && "border-primary/50 shadow-md ring-1 ring-primary/10")}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Your unique username is used to identify you on the platform</CardDescription>
              </div>
              {!editing("account") && (
                <Button variant="outline" size="sm" onClick={() => openSection("account")}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing("account") ? (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="username">Username</Label>
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
                      3–20 characters: letters, numbers, and underscores only — cannot be changed after saving
                    </p>
                  )}
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
        ) : null}

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
                  Click the avatar or button to upload a new photo.
                </p>
              </div>
            </div>
          </CardContent>
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
              <Button size="sm" onClick={() => handleSaveBio()} disabled={isPending}>
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
                    <Input placeholder="First name" maxLength={50} value={firstName} onChange={(e) => setFirstName(capitalizeFirstLetterOnly(e.target.value))} />
                    <FieldError message={errors.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name<RequiredMark /></Label>
                    <Input placeholder="Middle name" maxLength={50} value={middleName} onChange={(e) => setMiddleName(capitalizeFirstLetterOnly(e.target.value))} />
                    <FieldError message={errors.middleName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name<RequiredMark /></Label>
                    <Input placeholder="Last name" maxLength={50} value={lastName} onChange={(e) => setLastName(capitalizeFirstLetterOnly(e.target.value))} />
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
                          fromYear={1950}
                          toYear={2010}
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
                  <ReadonlyField label="Aadhaar Number" value={aadhaarNumber ? aadhaarNumber.replace(/(.{4})(.{4})(.{4})/, "$1 $2 $3") : null} />
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
                <div className="space-y-2">
                  <Label>Institution<RequiredMark /></Label>
                  <Combobox items={instituteNames} value={instituteName} onValueChange={handleInstituteSelect}>
                    <ComboboxInput placeholder="Search institution…" />
                    <ComboboxContent>
                      <ComboboxEmpty>No institution found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {selectedAffiliation && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Affiliated to {selectedAffiliation}
                    </p>
                  )}
                  <FieldError message={errors.institute} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Branch / Course<RequiredMark /></Label>
                    <Combobox items={availableCourses} value={courseName} onValueChange={(v) => setCourseName(v)} disabled={!instituteId}>
                      <ComboboxInput
                        placeholder={!instituteId ? "Select institution first" : availableCourses.length ? "Select course" : "No courses available"}
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>No course found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    <FieldError message={errors.courseName} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>Expected Graduation Year<RequiredMark /></Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="What is graduation year?">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed p-3">
                            <p className="font-medium mb-1">How to pick the right year?</p>
                            <p>Select the year when you will finish your degree and receive your marksheet/certificate.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Combobox items={PASSOUT_YEAR_OPTIONS} value={passoutYear} onValueChange={(v) => setPassoutYear(v ?? "")}>
                      <ComboboxInput placeholder="Select graduation year" />
                      <ComboboxContent>
                        <ComboboxEmpty>No year found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {errors.passoutYear ? (
                      <FieldError message={errors.passoutYear} />
                    ) : passoutYear ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {getGraduationYearHint(passoutYear)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        The year you will receive your final degree marksheet/certificate
                      </p>
                    )}
                  </div>
                </div>

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
                  <FieldError message={errors.sgpa} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CGPA</Label>
                    <Input
                      value={initialData?.cgpa != null ? initialData.cgpa.toFixed(2) : "—"}
                      disabled
                      className="bg-zinc-50 dark:bg-zinc-900/50 text-muted-foreground border-muted cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground">Calculated and managed directly by the system.</p>
                  </div>
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sgpaValues.map((val, i) => (
                      <div key={i}>
                        <p className="text-[10px] text-muted-foreground">Sem {i + 1}</p>
                        <p className="text-sm font-medium">{val && !isNaN(parseFloat(val)) ? parseFloat(val).toFixed(2) : "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="CGPA" value={initialData?.cgpa != null ? initialData.cgpa.toFixed(2) : "—"} />
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
                <div className="space-y-2" ref={skillsAnchor}>
                  <Label>Skills<RequiredMark /></Label>
                  <Combobox
                    items={SOFTWARE_SKILLS}
                    value={selectedSkills}
                    onValueChange={(v) => setSelectedSkills(v as string[])}
                    multiple
                  >
                    <ComboboxChips>
                      {selectedSkills.map((skill) => (
                        <ComboboxChip key={skill} showRemove>{skill}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder={selectedSkills.length ? "Add more…" : "Search skills…"} />
                    </ComboboxChips>
                    <ComboboxContent>
                      <ComboboxEmpty>No skill found.</ComboboxEmpty>
                      <ComboboxList>
                        {SOFTWARE_SKILLS.map((item) => (
                          <ComboboxItem key={item} value={item}>
                            <ComboboxValue>{item}</ComboboxValue>
                          </ComboboxItem>
                        ))}
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
                      {portfolioLinks.length > 1 && (
                        <Button variant="ghost" size="icon" type="button" onClick={() => removePortfolioLink(index)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
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
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  {selectedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSkills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
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
                    <div className="group relative flex gap-4 items-start py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 pr-16 flex-1">
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
                      <div className="absolute right-0 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                    <div className="group relative flex gap-4 items-start py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <FolderGit2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 pr-16 flex-1">
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
                              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="absolute right-0 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                    <div className="group relative flex gap-4 items-start py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <Award className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 pr-16 flex-1">
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
                      <div className="absolute right-0 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                        <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
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
                  items={SOFTWARE_SKILLS}
                  value={activeProject.skills || []}
                  onValueChange={(v) => setActiveProject(prev => prev ? { ...prev, skills: v as string[] } : null)}
                  multiple
                >
                  <ComboboxChips>
                    {(activeProject.skills || []).map((skill) => (
                      <ComboboxChip key={skill} showRemove>{skill}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder={(activeProject.skills || []).length ? "Add more…" : "Search skills…"} />
                  </ComboboxChips>
                  <ComboboxContent>
                    <ComboboxEmpty>No skill found.</ComboboxEmpty>
                    <ComboboxList>
                      {SOFTWARE_SKILLS.map((item) => (
                        <ComboboxItem key={item} value={item}>
                          <ComboboxValue>{item}</ComboboxValue>
                        </ComboboxItem>
                      ))}
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
                      <><Upload className="h-4 w-4 mr-2" />Upload Document</>
                    )}
                  </Button>
                  {activeCertification.certificate_path && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-4 w-4 text-green-500" /> Document uploaded
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
