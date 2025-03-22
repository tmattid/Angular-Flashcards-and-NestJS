import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UserProfile } from '../../services/auth.service'

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col">
      <h2 class="text-2xl font-bold text-gray-900">
        {{ getName() }}
      </h2>
      <p class="text-gray-600">{{ profile?.email }}</p>
    </div>
  `,
})
export class ProfileInfoComponent {
  @Input({ required: true }) profile: UserProfile | null = null

  protected getName(): string {
    if (!this.profile) return 'Welcome!'

    return (
      [this.profile.firstName, this.profile.lastName]
        .filter(Boolean)
        .join(' ') ||
      this.profile.email.split('@')[0] ||
      'Welcome!'
    )
  }
}
