export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      candidate_academic_details: {
        Row: {
          course_id: string | null
          passout_year: number | null
          profile_id: string
          university_prn: string | null
        }
        Insert: {
          course_id?: string | null
          passout_year?: number | null
          profile_id: string
          university_prn?: string | null
        }
        Update: {
          course_id?: string | null
          passout_year?: number | null
          profile_id?: string
          university_prn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_academic_details_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "institute_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_academic_details_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_certifications: {
        Row: {
          certificate_path: string | null
          created_at: string
          credential_id: string | null
          credential_url: string | null
          does_not_expire: boolean
          expiration_date: string | null
          id: string
          issue_date: string
          issuing_org: string
          name: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          certificate_path?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          does_not_expire?: boolean
          expiration_date?: string | null
          id?: string
          issue_date: string
          issuing_org: string
          name: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          certificate_path?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          does_not_expire?: boolean
          expiration_date?: string | null
          id?: string
          issue_date?: string
          issuing_org?: string
          name?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_certifications_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education: {
        Row: {
          course_or_stream: string | null
          created_at: string
          grade_or_percentage: number
          id: string
          institution_name: string | null
          passout_year: number
          profile_id: string
          type: string
          updated_at: string
        }
        Insert: {
          course_or_stream?: string | null
          created_at?: string
          grade_or_percentage: number
          id?: string
          institution_name?: string | null
          passout_year: number
          profile_id: string
          type: string
          updated_at?: string
        }
        Update: {
          course_or_stream?: string | null
          created_at?: string
          grade_or_percentage?: number
          id?: string
          institution_name?: string | null
          passout_year?: number
          profile_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_education_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_experiences: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          profile_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          profile_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          profile_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_experiences_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_projects: {
        Row: {
          associated_with: string | null
          created_at: string
          description: string
          end_date: string | null
          id: string
          is_ongoing: boolean
          profile_id: string
          project_url: string | null
          skills: string[] | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          associated_with?: string | null
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          is_ongoing?: boolean
          profile_id: string
          project_url?: string | null
          skills?: string[] | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          associated_with?: string | null
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          is_ongoing?: boolean
          profile_id?: string
          project_url?: string | null
          skills?: string[] | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_projects_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_semester_grades: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          semester_number: number
          sgpa: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          semester_number: number
          sgpa?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          semester_number?: number
          sgpa?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_semester_grades_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          skill_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_skill_id_fkey"
            columns: ["skill_id"]
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      changelogs: {
        Row: {
          categories: Json
          created_at: string
          date: string
          id: string
          is_published: boolean
          title: string
          version: string
        }
        Insert: {
          categories?: Json
          created_at?: string
          date?: string
          id?: string
          is_published?: boolean
          title: string
          version: string
        }
        Update: {
          categories?: Json
          created_at?: string
          date?: string
          id?: string
          is_published?: boolean
          title?: string
          version?: string
        }
        Relationships: []
      }
      cohort_students: {
        Row: {
          cohort_id: string
          created_at: string
          student_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          student_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_students_cohort_id_fkey"
            columns: ["cohort_id"]
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_students_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institute_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institute_id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          issued_to_name: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          issued_to_name: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          issued_to_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_module_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          id: string
          module_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          id?: string
          module_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          id?: string
          module_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_module_progress_module_id_fkey"
            columns: ["module_id"]
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_module_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          min_duration: number | null
          order_index: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          min_duration?: number | null
          order_index?: number
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          min_duration?: number | null
          order_index?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          description: string
          duration: string
          id: string
          instructor_id: string | null
          is_published: boolean
          level: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: string
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          level?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: string
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          level?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_agenda: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          order_index: number
          start_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          order_index: number
          start_time: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          order_index?: number
          start_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_agenda_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_cohorts: {
        Row: {
          cohort_id: string
          event_id: string
        }
        Insert: {
          cohort_id: string
          event_id: string
        }
        Update: {
          cohort_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_cohorts_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          candidate_id: string
          comment: string | null
          created_at: string | null
          event_id: string
          id: string
          rating: number
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          comment?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          attendance_status: string
          candidate_id: string
          created_at: string
          event_id: string
          id: string
          marked_present_at: string | null
          rsvp_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_status?: string
          candidate_id: string
          created_at?: string
          event_id: string
          id?: string
          marked_present_at?: string | null
          rsvp_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_status?: string
          candidate_id?: string
          created_at?: string
          event_id?: string
          id?: string
          marked_present_at?: string | null
          rsvp_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number
          created_at: string
          date: string
          description: string | null
          duration_minutes: number
          event_banner: string | null
          id: string
          institute_id: string
          reminder_1h_sent: boolean
          reminder_24h_sent: boolean
          speaker_name: string | null
          status: string
          targeting_rules: Json
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          capacity: number
          created_at?: string
          date: string
          description?: string | null
          duration_minutes?: number
          event_banner?: string | null
          id?: string
          institute_id: string
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          speaker_name?: string | null
          status?: string
          targeting_rules?: Json
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          capacity?: number
          created_at?: string
          date?: string
          description?: string | null
          duration_minutes?: number
          event_banner?: string | null
          id?: string
          institute_id?: string
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          speaker_name?: string | null
          status?: string
          targeting_rules?: Json
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_courses: {
        Row: {
          course_name: string
          created_at: string
          id: string
          institute_id: string
          semesters_count: number
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          id?: string
          institute_id: string
          semesters_count?: number
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          id?: string
          institute_id?: string
          semesters_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institute_courses_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_licenses: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          institute_id: string
          notes: string | null
          plan_name: string
          starts_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          institute_id: string
          notes?: string | null
          plan_name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          institute_id?: string
          notes?: string | null
          plan_name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institute_licenses_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institute_profiles: {
        Row: {
          created_at: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institute_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          address: string | null
          affiliation: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          established_year: number | null
          id: string
          institute_code: string | null
          institute_name: string
          logo_path: string | null
          phone_number: string | null
          pincode: string | null
          principal_email: string | null
          principal_name: string | null
          principal_phone: string | null
          social_links: string[] | null
          state: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          affiliation?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          institute_code?: string | null
          institute_name: string
          logo_path?: string | null
          phone_number?: string | null
          pincode?: string | null
          principal_email?: string | null
          principal_name?: string | null
          principal_phone?: string | null
          social_links?: string[] | null
          state?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          affiliation?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          institute_code?: string | null
          institute_name?: string
          logo_path?: string | null
          phone_number?: string | null
          pincode?: string | null
          principal_email?: string | null
          principal_name?: string | null
          principal_phone?: string | null
          social_links?: string[] | null
          state?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      logiclab_badges: {
        Row: {
          badge_category: string
          created_at: string | null
          description: string | null
          icon_name: string
          id: string
          name: string
        }
        Insert: {
          badge_category: string
          created_at?: string | null
          description?: string | null
          icon_name: string
          id?: string
          name: string
        }
        Update: {
          badge_category?: string
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      logiclab_daily_challenge_submissions: {
        Row: {
          code: string
          created_at: string
          daily_challenge_id: string
          date: string
          failed_test_case_info: Json | null
          id: string
          language_id: number
          memory: number | null
          passed_count: number | null
          problem_id: string
          runtime: number | null
          status: string
          total_count: number | null
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          daily_challenge_id: string
          date: string
          failed_test_case_info?: Json | null
          id?: string
          language_id: number
          memory?: number | null
          passed_count?: number | null
          problem_id: string
          runtime?: number | null
          status?: string
          total_count?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          daily_challenge_id?: string
          date?: string
          failed_test_case_info?: Json | null
          id?: string
          language_id?: number
          memory?: number | null
          passed_count?: number | null
          problem_id?: string
          runtime?: number | null
          status?: string
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_daily_challenge_submissions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logiclab_daily_challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_daily_challenges: {
        Row: {
          created_at: string
          date: string
          id: string | null
          problem_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string | null
          problem_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_daily_challenges_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_problem_notes: {
        Row: {
          attached_code: string | null
          attached_language: string | null
          content: string
          created_at: string | null
          id: string
          is_public: boolean
          problem_id: string
          updated_at: string | null
          upvotes_count: number
          user_id: string
        }
        Insert: {
          attached_code?: string | null
          attached_language?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_public?: boolean
          problem_id: string
          updated_at?: string | null
          upvotes_count?: number
          user_id: string
        }
        Update: {
          attached_code?: string | null
          attached_language?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_public?: boolean
          problem_id?: string
          updated_at?: string | null
          upvotes_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_problem_notes_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logiclab_problem_notes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_problem_notes_upvotes: {
        Row: {
          created_at: string | null
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_problem_notes_upvotes_note_id_fkey"
            columns: ["note_id"]
            referencedRelation: "logiclab_problem_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logiclab_problem_notes_upvotes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_problem_submissions: {
        Row: {
          code: string
          created_at: string
          failed_test_case_info: Json | null
          id: string
          language_id: number
          memory: number | null
          passed_count: number | null
          problem_id: string
          runtime: number | null
          status: string
          total_count: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          failed_test_case_info?: Json | null
          id?: string
          language_id: number
          memory?: number | null
          passed_count?: number | null
          problem_id: string
          runtime?: number | null
          status: string
          total_count?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          failed_test_case_info?: Json | null
          id?: string
          language_id?: number
          memory?: number | null
          passed_count?: number | null
          problem_id?: string
          runtime?: number | null
          status?: string
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_problem_submissions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logiclab_problem_submissions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_problems: {
        Row: {
          boilerplates: Json
          constraints: Json | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          driver_codes: Json
          id: string
          memory_limit: number | null
          number: number
          tags: string[] | null
          test_cases: Json
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          boilerplates?: Json
          constraints?: Json | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty: string
          driver_codes?: Json
          id?: string
          memory_limit?: number | null
          number: number
          tags?: string[] | null
          test_cases?: Json
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          boilerplates?: Json
          constraints?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          driver_codes?: Json
          id?: string
          memory_limit?: number | null
          number?: number
          tags?: string[] | null
          test_cases?: Json
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      logiclab_user_solved_problems: {
        Row: {
          problem_id: string
          solved_at: string | null
          user_id: string
        }
        Insert: {
          problem_id: string
          solved_at?: string | null
          user_id: string
        }
        Update: {
          problem_id?: string
          solved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_user_solved_problems_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logiclab_user_solved_problems_user_id_profiles_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_user_stats: {
        Row: {
          created_at: string
          current_streak: number
          easy_solved: number
          flawless_streak: number
          hard_solved: number
          last_potd_date: string | null
          last_solve_date: string | null
          longest_streak: number
          medium_solved: number
          potd_streak: number
          solved_count: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          easy_solved?: number
          flawless_streak?: number
          hard_solved?: number
          last_potd_date?: string | null
          last_solve_date?: string | null
          longest_streak?: number
          medium_solved?: number
          potd_streak?: number
          solved_count?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          easy_solved?: number
          flawless_streak?: number
          hard_solved?: number
          last_potd_date?: string | null
          last_solve_date?: string | null
          longest_streak?: number
          medium_solved?: number
          potd_streak?: number
          solved_count?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_logiclab_user_stats_profiles"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          application_link: string | null
          bond_details: string | null
          collect_resume: boolean
          company_id: string
          compensation_type: string
          created_at: string
          created_by: string | null
          ctc_lpa: number | null
          deadline: string
          id: string
          institute_id: string
          job_description: string | null
          job_role: string
          job_timing: string | null
          job_type: string | null
          location: string | null
          min_cgpa: number
          perks: string | null
          requirements: string | null
          roles_responsibilities: string | null
          status: string
          stipend_monthly: number | null
          title: string
          updated_at: string
        }
        Insert: {
          application_link?: string | null
          bond_details?: string | null
          collect_resume?: boolean
          company_id: string
          compensation_type: string
          created_at?: string
          created_by?: string | null
          ctc_lpa?: number | null
          deadline: string
          id?: string
          institute_id: string
          job_description?: string | null
          job_role: string
          job_timing?: string | null
          job_type?: string | null
          location?: string | null
          min_cgpa?: number
          perks?: string | null
          requirements?: string | null
          roles_responsibilities?: string | null
          status?: string
          stipend_monthly?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          application_link?: string | null
          bond_details?: string | null
          collect_resume?: boolean
          company_id?: string
          compensation_type?: string
          created_at?: string
          created_by?: string | null
          ctc_lpa?: number | null
          deadline?: string
          id?: string
          institute_id?: string
          job_description?: string | null
          job_role?: string
          job_timing?: string | null
          job_type?: string | null
          location?: string | null
          min_cgpa?: number
          perks?: string | null
          requirements?: string | null
          roles_responsibilities?: string | null
          status?: string
          stipend_monthly?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          metadata: Json | null
          opportunity_id: string
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          opportunity_id: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_cohorts: {
        Row: {
          cohort_id: string
          opportunity_id: string
        }
        Insert: {
          cohort_id: string
          opportunity_id: string
        }
        Update: {
          cohort_id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_cohorts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_number: string | null
          account_type: Database["public"]["Enums"]["account_role"]
          avatar_path: string | null
          bio: string | null
          created_at: string
          current_address: string | null
          date_of_birth: string | null
          email: string
          first_name: string | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          id: string
          institute_id: string | null
          is_active: boolean
          is_public: boolean | null
          last_name: string | null
          linkedin_url: string | null
          middle_name: string | null
          permanent_address: string | null
          phone_number: string | null
          portfolio_links: string[] | null
          privacy_settings: Json | null
          profile_updated: boolean | null
          signature_path: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          account_type?: Database["public"]["Enums"]["account_role"]
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          id: string
          institute_id?: string | null
          is_active?: boolean
          is_public?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          middle_name?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          portfolio_links?: string[] | null
          privacy_settings?: Json | null
          profile_updated?: boolean | null
          signature_path?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          account_type?: Database["public"]["Enums"]["account_role"]
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          id?: string
          institute_id?: string | null
          is_active?: boolean
          is_public?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          middle_name?: string | null
          permanent_address?: string | null
          phone_number?: string | null
          portfolio_links?: string[] | null
          privacy_settings?: Json | null
          profile_updated?: boolean | null
          signature_path?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_test_question_analysis"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "test_question_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "view_question_tag_performance"
            referencedColumns: ["tag_id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string | null
          linkedin_url: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          linkedin_url?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          linkedin_url?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean | null
          marks_awarded: number | null
          question_id: string
          selected_option_ids: string[]
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id: string
          selected_option_ids?: string[]
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number | null
          question_id?: string
          selected_option_ids?: string[]
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "view_test_attempt_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_test_question_analysis"
            referencedColumns: ["question_id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          active_session_token: string | null
          active_time_taken: number | null
          ai_diagnosis: Json | null
          attempt_number: number
          candidate_id: string
          created_at: string
          expires_at: string | null
          id: string
          ip_address: unknown
          last_heartbeat_at: string | null
          passed: boolean | null
          percentage: number | null
          score: number | null
          session_claimed_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          tab_switch_count: number
          test_id: string
          total_marks: number | null
          total_time_taken: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          active_session_token?: string | null
          active_time_taken?: number | null
          ai_diagnosis?: Json | null
          attempt_number?: number
          candidate_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          last_heartbeat_at?: string | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          session_claimed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id: string
          total_marks?: number | null
          total_time_taken?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          active_session_token?: string | null
          active_time_taken?: number | null
          ai_diagnosis?: Json | null
          attempt_number?: number
          candidate_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          last_heartbeat_at?: string | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          session_claimed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id?: string
          total_marks?: number | null
          total_time_taken?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cohorts: {
        Row: {
          cohort_id: string
          test_id: string
        }
        Insert: {
          cohort_id: string
          test_id: string
        }
        Update: {
          cohort_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cohorts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cohorts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      test_question_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          order_index: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_test_question_analysis"
            referencedColumns: ["question_id"]
          },
        ]
      }
      test_question_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          marks: number
          negative_marks: number
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          section_id: string | null
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_section_id_fkey"
            columns: ["section_id"]
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number
          test_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number
          test_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sections_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sections_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          institute_id: string
          instructions: string | null
          marks_available: boolean
          max_attempts: number
          pass_percentage: number | null
          results_available: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["test_status"]
          strict_mode: boolean
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          institute_id: string
          instructions?: string | null
          marks_available?: boolean
          max_attempts?: number
          pass_percentage?: number | null
          results_available?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["test_status"]
          strict_mode?: boolean
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          institute_id?: string
          instructions?: string | null
          marks_available?: boolean
          max_attempts?: number
          pass_percentage?: number | null
          results_available?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["test_status"]
          strict_mode?: boolean
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_type: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_type: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_type?: Database["public"]["Enums"]["ticket_sender_type"]
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          description: string
          email: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          email: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          email?: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tpo_profiles: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string | null
          linkedin_url: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          linkedin_url?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          linkedin_url?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpo_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            referencedRelation: "logiclab_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip: unknown
          not_after: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          ip?: unknown
          not_after?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip?: unknown
          not_after?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      logiclab_daily_challenge_user_activity: {
        Row: {
          activity_date: string | null
          easy_attempted: number | null
          easy_solved: number | null
          hard_attempted: number | null
          hard_solved: number | null
          medium_attempted: number | null
          medium_solved: number | null
          solved: boolean | null
          submission_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      logiclab_problem_stats: {
        Row: {
          accepted_submissions: number | null
          problem_id: string | null
          total_submissions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logiclab_problem_submissions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      view_question_tag_performance: {
        Row: {
          accuracy_pct: number | null
          correct_count: number | null
          student_id: string | null
          tag_id: string | null
          tag_name: string | null
          test_id: string | null
          total_questions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_candidate_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      view_test_attempt_details: {
        Row: {
          active_time_taken: number | null
          attempt_number: number | null
          id: string | null
          passed: boolean | null
          percentage: number | null
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["attempt_status"] | null
          student_email: string | null
          student_id: string | null
          student_name: string | null
          submitted_at: string | null
          tab_switch_count: number | null
          test_id: string | null
          total_marks: number | null
          total_time_taken: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_candidate_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      view_test_question_analysis: {
        Row: {
          avg_time_spent: number | null
          correct_answers: number | null
          marks: number | null
          question_id: string | null
          question_text: string | null
          success_rate_pct: number | null
          test_id: string | null
          total_answers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      view_test_summary: {
        Row: {
          available_from: string | null
          available_until: string | null
          avg_score_pct: number | null
          created_at: string | null
          created_by: string | null
          creator_avatar_path: string | null
          creator_email: string | null
          creator_name: string | null
          description: string | null
          id: string | null
          institute_id: string | null
          institute_name: string | null
          instructions: string | null
          marks_available: boolean | null
          question_count: number | null
          results_available: boolean | null
          status: Database["public"]["Enums"]["test_status"] | null
          submitted_attempts: number | null
          time_limit_seconds: number | null
          title: string | null
          total_attempts: number | null
          total_marks: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_reassign_tables_and_create_indexes: { Args: never; Returns: string }
      check_username_available: {
        Args: { p_user_id: string; p_username: string }
        Returns: boolean
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cron_auto_submit_expired_tests: { Args: never; Returns: undefined }
      fn_can_staff_access_institute: {
        Args: { p_institute_id: string }
        Returns: boolean
      }
      fn_can_staff_access_test: {
        Args: { p_test_id: string }
        Returns: boolean
      }
      fn_can_user_access_test: { Args: { p_test_id: string }; Returns: boolean }
      fn_current_user_account_type: { Args: never; Returns: string }
      fn_current_user_institute_id: { Args: never; Returns: string }
      fn_recalculate_profile_completeness: {
        Args: { user_id: string }
        Returns: boolean
      }
      generate_daily_potd: { Args: never; Returns: undefined }
      get_admin_dashboard_kpis: {
        Args: never
        Returns: {
          total_accepted: number
          total_problems: number
          total_submissions: number
          unique_students: number
        }[]
      }
      get_admin_problem_stats: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          acceptance_rate: number
          accepted_submissions: number
          created_at: string
          difficulty: string
          id: string
          number: number
          tags: Json
          title: string
          total_submissions: number
        }[]
      }
      get_admin_student_rankings: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          attempt_count: number
          solved_count: number
          student_email: string
          student_name: string
          user_id: string
        }[]
      }
      get_candidate_home_stats: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_candidate_tests_overview: {
        Args: {
          p_institute_id: string
          p_now?: string
          p_page?: number
          p_search?: string
          p_size?: number
          p_tab?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_global_tags_count: { Args: never; Returns: Json }
      get_ide_problem_list: {
        Args: { p_user_id: string }
        Returns: {
          difficulty: string
          id: string
          isSolved: boolean
          number: number
          title: string
        }[]
      }
      get_institute_home_stats: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_institute_test_attempts: {
        Args: {
          p_dir?: string
          p_page?: number
          p_score?: string
          p_search?: string
          p_size?: number
          p_sort?: string
          p_status?: string
          p_test_id: string
        }
        Returns: Json
      }
      get_institute_tests_overview: {
        Args: {
          p_attempts?: string
          p_author?: string
          p_duration?: string
          p_institute_id?: string
          p_marks?: string
          p_now?: string
          p_page?: number
          p_questions?: string
          p_results?: string
          p_search?: string
          p_size?: number
          p_sort?: string
          p_tab?: string
          p_user_id?: string
        }
        Returns: Json
      }
      get_paginated_daily_challenges: {
        Args: {
          p_difficulty?: string
          p_limit: number
          p_offset: number
          p_search?: string
          p_sort_by?: string
          p_tab?: string
          p_tag?: string
          p_today_str: string
          p_user_id: string
        }
        Returns: {
          acceptance_rate: number
          date: string
          difficulty: string
          id: string
          number: number
          problem_id: string
          solved_status: string
          tags: string[]
          title: string
          total_count: number
          total_submissions: number
        }[]
      }
      get_paginated_problems: {
        Args: {
          p_difficulty?: string
          p_limit: number
          p_offset: number
          p_search?: string
          p_sort_by?: string
          p_tab?: string
          p_tag?: string
          p_user_id: string
        }
        Returns: {
          acceptance_rate: number
          created_at: string
          difficulty: string
          id: string
          number: number
          solved_status: string
          tags: string[]
          title: string
          total_count: number
          total_submissions: number
        }[]
      }
      get_students_not_in_cohort:
        | {
            Args: { p_cohort_id: string; p_search?: string }
            Returns: {
              account_type: string
              avatar_path: string
              course_name: string
              email: string
              full_name: string
              passout_year: number
              student_id: string
            }[]
          }
        | {
            Args: {
              p_cohort_id: string
              p_course_name?: string
              p_passout_year?: number
              p_search?: string
            }
            Returns: {
              account_type: string
              avatar_path: string
              course_name: string
              email: string
              full_name: string
              passout_year: number
              student_id: string
            }[]
          }
        | {
            Args: {
              p_cohort_id: string
              p_course_name?: string
              p_passout_year?: number
              p_search?: string
              p_source_cohort_id?: string
            }
            Returns: {
              account_type: string
              avatar_path: string
              course_name: string
              email: string
              full_name: string
              passout_year: number
              student_id: string
            }[]
          }
      get_test_attempt_stats: { Args: { p_test_id: string }; Returns: Json }
      get_user_global_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_institute_id: { Args: { p_user_id: string }; Returns: string }
      internal_grade_attempt: {
        Args: { p_attempt_id: string; p_is_auto_submit?: boolean }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      record_attempt_violation:
        | {
            Args: {
              p_attempt_id: string
              p_count?: number
              p_timestamp?: string
              p_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_attempt_id: string
              p_timestamp?: string
              p_total_count: number
              p_type: string
            }
            Returns: Json
          }
      regrade_all_submitted_attempts: {
        Args: never
        Returns: {
          attempt_id: string
          delta: number
          new_score: number
          old_score: number
        }[]
      }
      revoke_session: { Args: { p_session_id: string }; Returns: undefined }
      revoke_sessions_batch: {
        Args: { p_session_ids: string[] }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_test_attempt: { Args: { p_attempt_id: string }; Returns: Json }
      test_attempt_bulk_save_answers: {
        Args: { p_attempt_id: string; p_batch: Json }
        Returns: undefined
      }
      test_attempt_claim_session: {
        Args: { p_attempt_id: string; p_session_token: string }
        Returns: Json
      }
      test_attempt_force_submit: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      test_attempt_grade: { Args: { p_attempt_id: string }; Returns: Json }
      test_attempt_init: {
        Args: { p_session_token?: string; p_test_id: string }
        Returns: Json
      }
      test_attempt_save_answer: {
        Args: {
          p_attempt_id: string
          p_question_id: string
          p_selected_option_ids: string[]
          p_time_spent_seconds?: number
        }
        Returns: undefined
      }
      test_attempt_start: { Args: { p_test_id: string }; Returns: Json }
      test_attempt_sync: {
        Args: { p_attempt_id: string; p_batch: Json; p_session_token: string }
        Returns: Json
      }
      test_save: {
        Args: {
          p_questions: Json
          p_sections?: Json
          p_settings: Json
          p_status: string
          p_test_id: string
        }
        Returns: undefined
      }
      toggle_note_upvote: {
        Args: { p_note_id: string; p_user_id: string }
        Returns: boolean
      }
      update_logiclab_user_activity_rpc: {
        Args: {
          p_activity_date: string
          p_difficulty: string
          p_is_solved: boolean
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_role:
        | "admin"
        | "institute_primary"
        | "institute_staff"
        | "institute_placement_officer"
        | "institute_candidate"
      account_type_enum: "candidate" | "institute" | "admin"
      attempt_status:
        | "in_progress"
        | "submitted"
        | "abandoned"
        | "auto_submitted"
      education_type_enum: "ssc" | "hsc" | "diploma" | "ug" | "pg" | "other"
      gender_enum: "M" | "F" | "O"
      institute_subtype_enum: "primary" | "staff" | "tpo"
      job_application_status:
        | "applied"
        | "reviewing"
        | "shortlisted"
        | "rejected"
        | "hired"
      job_posting_status: "draft" | "active" | "paused" | "closed"
      job_type: "full_time" | "part_time" | "internship" | "contract"
      question_type: "single_correct" | "multiple_correct" | "true_false"
      test_status: "draft" | "published" | "archived"
      ticket_sender_type: "user" | "support"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      work_mode: "onsite" | "remote" | "hybrid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: [
        "admin",
        "institute_primary",
        "institute_staff",
        "institute_placement_officer",
        "institute_candidate",
      ],
      account_type_enum: ["candidate", "institute", "admin"],
      attempt_status: [
        "in_progress",
        "submitted",
        "abandoned",
        "auto_submitted",
      ],
      education_type_enum: ["ssc", "hsc", "diploma", "ug", "pg", "other"],
      gender_enum: ["M", "F", "O"],
      institute_subtype_enum: ["primary", "staff", "tpo"],
      job_application_status: [
        "applied",
        "reviewing",
        "shortlisted",
        "rejected",
        "hired",
      ],
      job_posting_status: ["draft", "active", "paused", "closed"],
      job_type: ["full_time", "part_time", "internship", "contract"],
      question_type: ["single_correct", "multiple_correct", "true_false"],
      test_status: ["draft", "published", "archived"],
      ticket_sender_type: ["user", "support"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      work_mode: ["onsite", "remote", "hybrid"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
