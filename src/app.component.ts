import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleUploaderComponent } from './components/schedule-uploader/schedule-uploader.component';
import { ScheduleViewerComponent } from './components/schedule-viewer/schedule-viewer.component';
import { AuthService } from './services/auth.service';
import { CourseColorManagerComponent } from './components/course-color-manager/course-color-manager.component';
import { UserManagerComponent } from './components/user-manager/user-manager.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ScheduleUploaderComponent, ScheduleViewerComponent, CourseColorManagerComponent, UserManagerComponent, ChangePasswordComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  authService = inject(AuthService);
  username = signal('');
  password = signal('');
  loginError = signal<string | null>(null);
  showChangePasswordModal = signal(false);

  login(): void {
    if (this.username().trim() && this.password()) {
      const result = this.authService.login(this.username().trim(), this.password());
      if (result.success) {
        this.username.set('');
        this.password.set('');
        this.loginError.set(null);
      } else {
        this.loginError.set(result.message);
      }
    }
  }
}
