// Tables
export interface App_secrets {
  api_key: string
  provider: string
}
export interface Flashcard_sets {
  created_at: string
  created_by: string
  description: string | null
  icon_id: string | null
  id: string
  set_position: number | null
  title: string
  updated_at: string
}
export interface Flashcards {
  back: string
  created_at: string
  difficulty: number | null
  flashcard_set_id: string
  front: string
  id: string
  position: number
  tags: string[] | null
  updated_at: string
}

// Enums
export type Answer_outcome = "correct" | "incorrect" | "partial";
export type Flashcard_content_type = "text" | "image" | "code" | "latex" | "html";
export type Flashcard_set_type = "leitner" | "ai_generated" | "user_created" | "quiz";
export type Progress_status = "new" | "learning" | "review" | "mastered";
export type Session_type = "practice" | "exam" | "revision" | "ai_driven";
export type Set_view_mode = "grid" | "list" | "carousel" | "spaced-repetition";
