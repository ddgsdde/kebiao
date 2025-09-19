import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ScheduleService } from '../../services/schedule.service';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

interface TeamMember {
  name: string;
  uploadedBy: string;
}

@Component({
  selector: 'app-schedule-uploader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-uploader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleUploaderComponent {
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  
  studentName = signal('');
  activeTab = signal<'upload' | 'paste'>('upload');
  fileName = signal<string | null>(null);
  fileContent = signal<string | null>(null);
  pasteContent = signal('');
  uploadStatus = signal<{ success: boolean; message: string } | null>(null);
  isUploading = signal(false);

  teamMembers = computed(() => {
    return this.scheduleService.schedules()
      .map(s => ({ name: s.student_name, uploadedBy: s.uploadedBy }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  
  studentColors = signal(new Map<string, { dot: string }>());
  private colorPalette = [
    { dot: 'bg-teal-400' },
    { dot: 'bg-sky-400' },
    { dot: 'bg-violet-400' },
    { dot: 'bg-rose-400' },
    { dot: 'bg-amber-400' },
    { dot: 'bg-lime-400' },
    { dot: 'bg-cyan-400' },
  ];

  constructor() {
    effect(() => {
      const members = this.teamMembers();
      const newColors = new Map<string, { dot: string }>();
      members.forEach((member, index) => {
        const colorIndex = index % this.colorPalette.length;
        newColors.set(member.name, this.colorPalette[colorIndex]);
      });
      this.studentColors.set(newColors);
    });
  }

  getStudentColorDot(name: string): string {
    return this.studentColors().get(name)?.dot || 'bg-gray-400';
  }

  canRemove(member: TeamMember): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    return user.role === 'admin' || user.username === member.uploadedBy;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.fileName.set(file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.fileContent.set(text);
      };
      reader.readAsText(file);
    }
  }

  addSchedule(): void {
    const content = this.activeTab() === 'upload' ? this.fileContent() : this.pasteContent();
    if (!content) {
      this.uploadStatus.set({ success: false, message: '请选择文件或粘贴JSON内容。' });
      return;
    }

    this.isUploading.set(true);
    this.uploadStatus.set(null);

    setTimeout(() => {
        const result = this.scheduleService.addSchedule(content, this.studentName());
        this.uploadStatus.set({ success: result.success, message: result.message });
        if(result.success) {
            this.reset();
        }
        this.isUploading.set(false);
        
        setTimeout(() => this.uploadStatus.set(null), 5000);
    }, 500);
  }

  removeMember(name: string): void {
    this.scheduleService.removeSchedule(name);
  }
  
  reset(): void {
    this.studentName.set('');
    this.fileName.set(null);
    this.fileContent.set(null);
    this.pasteContent.set('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }

  exportSchedules(): void {
    const schedules = this.scheduleService.schedules();
    if (schedules.length === 0) {
      return; // Button should be disabled, but good to have a safeguard
    }
    
    // Omit 'uploadedBy' field for cleaner export
    const schedulesToExport = schedules.map(({ uploadedBy, ...rest }) => rest);

    const dataStr = JSON.stringify(schedulesToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `team_schedule_${today}.json`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}