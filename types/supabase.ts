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
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
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
      attempt_answers: {
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
            referencedRelation: "attempt_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "view_test_results_detailed"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_question_analysis"
            referencedColumns: ["question_id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          aadhaar_number: string | null
          cgpa: number | null
          course_name: string | null
          created_at: string
          current_address: string | null
          date_of_birth: string | null
          diploma_pass_year: number | null
          diploma_percentage: number | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          hsc_pass_year: number | null
          hsc_percentage: number | null
          institute_id: string | null
          institute_verified: boolean | null
          is_diploma: boolean | null
          is_hsc: boolean | null
          last_name: string | null
          linkedin_url: string | null
          middle_name: string | null
          passout_year: number | null
          permanent_address: string | null
          phone_number: string | null
          portfolio_links: string[] | null
          profile_complete: boolean | null
          profile_id: string
          profile_image_path: string | null
          profile_updated: boolean
          sgpa_sem1: number | null
          sgpa_sem10: number | null
          sgpa_sem2: number | null
          sgpa_sem3: number | null
          sgpa_sem4: number | null
          sgpa_sem5: number | null
          sgpa_sem6: number | null
          sgpa_sem7: number | null
          sgpa_sem8: number | null
          sgpa_sem9: number | null
          skills: string[] | null
          ssc_pass_year: number | null
          ssc_percentage: number | null
          university_prn: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_number?: string | null
          cgpa?: number | null
          course_name?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          diploma_pass_year?: number | null
          diploma_percentage?: number | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          hsc_pass_year?: number | null
          hsc_percentage?: number | null
          institute_id?: string | null
          institute_verified?: boolean | null
          is_diploma?: boolean | null
          is_hsc?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          middle_name?: string | null
          passout_year?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          portfolio_links?: string[] | null
          profile_complete?: boolean | null
          profile_id: string
          profile_image_path?: string | null
          profile_updated?: boolean
          sgpa_sem1?: number | null
          sgpa_sem10?: number | null
          sgpa_sem2?: number | null
          sgpa_sem3?: number | null
          sgpa_sem4?: number | null
          sgpa_sem5?: number | null
          sgpa_sem6?: number | null
          sgpa_sem7?: number | null
          sgpa_sem8?: number | null
          sgpa_sem9?: number | null
          skills?: string[] | null
          ssc_pass_year?: number | null
          ssc_percentage?: number | null
          university_prn?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_number?: string | null
          cgpa?: number | null
          course_name?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          diploma_pass_year?: number | null
          diploma_percentage?: number | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          hsc_pass_year?: number | null
          hsc_percentage?: number | null
          institute_id?: string | null
          institute_verified?: boolean | null
          is_diploma?: boolean | null
          is_hsc?: boolean | null
          last_name?: string | null
          linkedin_url?: string | null
          middle_name?: string | null
          passout_year?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          portfolio_links?: string[] | null
          profile_complete?: boolean | null
          profile_id?: string
          profile_image_path?: string | null
          profile_updated?: boolean
          sgpa_sem1?: number | null
          sgpa_sem10?: number | null
          sgpa_sem2?: number | null
          sgpa_sem3?: number | null
          sgpa_sem4?: number | null
          sgpa_sem5?: number | null
          sgpa_sem6?: number | null
          sgpa_sem7?: number | null
          sgpa_sem8?: number | null
          sgpa_sem9?: number | null
          skills?: string[] | null
          ssc_pass_year?: number | null
          ssc_percentage?: number | null
          university_prn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
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
            foreignKeyName: "course_module_progress_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
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
      institute_profiles: {
        Row: {
          created_at: string
          institute_id: string | null
          profile_id: string
          profile_updated: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          institute_id?: string | null
          profile_id: string
          profile_updated?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          institute_id?: string | null
          profile_id?: string
          profile_updated?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institute_profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
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
          courses: string[] | null
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
          courses?: string[] | null
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
          courses?: string[] | null
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
      job_applications: {
        Row: {
          candidate_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          resume_url: string | null
          status: Database["public"]["Enums"]["job_application_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_url?: string | null
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: Database["public"]["Enums"]["job_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_count: number | null
          application_deadline: string | null
          created_at: string
          description: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          location: string | null
          recruiter_id: string
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          skills: string[] | null
          status: Database["public"]["Enums"]["job_posting_status"]
          title: string
          updated_at: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Insert: {
          application_count?: number | null
          application_deadline?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          recruiter_id: string
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_posting_status"]
          title: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Update: {
          application_count?: number | null
          application_deadline?: string | null
          created_at?: string
          description?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          recruiter_id?: string
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["job_posting_status"]
          title?: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_recruiter_id_fkey"
            columns: ["recruiter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "logiclab_daily_challenge_submissions_daily_challenge_id_fkey"
            columns: ["daily_challenge_id"]
            referencedRelation: "logiclab_daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potd_completions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potd_completions_user_id_fkey"
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
            foreignKeyName: "daily_challenges_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
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
            foreignKeyName: "coding_submissions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      logiclab_problems: {
        Row: {
          boilerplates: Json
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
          created_at?: string
          created_by?: string | null
          description: string
          difficulty: string
          driver_codes?: Json
          id?: string
          memory_limit?: number | null
          number?: number
          tags?: string[] | null
          test_cases?: Json
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          boilerplates?: Json
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
      options: {
        Row: {
          id: string
          is_correct: boolean
          media_url: string | null
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          media_url?: string | null
          option_text: string
          order_index: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          media_url?: string | null
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_question_analysis"
            referencedColumns: ["question_id"]
          },
        ]
      }
      placement_records: {
        Row: {
          candidate_id: string
          company_name: string | null
          created_at: string
          ctc: number | null
          drive_tag: string | null
          id: string
          job_role: string | null
          location: string | null
          offer_letter_date: string | null
          offer_type: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company_name?: string | null
          created_at?: string
          ctc?: number | null
          drive_tag?: string | null
          id?: string
          job_role?: string | null
          location?: string | null
          offer_letter_date?: string | null
          offer_type?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company_name?: string | null
          created_at?: string
          ctc?: number | null
          drive_tag?: string | null
          id?: string
          job_role?: string | null
          location?: string | null
          offer_letter_date?: string | null
          offer_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_records_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "candidate_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "placement_records_candidate_id_fkey"
            columns: ["candidate_id"]
            referencedRelation: "placement_management_view"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_subtype: string | null
          account_type: string
          avatar_path: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          signature_path: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_subtype?: string | null
          account_type?: string
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          signature_path?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_subtype?: string | null
          account_type?: string
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          signature_path?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
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
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "view_question_analysis"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tag_performance"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "question_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          marks: number
          media_url: string | null
          negative_marks: number
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          media_url?: string | null
          negative_marks?: number
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          media_url?: string | null
          negative_marks?: number
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
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
        ]
      }
      recruiter_profiles: {
        Row: {
          company_description: string | null
          company_logo_path: string | null
          company_name: string
          company_size: string | null
          company_website: string | null
          created_at: string
          department: string | null
          designation: string | null
          headquarters_city: string | null
          headquarters_country: string | null
          headquarters_state: string | null
          industry: string | null
          linkedin_url: string | null
          phone_number: string | null
          profile_complete: boolean | null
          profile_id: string
          profile_updated: boolean | null
          updated_at: string
        }
        Insert: {
          company_description?: string | null
          company_logo_path?: string | null
          company_name: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          headquarters_state?: string | null
          industry?: string | null
          linkedin_url?: string | null
          phone_number?: string | null
          profile_complete?: boolean | null
          profile_id: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Update: {
          company_description?: string | null
          company_logo_path?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          headquarters_state?: string | null
          industry?: string | null
          linkedin_url?: string | null
          phone_number?: string | null
          profile_complete?: boolean | null
          profile_id?: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string | null
          institute_id: string | null
          linkedin_url: string | null
          profile_id: string
          profile_updated: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          institute_id?: string | null
          linkedin_url?: string | null
          profile_id: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          institute_id?: string | null
          linkedin_url?: string | null
          profile_id?: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
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
      test_attempt_feedback: {
        Row: {
          attempt_id: string
          bugs_issues: string | null
          candidate_id: string
          created_at: string
          difficulty_felt: string | null
          id: string
          overall_comment: string | null
          rating: number
          suggestions: string | null
          test_id: string
        }
        Insert: {
          attempt_id: string
          bugs_issues?: string | null
          candidate_id: string
          created_at?: string
          difficulty_felt?: string | null
          id?: string
          overall_comment?: string | null
          rating: number
          suggestions?: string | null
          test_id: string
        }
        Update: {
          attempt_id?: string
          bugs_issues?: string | null
          candidate_id?: string
          created_at?: string
          difficulty_felt?: string | null
          id?: string
          overall_comment?: string | null
          rating?: number
          suggestions?: string | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempt_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "attempt_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempt_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempt_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            referencedRelation: "view_test_results_detailed"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "test_attempt_feedback_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempt_feedback_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "view_test_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          attempt_number: number
          candidate_id: string
          created_at: string
          expires_at: string | null
          id: string
          ip_address: unknown
          passed: boolean | null
          percentage: number | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          tab_switch_count: number
          test_id: string
          time_spent_seconds: number | null
          total_marks: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          attempt_number?: number
          candidate_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id: string
          time_spent_seconds?: number | null
          total_marks?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          attempt_number?: number
          candidate_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          tab_switch_count?: number
          test_id?: string
          time_spent_seconds?: number | null
          total_marks?: number | null
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
      tests: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string
          description: string | null
          id: string
          institute_id: string
          instructions: string | null
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
          description?: string | null
          id?: string
          institute_id: string
          instructions?: string | null
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
          description?: string | null
          id?: string
          institute_id?: string
          instructions?: string | null
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
          institute_id: string | null
          linkedin_url: string | null
          profile_id: string
          profile_updated: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          institute_id?: string | null
          linkedin_url?: string | null
          profile_id: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string | null
          institute_id?: string | null
          linkedin_url?: string | null
          profile_id?: string
          profile_updated?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpo_profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpo_profiles_profile_id_fkey"
            columns: ["profile_id"]
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
      attempt_details: {
        Row: {
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
          time_spent_seconds: number | null
          total_marks: number | null
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
            foreignKeyName: "coding_submissions_problem_id_fkey"
            columns: ["problem_id"]
            referencedRelation: "logiclab_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_management_view: {
        Row: {
          company_name: string | null
          course_name: string | null
          ctc: number | null
          display_name: string | null
          institute_id: string | null
          passout_year: number | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_institute_id_fkey"
            columns: ["institute_id"]
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_performance: {
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
      user_daily_activity: {
        Row: {
          activity_date: string | null
          solved_count: number | null
          submission_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_question_analysis: {
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
      view_test_results_detailed: {
        Row: {
          attempt_id: string | null
          attempt_number: number | null
          branch: string | null
          passed: boolean | null
          passout_year: number | null
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
          time_spent_seconds: number | null
          total_marks: number | null
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
      view_test_summary: {
        Row: {
          available_from: string | null
          available_until: string | null
          avg_score_pct: number | null
          created_at: string | null
          description: string | null
          id: string | null
          institute_id: string | null
          institute_name: string | null
          question_count: number | null
          results_available: boolean | null
          status: Database["public"]["Enums"]["test_status"] | null
          submitted_attempts: number | null
          time_limit_seconds: number | null
          title: string | null
          total_attempts: number | null
          total_marks: number | null
        }
        Relationships: [
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
      bulk_save_answers: {
        Args: { p_attempt_id: string; p_batch: Json }
        Returns: undefined
      }
      check_username_available: {
        Args: { p_user_id: string; p_username: string }
        Returns: boolean
      }
      generate_daily_potd: { Args: never; Returns: undefined }
      get_candidate_home_stats: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_institute_home_stats: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      grade_attempt: { Args: { p_attempt_id: string }; Returns: undefined }
      grade_attempt_v2: {
        Args: { p_attempt_id: string; p_final_time_spent: number }
        Returns: Json
      }
      init_test_attempt: { Args: { p_test_id: string }; Returns: Json }
      revoke_session: { Args: { p_session_id: string }; Returns: undefined }
      revoke_sessions_batch: {
        Args: { p_session_ids: string[] }
        Returns: undefined
      }
      save_answer: {
        Args: {
          p_attempt_id: string
          p_question_id: string
          p_selected_option_ids: string[]
          p_time_spent_seconds?: number
        }
        Returns: undefined
      }
      save_test_v2: {
        Args: {
          p_questions: Json[]
          p_settings: Json
          p_status: string
          p_test_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attempt_status:
        | "in_progress"
        | "submitted"
        | "abandoned"
        | "auto_submitted"
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
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {
      attempt_status: [
        "in_progress",
        "submitted",
        "abandoned",
        "auto_submitted",
      ],
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
