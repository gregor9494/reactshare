"use client"

import { cn } from "@/lib/utils"
import { BarChart3 as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, CartesianGrid, Cell, Legend, Line, LineChart as RechartsLineChart, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const COLORS = [
  "#2563eb", // blue-600
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#6366f1", // indigo-500
  "#06b6d4", // cyan-500
];

interface ChartProps {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  yAxisWidth?: number
  showXAxis?: boolean
  showYAxis?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  showGridLines?: boolean
  showAnimation?: boolean
  startEndOnly?: boolean
  className?: string
  height?: number | string
}

export function LineChart({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter = (value: number) => value.toString(),
  yAxisWidth = 56,
  showXAxis = true,
  showYAxis = true,
  showLegend = true,
  showTooltip = true,
  showGridLines = true,
  showAnimation = true,
  startEndOnly = false,
  className,
  height = 300,
}: ChartProps) {
  const [animate, setAnimate] = useState(false);
  const formattedData = useMemo(() => [...data], [data]);
  
  useEffect(() => {
    if (showAnimation) {
      setAnimate(true);
    }
  }, [showAnimation]);

  // Handle xAxis tick values when startEndOnly is true
  const customTicksX = useMemo(() => {
    if (!startEndOnly || !formattedData.length) return undefined;
    return [0, formattedData.length - 1];
  }, [formattedData, startEndOnly]);

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={formattedData} margin={{ left: 0, top: 8, right: 0, bottom: 4 }}>
          {showGridLines && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              horizontal={true}
              vertical={false} 
              stroke="#E5E7EB" 
            />
          )}
          
          {showXAxis && (
            <XAxis 
              dataKey={index} 
              tickLine={false} 
              axisLine={false}
              ticks={customTicksX}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickMargin={8}
            />
          )}
          
          {showYAxis && (
            <YAxis
              width={yAxisWidth}
              tickLine={false} 
              axisLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={valueFormatter as (value: any) => string}
              tickMargin={8}
            />
          )}
          
          {showTooltip && (
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: entry.color }} 
                            />
                            <span className="font-medium">{entry.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {valueFormatter(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>  
                  </div>
                );
              }}
            />
          )}
          
          {showLegend && (
            <Legend
              content={(props) => {
                const { payload } = props;
                return (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                    {payload?.map((entry, index) => (
                      <div key={`item-${index}`} className="flex items-center gap-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          )}
          
          {categories.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ strokeWidth: 2, r: 2 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={1000}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChart({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter = (value: number) => value.toString(),
  yAxisWidth = 56,
  showXAxis = true,
  showYAxis = true,
  showLegend = true,
  showTooltip = true,
  showGridLines = true,
  showAnimation = true,
  startEndOnly = false,
  className,
  height = 300,
}: ChartProps) {
  const [animate, setAnimate] = useState(false);
  const formattedData = useMemo(() => [...data], [data]);
  
  useEffect(() => {
    if (showAnimation) {
      setAnimate(true);
    }
  }, [showAnimation]);

  // Handle xAxis tick values when startEndOnly is true
  const customTicksX = useMemo(() => {
    if (!startEndOnly || !formattedData.length) return undefined;
    return [0, formattedData.length - 1];
  }, [formattedData, startEndOnly]);

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={formattedData} margin={{ left: 0, top: 8, right: 0, bottom: 4 }}>
          {showGridLines && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              horizontal={true}
              vertical={false} 
              stroke="#E5E7EB" 
            />
          )}
          
          {showXAxis && (
            <XAxis 
              dataKey={index} 
              tickLine={false} 
              axisLine={false}
              ticks={customTicksX}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickMargin={8}
            />
          )}
          
          {showYAxis && (
            <YAxis
              width={yAxisWidth}
              tickLine={false} 
              axisLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={valueFormatter as (value: any) => string}
              tickMargin={8}
            />
          )}
          
          {showTooltip && (
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <div 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: entry.color }} 
                            />
                            <span className="font-medium">{entry.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {valueFormatter(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>  
                  </div>
                );
              }}
            />
          )}
          
          {showLegend && (
            <Legend
              content={(props) => {
                const { payload } = props;
                return (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                    {payload?.map((entry, index) => (
                      <div key={`item-${index}`} className="flex items-center gap-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          )}
          
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]} 
              isAnimationActive={animate}
              animationDuration={1000}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  showLabel?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  className?: string;
  colors?: string[];
  height?: number | string;
}

export function PieChart({
  data,
  valueFormatter = (value: number) => value.toString(),
  showAnimation = true,
  showLabel = true,
  showLegend = true,
  showTooltip = true,
  className,
  colors = COLORS,
  height = 300,
}: PieChartProps) {
  const [animate, setAnimate] = useState(false);
  const formattedData = useMemo(() => [...data], [data]);
  
  useEffect(() => {
    if (showAnimation) {
      setAnimate(true);
    }
  }, [showAnimation]);

  // Calculate total value for percentage calculations
  const total = formattedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                const percentage = ((data.value / total) * 100).toFixed(1);
                
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{data.name}</span>
                      <span className="text-sm text-muted-foreground">{valueFormatter(data.value)} ({percentage}%)</span>
                    </div>
                  </div>
                );
              }}
            />
          )}

          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            paddingAngle={2}
            dataKey="value"
            label={showLabel ? ({
              name, value, percent
            }) => `${name}: ${valueFormatter(value)} (${(percent * 100).toFixed(0)}%)` : false}
            labelLine={showLabel}
            isAnimationActive={animate}
            animationDuration={1000}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          
          {showLegend && (
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              content={(props) => {
                const { payload } = props;
                return (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                    {payload?.map((entry, index) => (
                      <div key={`item-${index}`} className="flex items-center gap-1">
                        <div
                          className="h-2.5 w-2.5 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartIcon({ type }: { type: 'line' | 'bar' | 'pie' }) {
  switch(type) {
    case 'line':
      return <LineChartIcon className="h-4 w-4" />;
    case 'bar':
      return <BarChartIcon className="h-4 w-4" />;
    case 'pie':
      return <PieChartIcon className="h-4 w-4" />;
    default:
      return <BarChartIcon className="h-4 w-4" />;
  }
}
