// app/api/reports/pdf/[studentId]/route.ts
// Returns a real PDF for download. Uses nodejs runtime (not edge).
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { scores, students, subjects, fees, terms, classes, schools } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth';
import { withErrorBoundary, err, getGrade } from '@/lib/utils/api';
import { generateReportCardPDF } from '@/lib/utils/pdf';

export const GET = withErrorBoundary(async (
  req: NextRequest,
  ctx: { params: { studentId: string } }
) => {
  await requireSession();
  const { studentId } = ctx.params;
  const termId = req.nextUrl.searchParams.get('termId');
  if (!termId) return err('termId required', 400);

  const db = getDb();

  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) return err('Student not found', 404);

  const [school]    = await db.select().from(schools).where(eq(schools.id, student.schoolId)).limit(1);
  const [cls]       = await db.select().from(classes).where(eq(classes.id, student.classId)).limit(1);
  const [term]      = await db.select().from(terms).where(eq(terms.id, termId)).limit(1);
  const allSubjects = await db.select().from(subjects).where(eq(subjects.classId, student.classId));
  const stuScores   = await db.select().from(scores).where(and(eq(scores.studentId, studentId), eq(scores.termId, termId)));
  const [feeRecord] = await db.select().from(fees).where(and(eq(fees.studentId, studentId), eq(fees.termId, termId))).limit(1);

  const balance = feeRecord ? feeRecord.amountDue - (feeRecord.amountPaid ?? 0) : 0;
  if (balance > 0) return err('Result is locked. Please clear outstanding fees first.', 403, 'RESULT_LOCKED');

  // Build full class to compute position
  const classStudents = await db.select({ id: students.id }).from(students).where(and(eq(students.classId, student.classId), eq(students.isActive, true)));
  const allClassScores = await db.select().from(scores).where(and(eq(scores.termId, termId), inArray(scores.studentId, classStudents.map(s => s.id))));

  const studentTotals = classStudents.map(s => ({
    id:    s.id,
    total: allClassScores.filter(sc => sc.studentId === s.id).reduce((sum, sc) => sum + (sc.total ?? 0), 0),
  })).sort((a, b) => b.total - a.total);
  const position = studentTotals.findIndex(s => s.id === studentId) + 1;

  const overallTotal   = stuScores.reduce((s, sc) => s + (sc.total ?? 0), 0);
  const overallAverage = allSubjects.length > 0 ? Math.round(overallTotal / allSubjects.length) : 0;

  const scoreData = allSubjects.map((sub, i) => {
    const sc    = stuScores.find(s => s.subjectId === sub.id);
    const total = sc?.total ?? 0;

    // Compute subject position
    const subjectScores = allClassScores
      .filter(s => s.subjectId === sub.id)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    const subPos = subjectScores.findIndex(s => s.studentId === studentId) + 1;

    return {
      studentId,
      subjectId:   sub.id,
      subjectName: sub.name,
      termId,
      ca1:      sc?.ca1  ?? 0,
      ca2:      sc?.ca2  ?? 0,
      exam:     sc?.exam ?? 0,
      total,
      grade:    getGrade(total),
      position: subPos,
    };
  });

  const pdfData = {
    studentId,
    studentName:     student.name,
    className:       cls?.name ?? student.classId,
    termId,
    scores:          scoreData,
    overallTotal,
    overallAverage,
    position,
    outOf:           classStudents.length,
    teacherRemark:   overallAverage >= 70 ? 'Excellent performance. Keep it up!' : overallAverage >= 55 ? 'Good effort. More dedication needed.' : 'Needs to work harder next term.',
    principalRemark: 'Promoted to next class.',
    isLocked:        false,
    feesOwed:        0,
    schoolName:      school?.name ?? 'SmartSchool',
    schoolAddress:   school?.address ?? '',
    logoUrl:         school?.logoUrl ?? undefined,
    sessionName:     term?.session ?? '2024/2025',
    termName:        term?.name    ?? 'First Term',
    nextTermDate:    term?.endDate ? new Date(new Date(term.endDate).getTime() + 14 * 86400000).toLocaleDateString('en-NG') : undefined,
  };

  const pdfBuffer = await generateReportCardPDF(pdfData);
  const fileName  = `${student.name.replace(/\s+/g, '_')}_${term?.name ?? 'Term'}_Report.pdf`;

  return new NextResponse(pdfBuffer, {
    status:  200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control':       'no-store',
    },
  });
});
