export interface ClassInfo {
  period: string;
  course_name: string;
  type: string;
  teacher: string;
  location: string | null;
}

export interface Day {
  date: string; // "MM-DD"
  day_of_week: string;
  classes: ClassInfo[];
}

export interface Week {
  week_number: number;
  dates: string; // "MM-DD - MM-DD"
  days: Day[];
}

export interface Schedule {
  student_name: string;
  academic_year: string;
  schedule: Week[];
  uploadedBy: string; // Tracks which user added this schedule
}

export interface FlattenedClass {
  studentName: string;
  date: Date;
  dayOfWeek: string;
  period: string;
  courseName: string;
  type: string;
  teacher: string;
  location: string | null;
}

export interface GroupedClass {
  courseName: string;
  teacher: string;
  location: string | null;
  students: string[];
}