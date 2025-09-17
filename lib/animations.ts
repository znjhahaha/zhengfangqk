// 全局动画配置
export const animations = {
  // 页面进入动画
  pageEnter: {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -30, scale: 0.95 },
    transition: { 
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },

  // 卡片进入动画
  cardEnter: {
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },

  // 悬停动画
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },

  // 点击动画
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },

  // 弹簧动画
  spring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20
  },

  // 按钮动画
  button: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 300 }
  },

  // 图标旋转动画
  iconRotate: {
    whileHover: { rotate: 360 },
    transition: { duration: 0.5 }
  },

  // 图标脉冲动画
  iconPulse: {
    animate: { 
      scale: [1, 1.2, 1],
      rotate: [0, 5, -5, 0]
    },
    transition: { 
      duration: 2,
      repeat: Infinity,
      repeatDelay: 1
    }
  },

  // 加载动画
  loading: {
    animate: { rotate: 360 },
    transition: { 
      duration: 1, 
      repeat: Infinity, 
      ease: "linear" 
    }
  },

  // 渐变背景动画
  gradientBackground: {
    initial: { x: "-100%" },
    whileHover: { x: "100%" },
    transition: { duration: 0.6 }
  },

  // 列表项动画
  listItem: (index: number) => ({
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: index * 0.1, duration: 0.5 }
  }),

  // 统计卡片动画
  statsCard: (index: number) => ({
    initial: { opacity: 0, y: 20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      delay: 0.2 + index * 0.1, 
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }),

  // 表格行动画
  tableRow: (index: number) => ({
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.2 + index * 0.1 }
  }),

  // 课程卡片动画
  courseCard: (index: number) => ({
    initial: { opacity: 0, y: 30, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      delay: index * 0.08,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    },
    whileHover: { 
      y: -5,
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    layout: true
  }),

  // 标签页动画
  tab: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring" as const, stiffness: 300 }
  },

  // 模态框动画
  modal: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
    transition: { 
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },

  // 通知动画
  notification: {
    initial: { opacity: 0, x: 300, scale: 0.8 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 300, scale: 0.8 },
    transition: { 
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

// 动画变体
export const variants = {
  // 容器变体
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  },

  // 子元素变体
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },

  // 列表变体
  list: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  },

  // 列表项变体
  listItem: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4
      }
    }
  }
}

// 缓动函数
export const easings = {
  easeInOut: [0.25, 0.46, 0.45, 0.94],
  easeOut: [0.16, 1, 0.3, 1],
  easeIn: [0.4, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
}
