import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleService } from '../../services/schedule.service';
import { FlattenedClass, GroupedClass } from '../../models/schedule.model';
import { CourseColorService } from '../../services/course-color.service';

@Component({
  selector: 'app-schedule-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-viewer.component.html',
  styleUrls: ['./schedule-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleViewerComponent {
  private scheduleService = inject(ScheduleService);
  private courseColorService = inject(CourseColorService);
  
  hasSchedules = computed(() => this.scheduleService.schedules().length > 0);
  
  viewMode = signal<'week' | 'day'>('week');
  currentDate = signal(new Date());
  searchQuery = signal('');

  private allClasses = this.scheduleService.allClasses;
  private conflictingSlots = this.scheduleService.conflictingSlots;

  private filteredClasses = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allClasses();
    return this.allClasses().filter(c => 
      c.courseName.toLowerCase().includes(query) ||
      c.teacher.toLowerCase().includes(query) ||
      c.location?.toLowerCase().includes(query) ||
      c.studentName.toLowerCase().includes(query)
    );
  });

  currentWeek = computed(() => this.getWeekDays(this.currentDate()));
  allPeriods = computed(() => this.getUniquePeriods(this.allClasses()));

  weekData = computed(() => {
    const week = this.currentWeek();
    const classes = this.filteredClasses();
    const periods = this.allPeriods();

    return week.map(day => ({
      date: day,
      dayOfWeek: this.getDayOfWeekName(day.getDay()),
      schedule: periods.map(period => ({
        period,
        groupedClasses: this.groupClasses(classes.filter(c => this.isSameDay(c.date, day) && c.period === period))
      }))
    }));
  });

  dayData = computed(() => {
    const classes = this.filteredClasses();
    const periods = this.allPeriods();
    const dayClasses = classes.filter(c => this.isSameDay(c.date, this.currentDate()));
    
    return periods.map(p => ({
      period: p,
      groupedClasses: this.groupClasses(dayClasses.filter(c => c.period === p))
    }));
  });

  isStudentInConflict(studentName: string, date: Date, period: string): boolean {
    const dateStr = date.toISOString().slice(0, 10);
    const slotKey = `${studentName}-${dateStr}-${period}`;
    return this.conflictingSlots().has(slotKey);
  }

  // --- Date Helpers ---
  private getWeekDays(date: Date): Date[] {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  getDayOfWeekName(dayIndex: number): string {
    return ['日', '一', '二', '三', '四', '五', '六'][dayIndex];
  }

  // --- UI Actions ---
  changeView(mode: 'week' | 'day') { this.viewMode.set(mode); }
  navigate(amount: number): void {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      if (this.viewMode() === 'week') newDate.setDate(d.getDate() + (amount * 7));
      else newDate.setDate(d.getDate() + amount);
      return newDate;
    });
  }
  goToToday(): void { this.currentDate.set(new Date()); }
  onSearch(event: Event) { this.searchQuery.set((event.target as HTMLInputElement).value); }

  // --- Data Helpers ---
  private getUniquePeriods(classes: FlattenedClass[]): string[] {
    const periodOrder = ['第一大节', '第二大节', '第三大节', '第四大节', '第五大节'];
    const uniquePeriods = [...new Set(classes.map(c => c.period))];
    uniquePeriods.sort((a, b) => {
        const indexA = periodOrder.indexOf(a);
        const indexB = periodOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });
    return uniquePeriods.length > 0 ? uniquePeriods : periodOrder.slice(0, 5);
  }

  private groupClasses(classes: FlattenedClass[]): GroupedClass[] {
    if (classes.length === 0) return [];
    const groups = new Map<string, GroupedClass>();
    for (const c of classes) {
      const key = `${c.courseName}-${c.teacher}-${c.location}`;
      if (!groups.has(key)) {
        groups.set(key, {
          courseName: c.courseName,
          teacher: c.teacher,
          location: c.location,
          students: [],
        });
      }
      groups.get(key)!.students.push(c.studentName);
    }
    return Array.from(groups.values());
  }

  getCourseColor(courseName: string): { bg: string; text: string } {
    return this.courseColorService.getColorForCourse(courseName);
  }
}