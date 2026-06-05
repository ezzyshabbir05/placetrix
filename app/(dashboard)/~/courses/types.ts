export interface Module {
  id: string
  title: string
  description?: string
  type: "video" | "text" | "test"
  completed: boolean
  duration?: string
}

export interface Course {
  id: string
  title: string
  description: string
  category: "Core CS" | "Web Development" | "Interview Prep" | "System Design"
  level: "Beginner" | "Intermediate" | "Advanced"
  duration: string
  type: "Specialization" | "Professional Certificate" | "Course"
  badge?: string
  partner: {
    name: string
    logo: string
    logoBg: string
  }
  instructor: {
    name: string
    role: string
    avatar: string
  }
  modules: Module[]
}

export const INITIAL_COURSES: Course[] = [
  {
    id: "algo-ds-masterclass",
    title: "Algorithms & Data Structures Masterclass",
    description: "Master complex algorithms and data structures to ace your technical interviews. Covers trees, graphs, dynamic programming, and system design basics.",
    category: "Core CS",
    level: "Advanced",
    duration: "24h 15m",
    type: "Specialization",
    badge: "Popular",
    partner: {
      name: "CS Foundation",
      logo: "C",
      logoBg: "bg-indigo-600"
    },
    instructor: {
      name: "Dr. Evelyn Vance",
      role: "Ex-Google Staff Engineer",
      avatar: "EV"
    },
    modules: [
      {
        id: "m1",
        title: "Complexity Analysis & Arrays",
        description: "Understand Big-O notation, space-time complexity, and basic memory allocations.",
        type: "text",
        completed: true,
        duration: "45 min"
      },
      {
        id: "m2",
        title: "Linked Lists, Stacks & Queues",
        description: "Learn pointer manipulation, linear structures, and their applications.",
        type: "text",
        completed: false,
        duration: "50 min"
      },
      {
        id: "m3",
        title: "Trees, BSTs & Tries",
        description: "Master hierarchical data structures and search trees.",
        type: "text",
        completed: false,
        duration: "60 min"
      },
      {
        id: "m4",
        title: "Graph Algorithms & Traversals",
        description: "Navigate complex node structures and find shortest paths.",
        type: "text",
        completed: false,
        duration: "45 min"
      }
    ]
  },
  {
    id: "nextjs-supabase-dev",
    title: "Full-Stack Development with Next.js & Supabase",
    description: "Build modern, scalable web applications using Next.js App Router, Tailwind CSS, and Supabase for database and authentication.",
    category: "Web Development",
    level: "Intermediate",
    duration: "18h 30m",
    type: "Professional Certificate",
    badge: "Bestseller",
    partner: {
      name: "Vercel & Supabase Partner",
      logo: "S",
      logoBg: "bg-emerald-600"
    },
    instructor: {
      name: "Marcus Chen",
      role: "Lead Frontend Architect",
      avatar: "MC"
    },
    modules: [
      {
        id: "n-m1",
        title: "Next.js App Router Foundations",
        description: "Understand layouts, nested routing, and Server vs Client Components.",
        type: "text",
        completed: true,
        duration: "40 min"
      },
      {
        id: "n-m2",
        title: "Database Schema & Supabase Setup",
        description: "Set up your database, migrations, and Row Level Security (RLS).",
        type: "text",
        completed: false,
        duration: "35 min"
      },
      {
        id: "n-m3",
        title: "Authentication & Route Protection",
        description: "Secure your pages with SSR Auth and Supabase Guard Middleware.",
        type: "text",
        completed: false,
        duration: "45 min"
      }
    ]
  },
  {
    id: "behavioral-interviews-soft-skills",
    title: "Behavioral Interviewing & Soft Skills for Tech",
    description: "Learn how to structure your answers using the STAR method, answer tricky behavioral questions, and showcase leadership.",
    category: "Interview Prep",
    level: "Beginner",
    duration: "6h 45m",
    type: "Course",
    badge: "Job Skills",
    partner: {
      name: "Placetrix Academy",
      logo: "P",
      logoBg: "bg-amber-600"
    },
    instructor: {
      name: "Sarah Jenkins",
      role: "HR Director at Tech Corp",
      avatar: "SJ"
    },
    modules: [
      {
        id: "b-m1",
        title: "Understanding Behavioral Interviews",
        description: "Why tech companies test behaviors and how rubrics evaluate candidates.",
        type: "text",
        completed: true,
        duration: "30 min"
      },
      {
        id: "b-m2",
        title: "The STAR Method Demystified",
        description: "Situation, Task, Action, and Result formatting for maximum impact.",
        type: "text",
        completed: true,
        duration: "35 min"
      },
      {
        id: "b-m3",
        title: "Crafting Your Stories",
        description: "Write and polish stories about conflict, collaboration, and learning.",
        type: "text",
        completed: false,
        duration: "45 min"
      }
    ]
  },
  {
    id: "system-design-scale",
    title: "System Design at Scale",
    description: "Learn how to design highly scalable, fault-tolerant distributed systems. Covers caching, load balancing, sharding, and real-world system architecture.",
    category: "System Design",
    level: "Advanced",
    duration: "14h 20m",
    type: "Specialization",
    badge: "Bestseller",
    partner: {
      name: "Scale Architect Group",
      logo: "A",
      logoBg: "bg-purple-600"
    },
    instructor: {
      name: "Alex Mercer",
      role: "Principal Infrastructure Architect",
      avatar: "AM"
    },
    modules: [
      {
        id: "s-m1",
        title: "Foundations of Distributed Systems",
        description: "Scale from single servers to global networks.",
        type: "text",
        completed: false,
        duration: "50 min"
      },
      {
        id: "s-m2",
        title: "Storage Systems & Caching",
        description: "Designing efficient read and write paths.",
        type: "text",
        completed: false,
        duration: "45 min"
      }
    ]
  },
  {
    id: "google-data-analytics",
    title: "Google Data Analytics Professional Certificate",
    description: "Gain in-demand skills that will prepare you for an entry-level job. Learn how to process and analyze data.",
    category: "System Design",
    level: "Beginner",
    duration: "32h 45m",
    type: "Professional Certificate",
    badge: "Job Skills",
    partner: {
      name: "Google",
      logo: "G",
      logoBg: "bg-red-500"
    },
    instructor: {
      name: "Sarah Jenkins",
      role: "Lead Google Data Analyst",
      avatar: "G"
    },
    modules: [
      {
        id: "g1",
        title: "Introducing Data Analytics",
        description: "Understand the core processes of data analytics.",
        type: "text",
        completed: false,
        duration: "30 min"
      }
    ]
  },
  {
    id: "foundations-data-everywhere",
    title: "Foundations: Data, Data, Everywhere",
    description: "This is the first course in the Google Data Analytics Professional Certificate. You will be introduced to data analytics.",
    category: "System Design",
    level: "Beginner",
    duration: "8h 12m",
    type: "Course",
    badge: "Bestseller",
    partner: {
      name: "Google",
      logo: "G",
      logoBg: "bg-red-500"
    },
    instructor: {
      name: "Marcus Chen",
      role: "Google Course Instructor",
      avatar: "G"
    },
    modules: [
      {
        id: "gd1",
        title: "Data and Decisions Foundations",
        description: "Learn how data is structured and stored.",
        type: "text",
        completed: false,
        duration: "40 min"
      }
    ]
  },
  {
    id: "python-for-everybody",
    title: "Python for Everybody Specialization",
    description: "Learn to program and analyze data with Python. Develop programs to clean, analyze, and visualize data.",
    category: "Core CS",
    level: "Beginner",
    duration: "10h 15m",
    type: "Specialization",
    badge: "Popular",
    partner: {
      name: "University of Michigan",
      logo: "M",
      logoBg: "bg-blue-600"
    },
    instructor: {
      name: "Dr. Evelyn Vance",
      role: "UMich Adjunct Professor",
      avatar: "UM"
    },
    modules: [
      {
        id: "py1",
        title: "Python Basics",
        description: "Understand variables, types, and mathematical operations.",
        type: "text",
        completed: false,
        duration: "30 min"
      }
    ]
  },
  {
    id: "programming-for-everybody",
    title: "Programming for Everybody (Getting Started with Python)",
    description: "This course teaches the basics of programming computers using Python, covering fundamental variables and loops.",
    category: "Core CS",
    level: "Beginner",
    duration: "6h 20m",
    type: "Course",
    badge: "Bestseller",
    partner: {
      name: "University of Michigan",
      logo: "M",
      logoBg: "bg-blue-600"
    },
    instructor: {
      name: "Alex Mercer",
      role: "UMich Course Instructor",
      avatar: "UM"
    },
    modules: [
      {
        id: "pye1",
        title: "Getting Started with Code",
        description: "Learn how to write your first Python statements.",
        type: "text",
        completed: false,
        duration: "40 min"
      }
    ]
  }
]
