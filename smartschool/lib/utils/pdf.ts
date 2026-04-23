// lib/utils/pdf.ts — Report card PDF generation (react-pdf/renderer)
// Install: npm install @react-pdf/renderer
// Usage: called from /api/reports/pdf/[studentId]/route.ts

// NOTE: This file uses dynamic imports because @react-pdf/renderer
// cannot run in Edge Runtime — use nodejs runtime for PDF routes.

import type { ReportCard } from '@/lib/types';

export interface PDFReportCardData extends ReportCard {
  schoolName:  string;
  schoolAddress: string;
  logoUrl?:    string;
  sessionName: string;
  termName:    string;
  nextTermDate?: string;
}

// ─── Generate PDF buffer ──────────────────────────────────────────────────────
export async function generateReportCardPDF(data: PDFReportCardData): Promise<Buffer> {
  // Dynamic import keeps this out of Edge bundle
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { createElement: e } = await import('react');
  const {
    Document, Page, Text, View, StyleSheet, Font, Image,
  } = await import('@react-pdf/renderer');

  Font.register({
    family: 'Poppins',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJDUc1NECPY.woff2', fontWeight: 400 },
      { src: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9V1tvFP-KUEg.woff2', fontWeight: 700 },
    ],
  });

  const styles = StyleSheet.create({
    page:        { fontFamily: 'Poppins', backgroundColor: '#F8F9FA', padding: 28 },
    header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#4B5563' },
    schoolName:  { fontSize: 16, fontWeight: 700, color: '#1F2937' },
    schoolAddr:  { fontSize: 8, color: '#6B7280', marginTop: 2 },
    termBadge:   { marginLeft: 'auto', backgroundColor: '#4B5563', padding: '4 10', borderRadius: 6 },
    termText:    { color: '#FFFFFF', fontSize: 8, fontWeight: 700 },
    studentBox:  { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    studentName: { fontSize: 14, fontWeight: 700, color: '#1F2937' },
    studentMeta: { fontSize: 9, color: '#6B7280', marginTop: 2 },
    rankBadge:   { marginLeft: 'auto', alignItems: 'center' },
    rankNum:     { fontSize: 22, fontWeight: 700, color: '#0047AB' },
    rankLabel:   { fontSize: 7, color: '#6B7280' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#4B5563', borderRadius: '4 4 0 0', padding: '6 8' },
    tableRow:    { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tableRowAlt: { flexDirection: 'row', backgroundColor: '#F9FAFB', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    colSubject:  { flex: 3, fontSize: 9, color: '#FFFFFF' },
    colScore:    { flex: 1, fontSize: 9, color: '#FFFFFF', textAlign: 'center' },
    colSubjectD: { flex: 3, fontSize: 9, color: '#1F2937' },
    colScoreD:   { flex: 1, fontSize: 9, color: '#1F2937', textAlign: 'center' },
    colGradeD:   { flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'center' },
    totalRow:    { flexDirection: 'row', backgroundColor: '#EBF9F2', padding: '6 8', borderRadius: '0 0 4 4', borderTopWidth: 1, borderTopColor: '#00A651' },
    summaryBox:  { flexDirection: 'row', gap: 8, marginTop: 10 },
    summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 6, padding: 8, alignItems: 'center' },
    summaryVal:  { fontSize: 16, fontWeight: 700, color: '#0047AB' },
    summaryLbl:  { fontSize: 7, color: '#6B7280', marginTop: 1 },
    remarkBox:   { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, marginTop: 10 },
    remarkLabel: { fontSize: 8, fontWeight: 700, color: '#6B7280', marginBottom: 3 },
    remarkText:  { fontSize: 9, color: '#1F2937', lineHeight: 1.5 },
    footer:      { marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerText:  { fontSize: 7, color: '#9CA3AF' },
    gradeBadge:  (total: number) => ({
      backgroundColor: total >= 70 ? '#EBF9F2' : total >= 50 ? '#FFF3E8' : '#FEF2F2',
    }),
    gradeText: (total: number) => ({
      color: total >= 70 ? '#00A651' : total >= 50 ? '#F4A261' : '#EF4444',
    }),
  });

  function getGradeLocal(total: number): string {
    if (total >= 75) return 'A1'; if (total >= 70) return 'B2'; if (total >= 65) return 'B3';
    if (total >= 60) return 'C4'; if (total >= 55) return 'C5'; if (total >= 50) return 'C6';
    if (total >= 45) return 'D7'; if (total >= 40) return 'E8'; return 'F9';
  }

  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page },
      // Header
      e(View, { style: styles.header },
        data.logoUrl ? e(Image, { src: data.logoUrl, style: { width: 44, height: 44, borderRadius: 8, marginRight: 10 } }) : null,
        e(View, null,
          e(Text, { style: styles.schoolName }, data.schoolName.toUpperCase()),
          e(Text, { style: styles.schoolAddr }, data.schoolAddress),
          e(Text, { style: { ...styles.schoolAddr, marginTop: 1, fontWeight: 700, color: '#4B5563' } }, 'STUDENT REPORT CARD'),
        ),
        e(View, { style: styles.termBadge },
          e(Text, { style: styles.termText }, `${data.termName} · ${data.sessionName}`),
        ),
      ),

      // Student info + rank
      e(View, { style: styles.studentBox },
        e(View, null,
          e(Text, { style: styles.studentName }, data.studentName.toUpperCase()),
          e(Text, { style: styles.studentMeta }, `Class: ${data.className}   Admission No: ${(data as Record<string, unknown>).admNo ?? 'N/A'}`),
        ),
        e(View, { style: styles.rankBadge },
          e(Text, { style: styles.rankNum }, `${data.position}${data.position === 1 ? 'st' : data.position === 2 ? 'nd' : data.position === 3 ? 'rd' : 'th'}`),
          e(Text, { style: styles.rankLabel }, `of ${data.outOf} students`),
        ),
      ),

      // Score table header
      e(View, { style: styles.tableHeader },
        e(Text, { style: styles.colSubject }, 'Subject'),
        e(Text, { style: styles.colScore }, 'CA1'),
        e(Text, { style: styles.colScore }, 'CA2'),
        e(Text, { style: styles.colScore }, 'Exam'),
        e(Text, { style: styles.colScore }, 'Total'),
        e(Text, { style: styles.colScore }, 'Grade'),
        e(Text, { style: styles.colScore }, 'Position'),
      ),

      // Score rows
      ...data.scores.map((s, i) =>
        e(View, { key: s.subjectId, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          e(Text, { style: styles.colSubjectD }, (s as Record<string, unknown>).subjectName as string ?? `Subject ${i + 1}`),
          e(Text, { style: styles.colScoreD },  String(s.ca1)),
          e(Text, { style: styles.colScoreD },  String(s.ca2)),
          e(Text, { style: styles.colScoreD },  String(s.exam)),
          e(Text, { style: { ...styles.colScoreD, fontWeight: 700 } }, String(s.total)),
          e(Text, { style: { ...styles.colGradeD, ...styles.gradeText(s.total) } }, getGradeLocal(s.total)),
          e(Text, { style: styles.colScoreD },  String(s.position)),
        )
      ),

      // Total row
      e(View, { style: styles.totalRow },
        e(Text, { style: { ...styles.colSubjectD, fontWeight: 700, color: '#00A651' } }, 'OVERALL TOTAL'),
        e(Text, { style: styles.colScoreD }, ''),
        e(Text, { style: styles.colScoreD }, ''),
        e(Text, { style: styles.colScoreD }, ''),
        e(Text, { style: { ...styles.colScoreD, fontWeight: 700, color: '#00A651' } }, String(data.overallTotal)),
        e(Text, { style: styles.colScoreD }, ''),
        e(Text, { style: styles.colScoreD }, ''),
      ),

      // Summary cards
      e(View, { style: styles.summaryBox },
        ...[
          { l: 'Total Score',     v: String(data.overallTotal),  },
          { l: 'Average',         v: `${data.overallAverage}%`   },
          { l: 'Class Position',  v: `${data.position}/${data.outOf}` },
        ].map(s =>
          e(View, { key: s.l, style: styles.summaryCard },
            e(Text, { style: styles.summaryVal }, s.v),
            e(Text, { style: styles.summaryLbl }, s.l),
          )
        ),
      ),

      // Remarks
      e(View, { style: styles.remarkBox },
        e(Text, { style: styles.remarkLabel }, "CLASS TEACHER'S REMARK"),
        e(Text, { style: styles.remarkText }, data.teacherRemark),
        e(View, { style: { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 6, paddingTop: 6 } },
          e(Text, { style: styles.remarkLabel }, "PRINCIPAL'S REMARK"),
          e(Text, { style: styles.remarkText }, data.principalRemark),
        ),
      ),

      // Footer
      e(View, { style: styles.footer },
        e(Text, { style: styles.footerText }, `Generated by SmartSchool · ${new Date().toLocaleDateString('en-NG')}`),
        data.nextTermDate
          ? e(Text, { style: styles.footerText }, `Next term begins: ${data.nextTermDate}`)
          : null,
      ),
    )
  );

  return renderToBuffer(doc) as Promise<Buffer>;
}
