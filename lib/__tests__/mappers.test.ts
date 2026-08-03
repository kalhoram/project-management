import { describe, expect, it } from "vitest"
import {
  mapCapacityRow,
  mapDashboardMetrics,
  mapEstimationRow,
  mapMemberPerformanceRow,
  mapProgressTrendRow,
  mapWorkspaceMember,
} from "@/lib/api/mappers"

describe("api mappers", () => {
  it("maps capacity rows with utilization and fallback name", () => {
    const mapped = mapCapacityRow(
      {
        userId: "917a52cd-d3d0-51d5-8a7a-0818f040064e",
        workspaceId: "326613e1-f483-5194-9a8a-fd95e5560352",
        weekStart: "2026-07-27",
        capacityHours: 40,
        allocatedHours: 10,
        availableHours: 30,
      },
      "ادمین سیستم"
    )

    expect(mapped.name).toBe("ادمین سیستم")
    expect(mapped.utilization).toBe(25)
    expect(mapped.allocatedHours).toBe(10)
    expect(mapped.availableHours).toBe(30)
  })

  it("does not crash when capacity name is missing", () => {
    const mapped = mapCapacityRow({
      userId: "917a52cd-d3d0-51d5-8a7a-0818f040064e",
      workspaceId: "326613e1-f483-5194-9a8a-fd95e5560352",
      weekStart: "2026-07-27",
      capacityHours: 40,
      allocatedHours: 0,
      availableHours: 40,
    })

    expect(mapped.name).toBe("عضو تیم")
    expect(mapped.utilization).toBe(0)
  })

  it("maps dashboard metrics openTasks from total/completed", () => {
    const mapped = mapDashboardMetrics({
      totalProjects: 9,
      activeProjects: 9,
      totalTasks: 11,
      completedTasks: 1,
      overdueTasks: 0,
      totalMembers: 6,
      tasksDueThisWeek: 3,
      completionRate: 9.1,
    })

    expect(mapped.openTasks).toBe(10)
    expect(mapped.totalProjects).toBe(9)
    expect(mapped.members).toBe(6)
  })

  it("maps member performance contract fields including overdue count", () => {
    const mapped = mapMemberPerformanceRow({
      userId: "e8a1db8f-10ad-51d3-969a-7fdfde7e23c0",
      userName: "سارا رضایی",
      tasksAssigned: 2,
      tasksCompleted: 1,
      tasksOverdue: 1,
      avgCompletionHours: null,
      onTimeRate: 100,
    })

    expect(mapped.name).toBe("سارا رضایی")
    expect(mapped.completed).toBe(1)
    expect(mapped.open).toBe(1)
    expect(mapped.overdue).toBe(1)
  })

  it("maps progress trend rows with week labels", () => {
    const mapped = mapProgressTrendRow(
      {
        date: "2026-07-27",
        created: 7,
        completed: 0,
        cumulativeCompleted: 0,
      },
      5
    )

    expect(mapped.week).toBe("ه6")
    expect(mapped.progress).toBeGreaterThanOrEqual(0)
  })

  it("maps workspace member nested user contract", () => {
    const mapped = mapWorkspaceMember({
      workspaceId: "326613e1-f483-5194-9a8a-fd95e5560352",
      role: "admin",
      joinedAt: "2026-01-01T00:00:00Z",
      teamIds: [],
      user: {
        id: "917a52cd-d3d0-51d5-8a7a-0818f040064e",
        name: "ادمین سیستم",
        email: "admin@example.com",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
      },
    })

    expect(mapped.id).toBe("917a52cd-d3d0-51d5-8a7a-0818f040064e")
    expect(mapped.name).toBe("ادمین سیستم")
    expect(mapped.role).toBe("admin")
  })

  it("maps estimation rows from complete backend contract", () => {
    const mapped = mapEstimationRow({
      taskId: "df2d6240-a42d-5a65-9cda-a4c3d345e02b",
      key: "YB-1",
      title: "طراحی UI",
      estimateHours: 8,
      actualHours: 10,
      storyPoints: 3,
      variance: 2,
      confidence: 50,
    })

    expect(mapped.key).toBe("YB-1")
    expect(mapped.title).toBe("طراحی UI")
    expect(mapped.variance).toBe(2)
    expect(mapped.actualHours).toBe(10)
  })
})
