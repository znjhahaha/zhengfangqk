'use client'

import { motion } from 'framer-motion'

interface ChartData {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: ChartData[]
  title?: string
  height?: number
}

export function SimpleBarChart({ data, title, height = 200 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
      )}
      <div className="space-y-3" style={{ minHeight: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100
          const color = item.color || `hsl(${(index * 360) / data.length}, 70%, 60%)`
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-300 truncate flex-1 mr-2">{item.label}</span>
                <span className="text-white font-medium">{item.value}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 sm:h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SimplePieChartProps {
  data: ChartData[]
  title?: string
  size?: number
}

export function SimplePieChart({ data, title, size = 200 }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  // 过滤掉值为0的数据，但保留在图例中显示
  const filteredData = data.filter(item => item.value > 0)
  
  // 如果没有有效数据，显示空状态
  if (total === 0 || filteredData.length === 0) {
    return (
      <div className="w-full">
        {title && (
          <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-8">
          <div className="relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-30">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 10}
                fill="none"
                stroke="rgb(100 116 139)"
                strokeWidth="2"
              />
            </svg>
            <text
              x={size / 2}
              y={size / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xl font-bold fill-gray-500"
              style={{ transform: 'translate(0, 4px)' }}
            >
              0
            </text>
          </div>
          <div className="space-y-2 min-w-0">
            {data.map((item, index) => {
              const defaultColors = [
                '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
                '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
              ]
              const color = item.color || defaultColors[index % defaultColors.length]
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 4px ${color}40`
                    }}
                  />
                  <span className="text-xs sm:text-sm text-gray-300 truncate flex-1">
                    {item.label}
                  </span>
                  <span className="text-xs sm:text-sm text-white font-medium">
                    {item.value} (0.0%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
  
  const center = size / 2
  const outerRadius = center - 10
  const innerRadius = center - 50 // 内部圆半径，创建甜甜圈效果
  
  // 使用更鲜明、高对比度的颜色数组
  const defaultColors = [
    '#10b981', // 明亮的绿色
    '#3b82f6', // 明亮的蓝色
    '#8b5cf6', // 明亮的紫色
    '#f59e0b', // 明亮的橙色
    '#ef4444', // 明亮的红色
    '#06b6d4', // 明亮的青色
    '#ec4899', // 明亮的粉色
    '#84cc16'  // 明亮的黄绿色
  ]
  
  let currentAngle = -90 // 从顶部开始（12点方向）
  
  const segments = filteredData.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (percentage / 100) * 360
    
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    
    // 转换为弧度
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180
    
    // 计算外圆上的点
    const x1 = center + outerRadius * Math.cos(startAngleRad)
    const y1 = center + outerRadius * Math.sin(startAngleRad)
    const x2 = center + outerRadius * Math.cos(endAngleRad)
    const y2 = center + outerRadius * Math.sin(endAngleRad)
    
    // 计算内圆上的点
    const x3 = center + innerRadius * Math.cos(endAngleRad)
    const y3 = center + innerRadius * Math.sin(endAngleRad)
    const x4 = center + innerRadius * Math.cos(startAngleRad)
    const y4 = center + innerRadius * Math.sin(startAngleRad)
    
    // 判断是否需要大弧
    const largeArcFlag = angle > 180 ? 1 : 0
    
    // 创建路径：从内圆起点 -> 外圆起点 -> 外圆弧 -> 外圆终点 -> 内圆终点 -> 内圆弧 -> 闭合
    const pathData = [
      `M ${x4} ${y4}`, // 内圆起点
      `L ${x1} ${y1}`, // 到外圆起点
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // 外圆弧
      `L ${x3} ${y3}`, // 到内圆终点
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`, // 内圆弧（反向）
      'Z' // 闭合路径
    ].join(' ')
    
    currentAngle += angle
    
    // 使用新的颜色数组
    const color = item.color || defaultColors[index % defaultColors.length]
    
    return {
      ...item,
      pathData,
      percentage,
      color,
      startAngle,
      endAngle
    }
  })
  
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-shrink-0 relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((segment, index) => (
              <motion.path
                key={index}
                d={segment.pathData}
                fill={segment.color}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                stroke="rgb(15 23 42)"
                strokeWidth="3"
                strokeLinejoin="round"
                style={{ filter: 'brightness(1.1) saturate(1.2)' }}
              />
            ))}
            {/* 中心文字 */}
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xl sm:text-2xl font-bold fill-white pointer-events-none"
            >
              {total}
            </text>
          </svg>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {/* 显示所有数据项，包括值为0的 */}
          {data.map((item, index) => {
            const actualItem = filteredData.find(d => d.label === item.label)
            const percentage = actualItem 
              ? (actualItem.value / total) * 100 
              : 0
            const defaultColors = [
              '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
              '#ef4444', '#06b6d4', '#ec4899', '#84cc16'
            ]
            const color = item.color || defaultColors[index % defaultColors.length]
            
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded flex-shrink-0"
                  style={{ 
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}40`
                  }}
                />
                <span className="text-xs sm:text-sm text-gray-300 truncate flex-1">
                  {item.label}
                </span>
                <span className="text-xs sm:text-sm text-white font-medium whitespace-nowrap">
                  {item.value} ({isNaN(percentage) || !isFinite(percentage) ? '0.0' : percentage.toFixed(1)}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SimpleLineChartProps {
  data: { label: string; value: number }[]
  title?: string
  height?: number
  color?: string
}

export function SimpleLineChart({ data, title, height = 200, color = '#06b6d4' }: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full text-center text-gray-400 py-8">
        <p className="text-sm">暂无数据</p>
      </div>
    )
  }

  // 确保至少有2个数据点才能绘制折线
  if (data.length < 2) {
    return (
      <div className="w-full text-center text-gray-400 py-8">
        <p className="text-sm">数据点不足，至少需要2个数据点</p>
      </div>
    )
  }

  // 计算数据范围
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  
  // 计算合适的Y轴最大值（向上取整到合适的整数）
  let adjustedMax = maxValue
  if (maxValue > 0) {
    if (maxValue <= 10) {
      // 小值：向上取整
      adjustedMax = Math.ceil(maxValue)
    } else {
      // 大值：向上取整到合适的刻度
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)))
      const normalized = maxValue / magnitude
      let multiplier = 1
      if (normalized > 5) multiplier = 10
      else if (normalized > 2) multiplier = 5
      else if (normalized > 1) multiplier = 2
      adjustedMax = Math.ceil(maxValue / (magnitude * multiplier)) * magnitude * multiplier
    }
  } else {
    adjustedMax = 1
  }
  
  const range = adjustedMax - minValue || 1
  
  // 计算Y轴刻度值（整数刻度，均匀分布）
  const yTicks: number[] = []
  const numTicks = 5 // 显示5个刻度（0, 1, 2, 3, 4, 5 或类似）
  
  // 计算合适的刻度间隔
  let tickStep = adjustedMax / numTicks
  // 将刻度间隔调整为整数
  if (adjustedMax <= 10) {
    if (tickStep <= 1) tickStep = 1
    else if (tickStep <= 2) tickStep = 2
    else tickStep = Math.ceil(tickStep)
  } else {
    tickStep = Math.ceil(tickStep / 10) * 10
  }
  
  // 生成刻度值
  for (let v = minValue; v <= adjustedMax + 0.01; v += tickStep) {
    yTicks.push(Math.round(v))
  }
  // 确保包含最大值
  if (yTicks[yTicks.length - 1] < adjustedMax) {
    yTicks.push(adjustedMax)
  }
  
  // 图表尺寸
  const width = 100
  const chartHeight = height - 50
  const padding = 25
  
  // 计算每个点的坐标
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2)
    const normalizedValue = range > 0 ? (item.value - minValue) / range : 0
    const y = chartHeight - padding - normalizedValue * (chartHeight - padding * 2)
    return { x, y, value: item.value, label: item.label }
  })
  
  // 构建折线路径（直线连接）
  const pathData = points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')
  
  // 面积填充路径
  const areaPathData = `${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
  
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-white mb-4">{title}</h3>
      )}
      <div style={{ height: `${height}px` }} className="relative">
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
          {/* Y轴线 */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={padding}
            y2={padding}
            stroke="rgb(148 163 184)"
            strokeWidth="1"
            strokeOpacity="0.8"
          />
          
          {/* 网格线和Y轴刻度 */}
          {yTicks.map((value, i) => {
            const yPercent = (value - minValue) / range
            const y = chartHeight - padding - yPercent * (chartHeight - padding * 2)
            
            // 确保在有效范围内
            if (y < padding - 1 || y > chartHeight - padding + 1) return null
            
            return (
              <g key={i}>
                {/* 网格线 */}
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="rgb(51 65 85)"
                  strokeWidth="0.5"
                  strokeOpacity="0.5"
                />
                {/* 刻度线 */}
                <line
                  x1={padding - 2}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="rgb(148 163 184)"
                  strokeWidth="1"
                />
                {/* 标签 */}
                <text
                  x={padding - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-gray-300"
                  fontSize="9"
                  fontWeight="400"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {value}
                </text>
              </g>
            )
          })}
          
          {/* 面积填充 */}
          <motion.path
            d={areaPathData}
            fill={color}
            fillOpacity="0.1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          
          {/* 折线 */}
          <motion.path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          {/* 数据点 - 只显示有值的点 */}
          {points.map((point, index) => {
            if (point.value === 0) return null
            return (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="2"
                fill={color}
                stroke="rgb(15 23 42)"
                strokeWidth="1"
              />
            )
          })}
        </svg>
        
        {/* X轴标签 */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-3 pb-1">
          {data.map((item, index) => {
            if (!item.label) return <span key={index} style={{ flex: 1 }} />
            return (
              <span 
                key={index} 
                className="text-[9px] text-gray-400 truncate" 
                style={{ 
                  flex: 1, 
                  textAlign: index === 0 ? 'left' : index === data.length - 1 ? 'right' : 'center'
                }}
              >
                {item.label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
