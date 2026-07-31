import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthFormCardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AuthFormCard({ title, description, children, className }: AuthFormCardProps) {
  return (
    <Card className={cn("shadow-level-1", className)}>
      {title ? (
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-[-0.02em]">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={title ? undefined : "pt-4"}>{children}</CardContent>
    </Card>
  )
}
