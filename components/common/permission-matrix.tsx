"use client"

import { Fragment } from "react"
import { Check, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Permission, Role } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PermissionMatrixProps {
  roles: Role[]
  permissions: Permission[]
  className?: string
}

export function PermissionMatrix({ roles, permissions, className }: PermissionMatrixProps) {
  const categories = [...new Set(permissions.map((p) => p.category))]

  return (
    <div className={cn("overflow-x-auto rounded-sm border border-border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] sticky start-0 bg-surface z-10">دسترسی</TableHead>
            {roles.map((role) => (
              <TableHead key={role.id} className="min-w-[100px] text-center">
                <div className="flex flex-col items-center gap-1">
                  <span>{role.name}</span>
                  {role.isSystem ? (
                    <Badge variant="secondary" className="text-[10px]">
                      سیستمی
                    </Badge>
                  ) : null}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <Fragment key={category}>
              <TableRow key={`cat-${category}`} className="bg-muted/30">
                <TableCell
                  colSpan={roles.length + 1}
                  className="sticky start-0 font-medium text-sm text-muted-foreground"
                >
                  {category}
                </TableCell>
              </TableRow>
              {permissions
                .filter((p) => p.category === category)
                .map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="sticky start-0 bg-card">
                      <div>
                        <p className="text-sm font-medium">{permission.label}</p>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </TableCell>
                    {roles.map((role) => {
                      const hasPermission = role.permissions.includes(permission.key)
                      return (
                        <TableCell key={role.id} className="text-center">
                          {hasPermission ? (
                            <Check className="mx-auto h-4 w-4 text-success" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
