/**
 * 学生信息全局状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StudentInfo {
  name: string
  studentId: string
  major: string
  grade: string
  college: string
}

interface StudentState {
  studentInfo: StudentInfo | null
  hasShownWelcome: boolean
  isFirstVisit: boolean
  setStudentInfo: (info: StudentInfo) => void
  setHasShownWelcome: (shown: boolean) => void
  setIsFirstVisit: (isFirst: boolean) => void
  clearStudentInfo: () => void
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      studentInfo: null,
      hasShownWelcome: false,
      isFirstVisit: true,
      
      setStudentInfo: (info) => set({ studentInfo: info }),
      
      setHasShownWelcome: (shown) => set({ hasShownWelcome: shown }),
      
      setIsFirstVisit: (isFirst) => set({ isFirstVisit: isFirst }),
      
      clearStudentInfo: () => set({ 
        studentInfo: null, 
        hasShownWelcome: false,
        isFirstVisit: true 
      }),
    }),
    {
      name: 'student-store',
      partialize: (state) => ({
        studentInfo: state.studentInfo,
        hasShownWelcome: state.hasShownWelcome,
        isFirstVisit: state.isFirstVisit,
      }),
    }
  )
)
