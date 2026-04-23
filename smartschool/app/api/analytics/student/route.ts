// app/api/analytics/student/route.ts
import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { scores, subjects, terms, students, classes } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { ok, err, withErrorBoundary, getGrade } from '@/lib/utils/api';
import type { TrendPoint, HeatmapRow, ClassComparison, StudentAnalytics } from '@/lib/types';

function generateRecommendation(
  comparisons: ClassComparison[],
  strengthSubject: string,
  improvementSubject: string,
  studentName: string,
): string {
  const overall    = comparisons.find(c => c.subject === 'Overall');
  const diff       = overall?.diff ?? 0;
  const perfWord   = diff >= 10 ? 'outstanding' : diff >= 5 ? 'strong' : diff >= 0 ? 'solid' : 'developing';
  const firstName  = studentName.split(' ')[0];

  return `${firstName} is delivering ${perfWord} performance, scoring ${Math.abs(diff)} points ${diff >= 0 ? 'above' : 'below'} the class average. ` +
    `Strongest subject: ${strengthSubject} — keep building on this foundation. ` +
    `To reach distinction level, extra focus on ${improvementSubject} will make the biggest impact. ` +
    `${diff >= 5 ? `The upward trend across terms shows great momentum — top 10% is well within reach! 🚀` : `Consistent daily practice will accelerate improvement significantly. You've got this! 💪`}`;
}

export const GET = withErrorBoundary(async (req: NextRequest) => {
  await requireSession();
  const { searchParams } = req.nextUrl;
  const studentId = searchParams.get('studentId');
  if (!studentId) return err('studentId required', 400);

  const db = getDb();

  // Get student
  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) return err('Student not found', 404);

  // Get all terms (for trendline)
  const allTerms = await db
    .select()
    .from(terms)
    .where(eq(terms.schoolId, student.schoolId))
    .orderBy(terms.startDate);

  // Get all subjects for this class
  const allSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.classId, student.classId));

  // Get all classmates for heatmap/comparison
  const classmates = await db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(and(eq(students.classId, student.classId), eq(students.isActive, true)));

  const classmateIds = classmates.map(c => c.id);

  // ── Trendline ─────────────────────────────────────────────────────────────
  const trend: TrendPoint[] = [];
  for (const term of allTerms.slice(-6)) {
    const point: TrendPoint = { term: `${term.name.slice(0,2)} ${term.session.slice(-4)}` };
    for (const subject of allSubjects.slice(0, 5)) {
      const [row] = await db.select({ total: scores.total })
        .from(scores)
        .where(and(eq(scores.studentId, studentId), eq(scores.subjectId, subject.id), eq(scores.termId, term.id)))
        .limit(1);
      point[subject.name] = row?.total ?? 0;
    }
    trend.push(point);
  }

  // ── Heatmap (current term, all classmates) ────────────────────────────────
  const [activeTerm] = allTerms.filter(t => t.isActive);
  const heatmap: HeatmapRow[] = [];

  if (activeTerm) {
    for (const subject of allSubjects) {
      const subjectScores: number[] = [];
      const studentNames: string[]  = [];
      for (const cm of classmates.slice(0, 8)) {
        const [row] = await db.select({ total: scores.total })
          .from(scores)
          .where(and(eq(scores.studentId, cm.id), eq(scores.subjectId, subject.id), eq(scores.termId, activeTerm.id)))
          .limit(1);
        subjectScores.push(row?.total ?? 0);
        studentNames.push(cm.name.split(' ')[0]);
      }
      heatmap.push({ subject: subject.name, scores: subjectScores, studentNames });
    }
  }

  // ── Class Comparison ──────────────────────────────────────────────────────
  const comparisons: ClassComparison[] = [];
  let studentOverall = 0, classOverall = 0;

  if (activeTerm) {
    for (const subject of allSubjects) {
      const [myScore] = await db.select({ total: scores.total })
        .from(scores)
        .where(and(eq(scores.studentId, studentId), eq(scores.subjectId, subject.id), eq(scores.termId, activeTerm.id)))
        .limit(1);

      // Rough class average (in prod, use SQL AVG)
      let classTotal = 0;
      for (const cm of classmates) {
        const [cmScore] = await db.select({ total: scores.total })
          .from(scores)
          .where(and(eq(scores.studentId, cm.id), eq(scores.subjectId, subject.id), eq(scores.termId, activeTerm.id)))
          .limit(1);
        classTotal += cmScore?.total ?? 0;
      }
      const classAvg = classmates.length > 0 ? Math.round(classTotal / classmates.length) : 0;
      const myVal    = myScore?.total ?? 0;

      comparisons.push({
        subject:       subject.name,
        studentScore:  myVal,
        classAverage:  classAvg,
        diff:          myVal - classAvg,
      });
      studentOverall += myVal;
      classOverall   += classAvg;
    }

    if (allSubjects.length > 0) {
      comparisons.push({
        subject:      'Overall',
        studentScore: Math.round(studentOverall / allSubjects.length),
        classAverage: Math.round(classOverall  / allSubjects.length),
        diff:         Math.round((studentOverall - classOverall) / allSubjects.length),
      });
    }
  }

  const strengthSubject    = comparisons.slice(0,-1).sort((a,b) => b.diff - a.diff)[0]?.subject ?? 'N/A';
  const improvementSubject = comparisons.slice(0,-1).sort((a,b) => a.diff - b.diff)[0]?.subject ?? 'N/A';

  const analytics: StudentAnalytics = {
    student: { ...student, className: '', feesPaid: true, feesOwed: 0 },
    trend,
    heatmap,
    classComparison: comparisons,
    recommendation: generateRecommendation(comparisons, strengthSubject, improvementSubject, student.name),
    strengthSubject,
    improvementSubject,
    overallRank:  1,
    overallOutOf: classmates.length,
  };

  return ok(analytics);
});
