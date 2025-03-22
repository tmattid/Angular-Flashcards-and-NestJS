export interface User {
  id: string
  app_metadata: {
    provider?: string
    [key: string]: any
  }
  user_metadata: {
    avatar_url?: string
    email?: string
    email_verified?: boolean
    full_name?: string
    iss?: string
    name?: string
    picture?: string
    provider_id?: string
    sub?: string
    [key: string]: any
  }
  aud: string
  confirmation_sent_at?: string
  recovery_sent_at?: string
  email_confirmed_at?: string
  phone_confirmed_at?: string
  last_sign_in_at?: string
  role?: string
  created_at: string
  updated_at?: string
  email?: string
  phone?: string
  confirmed_at?: string
}

export interface AuthResponse {
  data: {
    user: User | null
    session: Session | null
  }
  error: Error | null
}

export interface Session {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user: User
}

export interface UserProfile {
  id: string
  email: string
  username?: string
  website?: string
  avatarUrl?: string
  user_metadata?: {
    picture?: string
    full_name?: string
    name?: string
    [key: string]: any
  }
}
