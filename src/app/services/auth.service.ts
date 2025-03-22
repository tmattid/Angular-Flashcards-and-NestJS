import { Injectable, Signal, computed, signal } from '@angular/core'
import { Router } from '@angular/router'
import {
  SupabaseClient,
  AuthError,
  OAuthResponse,
  User,
  Session,
  createClient,
} from '@supabase/supabase-js'
import { Observable, from, of, throwError } from 'rxjs'
import { catchError, map, switchMap, tap, filter, take } from 'rxjs/operators'
import { toObservable } from '@angular/core/rxjs-interop' // Import the interop helper
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core'
import { environment } from '../../environments/environment'

// Initialize supabaseClient using environment variables or your config.
const SUPABASE_URL: string = environment.supabaseUrl
const SUPABASE_ANON_KEY: string = environment.supabaseKey
const supabaseClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
)

export interface Profile {
  id: string
  email: string
  username?: string
  website?: string
  avatarUrl?: string
}

export function provideSupabase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SupabaseClient,
      useValue: supabaseClient,
    },
  ])
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSignal = signal<User | null>(null)
  private sessionSignal = signal<Session | null>(null)
  private initializedSignal = signal<boolean>(false)

  readonly user: Signal<User | null> = computed(() => this.userSignal())
  readonly session: Signal<Session | null> = computed(() =>
    this.sessionSignal(),
  )
  readonly isAuthenticated: Signal<boolean> = computed(() => !!this.session())

  constructor(private router: Router, private supabase: SupabaseClient) {
    this.initializeAuth()
  }

  private initializeAuth(): void {
    from(this.supabase.auth.getSession())
      .pipe(
        tap(({ data: { session }, error }) => {
          if (error) throw error
          this.sessionSignal.set(session)
          this.userSignal.set(session?.user ?? null)
          this.initializedSignal.set(true)
          
          // If we have a session and we're on the login page, navigate to dashboard
          if (session && window.location.pathname === '/login') {
            this.router.navigate(['/dashboard'])
          }
        }),
        switchMap(() => {
          return new Observable<User | null>((subscriber) => {
            const {
              data: { subscription },
            } = this.supabase.auth.onAuthStateChange((_, session) => {
              this.sessionSignal.set(session)
              this.userSignal.set(session?.user ?? null)
              
              // Navigate to dashboard when user signs in
              if (session && window.location.pathname === '/login') {
                this.router.navigate(['/dashboard'])
              }
              
              subscriber.next(session?.user ?? null)
            })
            return () => subscription.unsubscribe()
          })
        }),
        catchError((error) => {
          console.error('Auth initialization error:', error)
          this.sessionSignal.set(null)
          this.userSignal.set(null)
          return of(null)
        }),
      )
      .subscribe()
  }

  getCurrentUser(): Observable<User | null> {
    return from(this.supabase.auth.getUser()).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data.user
      }),
      catchError((error) => {
        console.error('Error getting current user:', error)
        return of(null)
      }),
    )
  }

  signInWithGoogle(): Observable<void> {
    return from(
      this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      }),
    ).pipe(
      map(({ error }: OAuthResponse) => {
        if (error) throw error
      }),
      catchError((error) => {
        if (error instanceof AuthError) {
          console.error('Google login error:', error.message)
          return throwError(() => error)
        }
        return throwError(() => new Error('Google login failed'))
      }),
    )
  }

  updateProfile(profile: Partial<Profile>): Observable<void> {
    return from(
      this.supabase.from('profiles').upsert({
        id: profile.id,
        username: profile.username,
        website: profile.website,
        avatar_url: profile.avatarUrl,
        updated_at: new Date().toISOString(),
      }),
    ).pipe(
      map(({ error }) => {
        if (error) throw error
      }),
      catchError((error) => {
        console.error('Error updating profile:', error)
        return throwError(() => error)
      }),
    )
  }

  getProfile(userId: string): Observable<Profile | null> {
    return from(
      this.supabase.from('profiles').select('*').eq('id', userId).single(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error
        return data
      }),
      catchError((error) => {
        console.error('Error fetching profile:', error)
        return of(null)
      }),
    )
  }

  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      tap(() => this.userSignal.set(null)),
      switchMap(() => from(this.router.navigate(['/login']))),
      map(() => void 0),
      catchError((error) => {
        console.error('Error during logout:', error)
        return throwError(() => error)
      }),
    )
  }

  downloadImage(path: string): Observable<Blob> {
    return from(this.supabase.storage.from('avatars').download(path)).pipe(
      map(({ data, error }) => {
        if (error) throw error
        if (!data) throw new Error('No image data received')
        return data
      }),
      catchError((error) => throwError(() => error)),
    )
  }

  // Updated to return an observable that emits every time the signal changes
  isInitialized(): Observable<boolean> {
    return toObservable(this.initializedSignal)
  }
}
