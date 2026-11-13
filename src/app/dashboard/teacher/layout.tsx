import React from 'react';
import { TeacherHelpFAB } from '@/components/teacher/TeacherHelpFAB';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TeacherHelpFAB />
    </>
  );
}
