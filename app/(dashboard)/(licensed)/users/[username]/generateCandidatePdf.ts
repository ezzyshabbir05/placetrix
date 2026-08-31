import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CandidateEducation,
  CandidateExperience,
  CandidateProject,
  CandidateCertification,
  Skill,
} from "@/types/profile-extensions";
import type { CandidateTestsPerformanceData } from "./AssignedTestsAnalyticsSection";
import type { LogicLabData } from "./CandidateProfileReportView";

interface PublicData {
  profile_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
  gender: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_links: string[] | null;
  course_name: string | null;
  passout_year: number | null;
  university_prn: string | null;
  institute_name: string | null;
  sgpa_semesters: (string | null)[];
}

interface GeneratePdfParams {
  publicData: PublicData;
  educationData: CandidateEducation[];
  experienceData: CandidateExperience[];
  projectsData: CandidateProject[];
  certificationsData: CandidateCertification[];
  allSkills: Skill[];
  selectedSkillIds: string[];
  logicLabData?: LogicLabData | null;
  assignedTestsData?: CandidateTestsPerformanceData | null;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ""}`;
  return `${s}s`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

const EDUCATION_TYPE_LABELS: Record<string, string> = {
  ssc: "Class 10 (SSC)",
  hsc: "Class 12 (HSC)",
  diploma: "Diploma",
  ug: "Undergraduate (UG)",
  pg: "Postgraduate (PG)",
  other: "Other",
};

export function generateCandidatePdfReport({
  publicData,
  educationData,
  experienceData,
  projectsData,
  certificationsData,
  allSkills,
  selectedSkillIds,
  logicLabData,
  assignedTestsData,
}: GeneratePdfParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // ── Helper to check vertical space ──
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = 16;
    }
  };

  // ── Title & Header Bar ──
  const rawInstName = (publicData.institute_name || "OFFICIAL ACADEMIC INSTITUTION").toUpperCase();

  doc.setFont("helvetica", "bold");
  const fontSize = rawInstName.length > 55 ? 9 : rawInstName.length > 35 ? 10 : 11.5;
  doc.setFontSize(fontSize);

  const maxHeaderWidth = pageWidth - margin * 2 - 50; // Leave space for date on right
  const headerLines: string[] = doc.splitTextToSize(rawInstName, maxHeaderWidth);

  const bannerHeight = Math.max(22, 13 + headerLines.length * 4.5);

  doc.setFillColor(15, 23, 42); // Navy Dark (#0f172a)
  doc.rect(margin, currentY, pageWidth - margin * 2, bannerHeight, "F");

  doc.setTextColor(255, 255, 255);
  let lineY = currentY + 6.5;
  for (let i = 0; i < headerLines.length; i++) {
    doc.text(headerLines[i], margin + 6, lineY);
    lineY += 4.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("OFFICIAL STUDENT ACADEMIC & PERFORMANCE PROGRESS REPORT", margin + 6, currentY + bannerHeight - 4);

  const todayStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  doc.setFontSize(7.5);
  doc.text(`Generated: ${todayStr}`, pageWidth - margin - 6, currentY + bannerHeight - 4, { align: "right" });

  currentY += bannerHeight + 6;

  // ── Section 1: Student Profile & Identification ──
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. Student Profile & Identification", margin, currentY);
  currentY += 4;

  const validSgpas = publicData.sgpa_semesters.filter((v): v is string => v !== null && v !== "");
  const cgpa = validSgpas.length > 0
    ? (validSgpas.reduce((sum, v) => sum + parseFloat(v), 0) / validSgpas.length).toFixed(2)
    : "N/A";

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    showHead: "everyPage",
    styles: { overflow: "linebreak", cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { textColor: [30, 41, 59], fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 56 },
      2: { cellWidth: 35, fontStyle: "bold" },
      3: { cellWidth: 56 },
    },
    head: [["Student Field", "Details", "Academic Field", "Details"]],
    body: [
      ["Full Name", publicData.full_name || "—", "Course / Branch", publicData.course_name || "—"],
      ["Username", publicData.username ? `@${publicData.username}` : "—", "University PRN", publicData.university_prn || "—"],
      ["Email Address", publicData.email || "—", "Graduation Year", publicData.passout_year ? String(publicData.passout_year) : "—"],
      ["Gender", publicData.gender || "—", "Cumulative CGPA", cgpa],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ── Section 2: Semester SGPA Breakdown & Previous Education ──
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Academic SGPA & Previous Education Breakdown", margin, currentY);
  currentY += 4;

  const sgpaHeaders = publicData.sgpa_semesters.map((_, i) => `Sem ${i + 1}`);
  const sgpaValues = publicData.sgpa_semesters.map((v) => (v ? `${v}` : "—"));

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "plain",
    showHead: "everyPage",
    styles: { overflow: "linebreak", cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8, halign: "center" },
    bodyStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: "bold", halign: "center" },
    head: [sgpaHeaders],
    body: [sgpaValues],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  if (educationData.length > 0) {
    const eduRows = educationData.map((e) => [
      EDUCATION_TYPE_LABELS[e.type] ?? e.type,
      e.institution_name || "—",
      String(e.passout_year || "—"),
      `${Number(e.grade_or_percentage).toFixed(2)}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" },
        1: { cellWidth: 85 },
        2: { cellWidth: 26, halign: "center" },
        3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      },
      head: [["Education Level", "Institution Name", "Passout Year", "Score / Grade"]],
      body: eduRows,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  } else {
    currentY += 4;
  }

  // ── Section 3: Assigned Tests & Examination Performance ──
  if (assignedTestsData) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. Assigned Tests & Score Performance Summary", margin, currentY);
    currentY += 4;

    const availableAssigned = Math.max(0, assignedTestsData.totalAssigned - assignedTestsData.upcomingCount);
    const completionRate = availableAssigned > 0 ? ((assignedTestsData.completedCount / availableAssigned) * 100).toFixed(0) : "0";

    // Summary Metrics Grid Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "grid",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold", fontSize: 7.5, halign: "center" },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold", halign: "center" },
      head: [["Assigned Tests", "Completed", "Average Score", "Pass Rate", "Total Time Spent", "Question Accuracy", "Proctoring Switches"]],
      body: [[
        `${availableAssigned} Tests`,
        `${assignedTestsData.completedCount} (${completionRate}%)`,
        `${assignedTestsData.averagePercentage.toFixed(1)}%`,
        `${assignedTestsData.passRate.toFixed(1)}% (${assignedTestsData.passCount}P / ${assignedTestsData.failCount}F)`,
        formatDuration(assignedTestsData.totalTimeSpentSeconds),
        `${assignedTestsData.questionStats.accuracyPercentage.toFixed(1)}%`,
        `${assignedTestsData.totalTabSwitches} switches`,
      ]],
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Detailed Tests Table
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Detailed Assigned Tests Table", margin, currentY);
    currentY += 3;

    const testsTableBody = assignedTestsData.testsList
      .filter((t) => t.derivedStatus !== "upcoming")
      .map((t, idx) => {
        const isSubmitted = t.derivedStatus === "completed";
        const score = t.attempt?.score ?? null;
        const totalMarks = t.attempt?.totalMarks ?? null;
        const pct = t.attempt?.percentage ?? (score !== null && totalMarks ? (score / totalMarks) * 100 : null);
        const passThreshold = t.passPercentage ?? 50;
        const isPassed = pct !== null ? pct >= passThreshold : (t.attempt?.passed ?? null);

        let statusText = "Live";
        if (isSubmitted) statusText = "Completed";
        else if (t.derivedStatus === "in_progress") statusText = "In Progress";
        else if (t.derivedStatus === "missed") statusText = "Missed";

        let outcomeText = "—";
        if (isSubmitted) {
          if (isPassed === true) outcomeText = "PASSED";
          else if (isPassed === false) outcomeText = "NEEDS IMPROVEMENT";
          else outcomeText = "SUBMITTED";
        }

        const scoreStr = score !== null && totalMarks ? `${score} / ${totalMarks}` : "—";
        const pctStr = pct !== null ? `${pct.toFixed(1)}%` : "—";
        const timeSpentStr = formatDuration(t.attempt?.activeTimeTaken);
        const tabSwitchesStr = t.attempt ? `${t.attempt.tabSwitchCount} switches` : "0";
        const dateStr = formatDate(t.attempt?.submittedAt);

        return [
          String(idx + 1),
          t.title,
          statusText,
          formatDuration(t.timeLimitSeconds),
          timeSpentStr,
          scoreStr,
          pctStr,
          outcomeText,
          tabSwitchesStr,
          dateStr,
        ];
      });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 38 },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 16, halign: "center" },
        6: { cellWidth: 12, halign: "center" },
        7: { cellWidth: 26, halign: "center", fontStyle: "bold" },
        8: { cellWidth: 16, halign: "center" },
        9: { cellWidth: 20, halign: "center" },
      },
      head: [["#", "Test Title", "Status", "Duration", "Time Spent", "Score", "%", "Outcome", "Proctoring", "Submitted At"]],
      body: testsTableBody.length > 0 ? testsTableBody : [["—", "No assigned tests recorded", "—", "—", "—", "—", "—", "—", "—", "—"]],
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === "PASSED") {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald Green
          } else if (val === "NEEDS IMPROVEMENT") {
            data.cell.styles.textColor = [225, 29, 72]; // Rose Red
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Section 4: LogicLab Coding Performance ──
  if (logicLabData) {
    ensureSpace(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. LogicLab Coding & Problem-Solving Performance", margin, currentY);
    currentY += 4;

    const { streakStats, globalStats } = logicLabData;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "grid",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold", fontSize: 7.5, halign: "center" },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold", halign: "center" },
      head: [["Problems Solved", "Current Streak", "Max Streak", "Active Days", "Easy Solved", "Medium Solved", "Hard Solved"]],
      body: [[
        `${globalStats.solved} / ${globalStats.total}`,
        `${streakStats.currentStreak} days`,
        `${streakStats.maxStreak} days`,
        `${streakStats.totalActiveDays} days`,
        `${globalStats.easy.solved} / ${globalStats.easy.total}`,
        `${globalStats.medium.solved} / ${globalStats.medium.total}`,
        `${globalStats.hard.solved} / ${globalStats.hard.total}`,
      ]],
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // LogicLab Topics Breakdown Table
    if (logicLabData.topics && logicLabData.topics.length > 0) {
      ensureSpace(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Practiced Problem Topics Breakdown", margin, currentY);
      currentY += 3;

      const topicRows = logicLabData.topics.map((tp, i) => {
        const pct = tp.totalCount > 0 ? ((tp.solvedCount / tp.totalCount) * 100).toFixed(0) : "0";
        return [
          String(i + 1),
          tp.name,
          tp.category,
          `${tp.solvedCount} / ${tp.totalCount}`,
          `${pct}%`,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: "striped",
        showHead: "everyPage",
        styles: { overflow: "linebreak", cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { textColor: [30, 41, 59], fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 70 },
          2: { cellWidth: 40, halign: "center" },
          3: { cellWidth: 32, halign: "center" },
          4: { cellWidth: 30, halign: "center", fontStyle: "bold" },
        },
        head: [["#", "Topic Name", "Difficulty Category", "Solved / Total", "Completion %"]],
        body: topicRows,
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // ── Section 5: Verified Technical Skills ──
  const selectedSet = new Set(selectedSkillIds);
  const selectedSkills = allSkills.filter((s) => selectedSet.has(s.id));

  if (selectedSkills.length > 0) {
    ensureSpace(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("5. Verified Technical & Professional Skills", margin, currentY);
    currentY += 4;

    const skillListStr = selectedSkills.map((s) => `${s.name} (${s.category})`).join(", ");

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "plain",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 3 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 8.5, fontStyle: "normal" },
      body: [[skillListStr]],
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Section 6: Work Experience & Projects ──
  if (experienceData.length > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("6. Work Experience & Internships", margin, currentY);
    currentY += 4;

    const expBody = experienceData.map((exp) => [
      exp.title,
      exp.company_name,
      exp.location || "—",
      exp.start_date ? `${exp.start_date.substring(0, 7)} – ${exp.is_current ? "Present" : exp.end_date?.substring(0, 7) || ""}` : "—",
      exp.description || "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold" },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 32, halign: "center" },
        4: { cellWidth: 55 },
      },
      head: [["Role Title", "Company Name", "Location", "Duration", "Description Summary"]],
      body: expBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  if (projectsData.length > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("7. Student Projects", margin, currentY);
    currentY += 4;

    const projBody = projectsData.map((proj) => [
      proj.title,
      proj.associated_with || "Academic / Personal",
      proj.skills && proj.skills.length > 0 ? proj.skills.join(", ") : "—",
      proj.start_date ? `${proj.start_date.substring(0, 7)} – ${proj.is_ongoing ? "Ongoing" : proj.end_date?.substring(0, 7) || ""}` : "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" },
        1: { cellWidth: 40 },
        2: { cellWidth: 62 },
        3: { cellWidth: 35, halign: "center" },
      },
      head: [["Project Title", "Associated With", "Technologies / Skills", "Duration"]],
      body: projBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  if (certificationsData.length > 0) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("8. Professional Certifications", margin, currentY);
    currentY += 4;

    const certBody = certificationsData.map((cert) => [
      cert.name,
      cert.issuing_org,
      cert.credential_id || "—",
      cert.issue_date || "—",
      cert.does_not_expire ? "No Expiry" : cert.expiration_date || "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      showHead: "everyPage",
      styles: { overflow: "linebreak", cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { textColor: [30, 41, 59], fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 26, halign: "center" },
      },
      head: [["Certification Name", "Issuing Organization", "Credential ID", "Issue Date", "Expiration"]],
      body: certBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Running Page Footers ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.text("PlaceTrix - Confidential Student Academic & Performance Progress Report", margin, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  // Download PDF
  const filename = `${(publicData.full_name || "Student").replace(/\s+/g, "_")}_Academic_Report.pdf`;
  doc.save(filename);
}
