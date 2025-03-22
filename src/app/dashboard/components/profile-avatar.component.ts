import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { User } from '@supabase/supabase-js'

@Component({
  selector: 'app-profile-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-16 h-16">
      <ng-container *ngIf="getAvatarUrl(); else initialAvatar">
        <img
          [src]="getAvatarUrl()"
          [alt]="getName()"
          class="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          (error)="handleImageError()"
        />
      </ng-container>

      <ng-template #initialAvatar>
        <div
          class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-gray-200"
        >
          <span class="text-xl font-medium text-indigo-600">
            {{ getInitial() }}
          </span>
        </div>
      </ng-template>
    </div>
  `,
})
export class ProfileAvatarComponent {
  @Input({ required: true }) profile: User | null = null

  protected getAvatarUrl(): string | null {
    return (
      this.profile?.user_metadata?.['avatar_url'] ||
      this.profile?.user_metadata?.['picture'] ||
      null
    )
  }

  protected getName(): string {
    return (
      this.profile?.user_metadata?.['full_name'] ||
      this.profile?.user_metadata?.['name'] ||
      'User'
    )
  }

  protected getInitial(): string {
    const name = this.getName()
    return name[0].toUpperCase()
  }

  protected handleImageError(): void {
    console.warn('Avatar image failed to load')
  }
}
