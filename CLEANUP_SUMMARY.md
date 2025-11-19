# 🧹 项目清理总结

## ✅ 已删除的文件和目录

### Python文件（exe版）
- ✅ `gui.py` - 图形界面主程序
- ✅ `CCSU_course.py` - 命令行版本
- ✅ `course_api_json.py` - 课程API模块
- ✅ `course_query.py` - 课程查询模块
- ✅ `course_selection_js.py` - 选课JS模块
- ✅ `main.py` - 主程序入口
- ✅ `global_config.py` - 全局配置
- ✅ `jsFunction.py` - JS函数模块
- ✅ `analyze_kb.py` - 课表分析
- ✅ `analyze_pages.py` - 页面分析
- ✅ `fetch_course_json.py` - 课程数据获取
- ✅ `get_course_info.py` - 课程信息获取

### 配置和数据文件
- ✅ `requirements.txt` - Python依赖
- ✅ `setting.json` - exe版配置文件
- ✅ `package.json` (根目录) - exe版Node配置
- ✅ `package-lock.json` (根目录) - exe版依赖锁定文件

### HTML文件（exe版）
- ✅ `course_selection_page.html`
- ✅ `debug_page.html`
- ✅ `student_info_page.html`

### 构建产物目录
- ✅ `__pycache__/` - Python缓存目录
- ✅ `build/` - exe构建目录
- ✅ `dist/` - exe输出目录
- ✅ `course_data/` - exe版课程数据
- ✅ `raw_data/` - exe版原始数据
- ✅ `node_modules/` (根目录) - exe版Node模块

## 📁 保留的文件和目录

### 核心应用
- ✅ `nextjs-course-selector/` - Next.js应用（网页版和手机版）
  - 包含所有Web和移动端代码
  - Android项目配置
  - Capacitor配置

### 文档
- ✅ `README.md` - 更新后的项目说明（仅包含网页版和手机版）
- ✅ `nextjs-course-selector/README.md` - 详细技术文档
- ✅ `nextjs-course-selector/SETUP_COMPLETE.md` - APK配置指南
- ✅ `nextjs-course-selector/APK_BUILD_GUIDE.md` - APK快速构建指南
- ✅ `nextjs-course-selector/BUILD_APK.md` - APK详细构建文档
- ✅ `nextjs-course-selector/STATIC_EXPORT_NOTES.md` - 静态导出说明
- ✅ `nextjs-course-selector/API_ROUTES_HANDLING.md` - API路由处理说明
- ✅ `nextjs-course-selector/COS_SETUP.md` - COS存储配置

### 构建脚本（用于APK）
- ✅ `nextjs-course-selector/build-apk.bat` - Windows构建脚本
- ✅ `nextjs-course-selector/build-apk.sh` - Linux/Mac构建脚本

## 📊 清理统计

- **删除文件数**: 约20个文件
- **删除目录数**: 约5个目录
- **保留的核心目录**: `nextjs-course-selector/`

## 🎯 当前项目结构

```
.
├── README.md                    # 项目说明（已更新）
├── CLEANUP_SUMMARY.md          # 本文件
└── nextjs-course-selector/      # Next.js应用
    ├── app/                    # Next.js App Router
    ├── components/             # React组件
    ├── lib/                    # 工具函数
    ├── android/                # Android项目（APK）
    ├── public/                 # 静态资源
    ├── data/                   # 数据文件
    ├── scripts/                # 构建脚本
    └── ...                     # 其他配置文件
```

## ✨ 清理完成

项目已成功清理，现在只包含：
- ✅ **网页版** - Next.js Web应用
- ✅ **手机版** - Capacitor Android APK

所有exe版相关文件已完全删除。

