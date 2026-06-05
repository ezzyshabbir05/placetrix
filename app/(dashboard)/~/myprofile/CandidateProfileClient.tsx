"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/lib/supabase/profile";
import { updateCandidatePersonalDetails } from "./actions";
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
  Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput,
  ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem,
  ComboboxList, ComboboxValue, useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import {
  Upload, Plus, Minus, Copy, CalendarIcon, Loader2, Camera,
  CheckCircle2, XCircle, AtSign, ShieldAlert, HelpCircle,
  Pencil, X, Info, CheckCircle, User, GraduationCap, Briefcase,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "account" | "personal" | "education" | "professional";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged";

interface InstituteOption {
  profile_id: string;
  institute_name: string;
  courses: string[] | null;
  affiliation: string | null;
}

interface Props {
  userProfile: UserProfile;
  initialData: Record<string, any> | null;
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

export function CandidateProfileClient({ userProfile, initialData }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isFirstTime = !initialData?.profile_updated;
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
  const storedImagePath = useRef<string | null>(initialData?.profile_image_path ?? null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(
    getStorageUrl(supabase, "avatars", storedImagePath.current)
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  // Education
  const [instituteId, setInstituteId] = useState<string>(initialData?.institute_id ?? "");
  const [instituteName, setInstituteName] = useState("");
  const [courseName, setCourseName] = useState(initialData?.course_name ?? "");
  const [passoutYear, setPassoutYear] = useState(
    initialData?.passout_year ? String(initialData.passout_year) : ""
  );
  const [sscPercentage, setSscPercentage] = useState(
    initialData?.ssc_percentage != null ? String(initialData.ssc_percentage) : ""
  );
  const [sscPassYear, setSscPassYear] = useState(
    initialData?.ssc_pass_year ? String(initialData.ssc_pass_year) : ""
  );
  const [isHsc, setIsHsc] = useState(initialData?.is_hsc ?? false);
  const [hscPercentage, setHscPercentage] = useState(
    initialData?.hsc_percentage != null ? String(initialData.hsc_percentage) : ""
  );
  const [hscPassYear, setHscPassYear] = useState(
    initialData?.hsc_pass_year ? String(initialData.hsc_pass_year) : ""
  );
  const [isDiploma, setIsDiploma] = useState(initialData?.is_diploma ?? false);
  const [diplomaPercentage, setDiplomaPercentage] = useState(
    initialData?.diploma_percentage != null ? String(initialData.diploma_percentage) : ""
  );
  const [diplomaPassYear, setDiplomaPassYear] = useState(
    initialData?.diploma_pass_year ? String(initialData.diploma_pass_year) : ""
  );
  const [universityPrn, setUniversityPrn] = useState(initialData?.university_prn ?? "");
  const [sgpaValues, setSgpaValues] = useState<string[]>(
    Array.from({ length: 8 }, (_, i) => {
      const val = initialData?.[`sgpa_sem${i + 1}`];
      return val != null ? String(val) : "";
    })
  );

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
    initialData?.institute_id && initialData?.course_name &&
    initialData?.passout_year && initialData?.ssc_percentage
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
        .from("institute_profiles")
        .select("profile_id, institute_name, courses, affiliation")
        .order("institute_name");
      if (data) {
        setInstitutes(data);
        if (initialData?.institute_id) {
          const found = data.find((i: any) => i.profile_id === initialData.institute_id);
          if (found) {
            setInstituteName(found.institute_name);
            setAvailableCourses(found.courses ?? []);
            setSelectedAffiliation(found.affiliation ?? null);
          }
        }
      }
    })();
  }, []);

  useEffect(() => {
    const found = institutes.find((i) => i.profile_id === instituteId);
    if (found) {
      setAvailableCourses(found.courses ?? []);
      setSelectedAffiliation(found.affiliation ?? null);
      if (!found.courses?.includes(courseName)) setCourseName("");
    }
  }, [instituteId]);

  // ─── Section open/close ──────────────────────────────────────────────────────

  function openSection(section: SectionId) {
    if (editingSection && editingSection !== section) {
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
      setInstituteId(initialData?.institute_id ?? "");
      setCourseName(initialData?.course_name ?? "");
      setPassoutYear(initialData?.passout_year ? String(initialData.passout_year) : "");
      setSscPercentage(initialData?.ssc_percentage != null ? String(initialData.ssc_percentage) : "");
      setSscPassYear(initialData?.ssc_pass_year ? String(initialData.ssc_pass_year) : "");
      setIsHsc(initialData?.is_hsc ?? false);
      setHscPercentage(initialData?.hsc_percentage != null ? String(initialData.hsc_percentage) : "");
      setHscPassYear(initialData?.hsc_pass_year ? String(initialData.hsc_pass_year) : "");
      setIsDiploma(initialData?.is_diploma ?? false);
      setDiplomaPercentage(initialData?.diploma_percentage != null ? String(initialData.diploma_percentage) : "");
      setDiplomaPassYear(initialData?.diploma_pass_year ? String(initialData.diploma_pass_year) : "");
      setUniversityPrn(initialData?.university_prn ?? "");
      setSgpaValues(Array.from({ length: 8 }, (_, i) => {
        const val = initialData?.[`sgpa_sem${i + 1}`]; return val != null ? String(val) : "";
      }));
    } else if (section === "professional") {
      setSelectedSkills(initialData?.skills ?? []);
      setLinkedinUrl(initialData?.linkedin_url ?? "");
      setGithubUrl(initialData?.github_url ?? "");
      setPortfolioLinks(initialData?.portfolio_links?.length ? initialData.portfolio_links : [""]);
    }
    setEditingSection(null);
  }

  // ─── Avatar upload ───────────────────────────────────────────────────────────

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be smaller than 2 MB.");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setAvatarSrc(blobUrl);
    setIsUploadingAvatar(true);
    try {
      const oldPath = storedImagePath.current;
      if (oldPath) {
        const { error: deleteError } = await supabase.storage.from("avatars").remove([oldPath]);
        if (deleteError) console.warn("Could not delete old avatar:", deleteError.message);
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const timestamp = Date.now();
      const newPath = `candidates/${userProfile.id}/profile/${timestamp}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(newPath, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: dbError } = await (supabase as any)
        .from("candidate_profiles")
        .upsert({ profile_id: userProfile.id, profile_image_path: newPath }, { onConflict: "profile_id" });
      if (dbError) throw dbError;

      await (supabase as any).from("profiles").update({ avatar_path: newPath }).eq("id", userProfile.id);
      await supabase.auth.updateUser({ data: { avatar_path: newPath } });

      storedImagePath.current = newPath;
      const newPublicUrl = getStorageUrl(supabase, "avatars", newPath);
      setAvatarSrc(`${newPublicUrl}?v=${timestamp}`);
      URL.revokeObjectURL(blobUrl);
      toast.success("Profile picture updated!");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload profile picture. Please try again.");
      setAvatarSrc(getStorageUrl(supabase, "avatars", storedImagePath.current));
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsUploadingAvatar(false);
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
      setInstituteId(found.profile_id);
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
    setPortfolioLinks((prev) => { const u = [...prev]; u[index] = value; return u; });
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
    if (!middleName.trim()) e.middleName = "Middle name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!gender) e.gender = "Gender is required";
    if (!phoneNumber.trim()) e.phoneNumber = "Contact number is required";
    else if (!/^[0-9]{10}$/.test(phoneNumber)) e.phoneNumber = "Must be exactly 10 digits";
    if (!dateOfBirth) e.dateOfBirth = "Date of birth is required";
    if (aadhaarNumber && !aadhaarNumber.includes("*") && !/^[0-9]{12}$/.test(aadhaarNumber))
      e.aadhaarNumber = "Aadhaar must be exactly 12 digits";
    return e;
  }

  function validateEducation(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!instituteId) e.institute = "Institution is required";
    if (!courseName) e.courseName = "Branch/Course is required";
    if (!passoutYear) e.passoutYear = "Expected graduation year is required";
    if (!sscPercentage) e.sscPercentage = "SSC percentage is required";
    if (!sscPassYear) e.sscPassYear = "SSC passing year is required";
    if (!isHsc && !isDiploma) e.educationAfterSsc = "Select at least one option (HSC or Diploma)";
    if (isHsc && !hscPercentage) e.hscPercentage = "HSC percentage is required";
    if (isHsc && !hscPassYear) e.hscPassYear = "HSC passing year is required";
    if (isDiploma && !diplomaPercentage) e.diplomaPercentage = "Diploma percentage is required";
    if (isDiploma && !diplomaPassYear) e.diplomaPassYear = "Diploma passing year is required";
    return e;
  }

  function validateProfessional(): Record<string, string> {
    const e: Record<string, string> = {};
    if (selectedSkills.length === 0) e.skills = "Select at least one skill";
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
            profile_updated: true,
          };
          await updateCandidatePersonalDetails(payload);

          const newDisplayName = [firstName.trim(), lastName.trim()]
            .filter(Boolean).join(" ") || userProfile.display_name;
          await (supabase as any).from("profiles").update({ display_name: newDisplayName }).eq("id", userProfile.id);
          await supabase.auth.updateUser({ data: { display_name: newDisplayName, account_type: userProfile.account_type } });
          toast.success("Personal details saved!");
        }

        else if (section === "education") {
          const { error } = await (supabase as any)
            .from("candidate_profiles")
            .update({
              institute_id: instituteId || null,
              course_name: courseName || null,
              passout_year: passoutYear ? Number(passoutYear) : null,
              ssc_percentage: sscPercentage ? Number(sscPercentage) : null,
              ssc_pass_year: sscPassYear ? Number(sscPassYear) : null,
              is_hsc: isHsc,
              hsc_percentage: isHsc && hscPercentage ? Number(hscPercentage) : null,
              hsc_pass_year: isHsc && hscPassYear ? Number(hscPassYear) : null,
              is_diploma: isDiploma,
              diploma_percentage: isDiploma && diplomaPercentage ? Number(diplomaPercentage) : null,
              diploma_pass_year: isDiploma && diplomaPassYear ? Number(diplomaPassYear) : null,
              university_prn: universityPrn.trim() || null,
              sgpa_sem1: sgpaValues[0] ? Number(sgpaValues[0]) : null,
              sgpa_sem2: sgpaValues[1] ? Number(sgpaValues[1]) : null,
              sgpa_sem3: sgpaValues[2] ? Number(sgpaValues[2]) : null,
              sgpa_sem4: sgpaValues[3] ? Number(sgpaValues[3]) : null,
              sgpa_sem5: sgpaValues[4] ? Number(sgpaValues[4]) : null,
              sgpa_sem6: sgpaValues[5] ? Number(sgpaValues[5]) : null,
              sgpa_sem7: sgpaValues[6] ? Number(sgpaValues[6]) : null,
              sgpa_sem8: sgpaValues[7] ? Number(sgpaValues[7]) : null,
              profile_updated: true,
            })
            .eq("profile_id", userProfile.id);
          if (error) {
            if (error.code === "PGRST116") {
              toast.error("Please save Personal Details first.");
              return;
            }
            throw error;
          }
          toast.success("Education details saved!");
        }

        else if (section === "professional") {
          const { error } = await (supabase as any)
            .from("candidate_profiles")
            .update({
              skills: selectedSkills.length > 0 ? selectedSkills : null,
              linkedin_url: linkedinUrl.trim() || null,
              github_url: githubUrl.trim() || null,
              portfolio_links: portfolioLinks.filter((l) => l.trim()),
              profile_updated: true,
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

  // ─── Render ───────────────────────────────────────────────────────────────────

  const instituteNames = institutes.map((i) => i.institute_name);
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
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
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
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>JPEG, PNG or WEBP · max 2 MB · square recommended</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarSrc ?? undefined} alt="Profile picture" className="object-cover" />
                  <AvatarFallback className="text-xl font-semibold">
                    {getInitials(firstName, lastName, userProfile.email)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Change profile picture"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isUploadingAvatar
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="space-y-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar}>
                  {isUploadingAvatar
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                    : <><Upload className="h-4 w-4 mr-2" />Upload Photo</>}
                </Button>
                <p className="text-xs text-muted-foreground">Square image recommended · max 2 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
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
                    <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(capitalizeFirstLetterOnly(e.target.value))} />
                    <FieldError message={errors.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name<RequiredMark /></Label>
                    <Input placeholder="Middle name" value={middleName} onChange={(e) => setMiddleName(capitalizeFirstLetterOnly(e.target.value))} />
                    <FieldError message={errors.middleName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name<RequiredMark /></Label>
                    <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(capitalizeFirstLetterOnly(e.target.value))} />
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
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  )}

                  {isDiploma && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>University PRN</Label>
                  <Input placeholder="University PRN / Enrollment number" value={universityPrn} onChange={(e) => setUniversityPrn(e.target.value)} />
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
                  <ReadonlyField label="SSC Percentage" value={sscPercentage ? `${sscPercentage}%` : null} />
                  <ReadonlyField label="SSC Passing Year" value={sscPassYear} />
                  <ReadonlyField label="HSC Percentage" value={isHsc && hscPercentage ? `${hscPercentage}%` : null} />
                  <ReadonlyField label="HSC Passing Year" value={isHsc ? hscPassYear : null} />
                  <ReadonlyField label="Diploma Percentage" value={isDiploma && diplomaPercentage ? `${diplomaPercentage}%` : null} />
                  <ReadonlyField label="Diploma Passing Year" value={isDiploma ? diplomaPassYear : null} />
                </div>

                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <ReadonlyField label="University PRN" value={universityPrn} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Semester SGPA</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sgpaValues.map((val, i) => (
                      <div key={i} className="bg-secondary/40 rounded p-2 text-left border border-muted/20">
                        <p className="text-[10px] text-muted-foreground">Sem {i + 1}</p>
                        <p className="text-sm font-medium">{val || "—"}</p>
                      </div>
                    ))}
                  </div>
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
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
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
                    <Input placeholder="https://linkedin.com/in/yourprofile" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input placeholder="https://github.com/yourusername" type="url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
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

      </div>
    </div>
  );
}
