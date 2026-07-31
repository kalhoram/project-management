"use client"

import type { ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const CHART_COLORS = ["#0052CC", "#00B8D9", "#6554C0", "#00875A", "#FF991F", "#DE350B", "#6B778C"]

interface ReportChartCardProps {
  title: string
  description?: string
  isLoading?: boolean
  className?: string
  actions?: ReactNode
  height?: number
}

function ChartWrapper({
  title,
  description,
  isLoading,
  className,
  actions,
  height = 280,
  children,
}: ReportChartCardProps & { children: ReactNode }) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

interface BarChartCardProps extends ReportChartCardProps {
  data: { name: string; value: number; fill?: string }[]
  dataKey?: string
}

export function BarChartCard({
  data,
  dataKey = "value",
  ...props
}: BarChartCardProps) {
  return (
    <ChartWrapper {...props}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B778C" }} />
        <YAxis tick={{ fontSize: 12, fill: "#6B778C" }} />
        <Tooltip
          contentStyle={{
            background: "#172B4D",
            border: "none",
            borderRadius: 3,
            color: "#fff",
            fontSize: 12,
          }}
        />
        <Bar dataKey={dataKey} radius={[2, 2, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.fill ?? CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  )
}

interface PieChartCardProps extends ReportChartCardProps {
  data: { name: string; value: number }[]
}

export function PieChartCard({ data, ...props }: PieChartCardProps) {
  return (
    <ChartWrapper {...props}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#172B4D",
            border: "none",
            borderRadius: 3,
            color: "#fff",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartWrapper>
  )
}

interface LineChartCardProps extends ReportChartCardProps {
  data: Record<string, string | number>[]
  lines: { dataKey: string; name: string; color?: string }[]
  xKey?: string
}

export function LineChartCard({
  data,
  lines,
  xKey = "name",
  ...props
}: LineChartCardProps) {
  return (
    <ChartWrapper {...props}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#6B778C" }} />
        <YAxis tick={{ fontSize: 12, fill: "#6B778C" }} />
        <Tooltip
          contentStyle={{
            background: "#172B4D",
            border: "none",
            borderRadius: 3,
            color: "#fff",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  className?: string
}

export function MetricCard({ label, value, change, trend, className }: MetricCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {change ? (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
