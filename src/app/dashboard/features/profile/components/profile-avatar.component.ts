import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UserProfile } from '../../../../services/auth.service'

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
  @Input({ required: true }) profile: UserProfile | null = null

  protected getAvatarUrl(): string | null {
    return this.profile?.profilePicture || null
  }

  protected getName(): string {
    if (!this.profile) return 'User'

    return (
      [this.profile.firstName, this.profile.lastName]
        .filter(Boolean)
        .join(' ') ||
      this.profile.email.split('@')[0] ||
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
