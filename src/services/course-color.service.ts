import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ScheduleService } from './schedule.service';

const COLOR_STORAGE_KEY = 'courseColors';

export interface ColorPair {
  bg: string;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class CourseColorService {
  private scheduleService = inject(ScheduleService);
  
  private colorPalette: ColorPair[] = [
    { bg: 'bg-teal-100', text: 'text-teal-800' },
    { bg: 'bg-sky-100', text: 'text-sky-800' },
    { bg: 'bg-violet-100', text: 'text-violet-800' },
    { bg: 'bg-rose-100', text: 'text-rose-800' },
    { bg: 'bg-amber-100', text: 'text-amber-800' },
    { bg: 'bg-lime-100', text: 'text-lime-800' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  ];

  private courseColorMap = signal<Record<string, ColorPair>>(this.loadFromLocalStorage());
  private assignedColorCount = signal(0);

  uniqueCourses = computed(() => {
    const courses = this.scheduleService.allClasses().map(c => c.courseName);
    return [...new Set(courses)].sort();
  });

  constructor() {
    effect(() => {
      this.saveToLocalStorage(this.courseColorMap());
    });

    // Effect to pre-assign colors to new courses
    effect(() => {
        const courses = this.uniqueCourses();
        const currentMap = this.courseColorMap();
        let updated = false;
        let assignedCount = Object.keys(currentMap).length;

        courses.forEach(courseName => {
            if (!currentMap[courseName]) {
                const colorIndex = assignedCount % this.colorPalette.length;
                currentMap[courseName] = this.colorPalette[colorIndex];
                assignedCount++;
                updated = true;
            }
        });
        if (updated) {
            this.courseColorMap.set({ ...currentMap });
        }
        this.assignedColorCount.set(assignedCount);
    });
  }

  getColorPalette(): ColorPair[] {
    return this.colorPalette;
  }

  getColorForCourse(courseName: string): ColorPair {
    return this.courseColorMap()[courseName] || this.colorPalette[0];
  }

  setColorForCourse(courseName: string, color: ColorPair): void {
    this.courseColorMap.update(map => ({
      ...map,
      [courseName]: color,
    }));
  }

  private loadFromLocalStorage(): Record<string, ColorPair> {
    try {
      const data = localStorage.getItem(COLOR_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Failed to load course colors from localStorage", e);
      return {};
    }
  }

  private saveToLocalStorage(colors: Record<string, ColorPair>): void {
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      console.error("Failed to save course colors to localStorage", e);
    }
  }
}
