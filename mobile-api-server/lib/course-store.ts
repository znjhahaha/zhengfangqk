// 课程数据全局状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Course {
  kch_id: string
  kcmc: string
  jxb_id: string
  jsxm: string
  kclb: string
  xf: string
  sksj: string
  skdd: string
  bjrs: string
  yxrs: string
  kkxy: string
  kkzy: string
  kkxq: string
  kkzc: string
  kkdm: string
  kkmm: string
  kkms: string
  kkzt: string
  kkztmc: string
  kkztms: string
  do_jxb_id?: string
  jxbzls?: string
  [key: string]: any
}

interface CourseStore {
  // 数据状态
  availableCourses: Course[]
  selectedCourses: Course[]
  
  // 加载状态
  dataLoaded: {
    available: boolean
    selected: boolean
  }
  
  // 操作函数
  setAvailableCourses: (courses: Course[]) => void
  setSelectedCourses: (courses: Course[]) => void
  setDataLoaded: (type: 'available' | 'selected', loaded: boolean) => void
  clearData: () => void
  clearAvailableCourses: () => void
  clearSelectedCourses: () => void
}

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      availableCourses: [],
      selectedCourses: [],
      dataLoaded: {
        available: false,
        selected: false
      },
      
      // 设置可选课程
      setAvailableCourses: (courses) => set({
        availableCourses: courses,
        dataLoaded: { ...get().dataLoaded, available: true }
      }),
      
      // 设置已选课程
      setSelectedCourses: (courses) => set({
        selectedCourses: courses,
        dataLoaded: { ...get().dataLoaded, selected: true }
      }),
      
      // 设置数据加载状态
      setDataLoaded: (type, loaded) => set({
        dataLoaded: { ...get().dataLoaded, [type]: loaded }
      }),
      
      // 清空所有数据
      clearData: () => set({
        availableCourses: [],
        selectedCourses: [],
        dataLoaded: { available: false, selected: false }
      }),
      
      // 清空可选课程
      clearAvailableCourses: () => set({
        availableCourses: [],
        dataLoaded: { ...get().dataLoaded, available: false }
      }),
      
      // 清空已选课程
      clearSelectedCourses: () => set({
        selectedCourses: [],
        dataLoaded: { ...get().dataLoaded, selected: false }
      })
    }),
    {
      name: 'course-store', // 本地存储的key
      // 只持久化数据，不持久化加载状态
      partialize: (state) => ({
        availableCourses: state.availableCourses,
        selectedCourses: state.selectedCourses
      })
    }
  )
)
