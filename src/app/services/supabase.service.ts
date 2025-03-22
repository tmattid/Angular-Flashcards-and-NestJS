import { Injectable, signal } from '@angular/core'
import {
  AuthChangeEvent,
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js'
import { environment } from '../../environments/environment'

export interface Profile {
  id?: string
  username: string
  website: string
  avatar_url: string
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  // Validate the URLs early to avoid downstream errors
  private validateUrl(url: string): void {
    if (!url || !/^https?:\/\//.test(url)) {
      throw new Error(`Invalid Supabase URL provided: "${url}"`)
    }
  }

  // Validate before creating the client
  private supabase: SupabaseClient
  // Using Angular signals for reactive session state management:
  session = signal<AuthSession | null>(null)

  constructor() {
    this.validateUrl(environment.supabaseUrl)

    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    )

    // Listen to auth state changes and update the signal
    this.supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        this.session.set(session)
      },
    )

    // Fetch the current session initially and update the signal
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session)
    })
  }

  profile(user: User) {
    return this.supabase
      .from('profiles')
      .select(`username, website, avatar_url`)
      .eq('id', user.id)
      .single()
  }

  authChanges(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) {
    return this.supabase.auth.onAuthStateChange(callback)
  }

  signIn(email: string) {
    return this.supabase.auth.signInWithOtp({ email })
  }

  signOut() {
    return this.supabase.auth.signOut()
  }

  updateProfile(profile: Profile) {
    const update = {
      ...profile,
      updated_at: new Date(),
    }

    return this.supabase.from('profiles').upsert(update)
  }

  downloadImage(path: string) {
    return this.supabase.storage.from('avatars').download(path)
  }

  uploadAvatar(filePath: string, file: File) {
    return this.supabase.storage.from('avatars').upload(filePath, file)
  }

  /**
   * Returns the public URL for a given path in storage.
   */
  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  rpc(fn: string, params?: object) {
    return this.supabase.rpc(fn, params)
  }
}
