import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { User } from '@supabase/supabase-js'

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
  @Input({ required: true }) profile: User | null = null

  protected getName(): string {
    return (
      this.profile?.user_metadata?.['full_name'] ||
      this.profile?.user_metadata?.['name'] ||
      'Welcome!'
    )
  }
}
