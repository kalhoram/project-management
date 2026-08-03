"""Seed demo data aligned with frontend mock (`lib/mock/data.ts`).

Run: python -m scripts.seed
Requires migrations applied (alembic upgrade head).
"""

from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.files.storage import get_storage
from app.models.activity import ActivityLog, Notification
from app.models.billing import Invoice, Payment, Plan, Subscription
from app.models.advanced import (
    ApprovalRequest,
    OKRKeyResult,
    OKRObjective,
    RoadmapItem,
    Sprint,
    SprintTask,
    TimeEntry,
)
from app.models.enums import (
    ActivityEntityType,
    ApprovalStatus,
    InvoiceStatus,
    LogSeverity,
    NotificationType,
    OKRStatus,
    PaymentStatus,
    PlanStatus,
    ProjectStatus,
    ProjectVisibility,
    RoadmapStatus,
    SprintStatus,
    SubscriptionStatus,
    TaskPriority,
    TaskStatus,
    UserStatus,
    WorkspaceRole,
    WorkspaceStatus,
)
from app.models.file import Attachment, FileObject, FileVersion
from app.models.project import KanbanColumn, Project, ProjectCategory, ProjectMember
from app.models.rbac import Permission, Role, RolePermission
from app.models.system import FeatureFlag, MaintenanceState, SystemLog
from app.models.task import Label, Task
from app.models.user import User
from app.models.workspace import Team, TeamMember, Workspace, WorkspaceMember
from app.permissions.rbac import ROLE_PERMISSIONS
from scripts.ids import seed_id

import app.models  # noqa: F401


PERMISSIONS_META = [
    ("workspace.manage", "مدیریت فضای کاری", "ویرایش تنظیمات فضای کاری", "فضای کاری"),
    ("members.invite", "دعوت اعضا", "دعوت کاربران به فضای کاری", "اعضا"),
    ("members.manage", "مدیریت اعضا", "تغییر نقش‌ها و حذف اعضا", "اعضا"),
    ("projects.create", "ایجاد پروژه‌ها", "ایجاد پروژه‌های جدید", "پروژه‌ها"),
    ("projects.manage", "مدیریت پروژه‌ها", "ویرایش و بایگانی پروژه‌ها", "پروژه‌ها"),
    ("tasks.create", "ایجاد وظایف", "ایجاد و ویرایش وظایف", "وظایف"),
    ("tasks.delete", "حذف وظایف", "حذف دائمی وظایف", "وظایف"),
    ("billing.manage", "مدیریت صورتحساب", "به‌روزرسانی طرح و پرداخت", "صورتحساب"),
    ("reports.view", "مشاهده گزارش‌ها", "دسترسی به تحلیل‌ها و خروجی‌ها", "گزارش‌ها"),
    ("files.upload", "آپلود فایل‌ها", "آپلود و مدیریت فایل‌ها", "فایل‌ها"),
]

PLANS = [
    ("plan-free", "رایگان", "برای تیم‌های کوچک", 0, 0, 1, 3, 3, 1, False),
    ("plan-starter", "استارتر", "برای تیم‌های در حال رشد", 29, 290, 1, 10, 20, 10, False),
    ("plan-pro", "حرفه‌ای", "برای تیم‌های محصول", 79, 790, 3, 50, 100, 50, True),
    ("plan-enterprise", "سازمانی", "نامحدود + پشتیبانی اختصاصی", 199, 1990, -1, -1, -1, 500, False),
]

USERS = [
    ("user-admin", "administrator@yadbox.app", "admin", "ادمین سیستم", "123/321", "owner", True),
    ("user-1", "owner@yadbox.app", None, "علی محمدی", "demo", "owner", False),
    ("user-2", "admin@yadbox.app", None, "جواد لی", "demo", "admin", False),
    ("user-3", "member@yadbox.app", None, "سارا رضایی", "demo", "member", False),
    ("user-4", "guest@yadbox.app", None, "کسری کریمی", "demo", "guest", False),
    ("user-5", "viewer@yadbox.app", None, "ریحانه چن", "demo", "viewer", False),
    ("user-demo", "demo@yadbox.app", "demo", "کاربر دمو یادباکس", "Demo1234!", "member", False),
]

DEMO_PROJECT_IDS = ("proj-1", "proj-2")
DEMO_SPRINT_IDS = ("sprint-1", "sprint-2")
DEMO_FILE_LABELS = (
    "file-yb-1",
    "file-yb-2",
    "file-yb-3",
    "file-yb-4",
    "file-mob-1",
    "file-mob-2",
    "file-mob-3",
    "file-mob-4",
    "file-ws-1",
    "file-ws-2",
)

MIME_BY_EXT = {
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "fig": "application/octet-stream",
}


async def _ensure_permissions(session: AsyncSession) -> dict[str, Permission]:
    existing = {p.key: p for p in (await session.execute(select(Permission))).scalars().all()}
    out: dict[str, Permission] = {}
    for i, (key, label, desc, cat) in enumerate(PERMISSIONS_META):
        if key in existing:
            out[key] = existing[key]
            continue
        perm = Permission(id=seed_id(f"perm-{i+1}"), key=key, label=label, description=desc, category=cat)
        session.add(perm)
        out[key] = perm
    await session.flush()
    return out


async def _ensure_plans(session: AsyncSession) -> dict[str, Plan]:
    out: dict[str, Plan] = {}
    for slug, name, desc, pm, py, ws, mem, proj, stor, popular in PLANS:
        pid = seed_id(slug)
        existing = await session.get(Plan, pid)
        if existing:
            out[slug] = existing
            continue
        plan = Plan(
            id=pid,
            name=name,
            description=desc,
            price_monthly=Decimal(pm),
            price_yearly=Decimal(py),
            features=[f"ویژگی {name}"],
            limit_workspaces=ws,
            limit_members=mem,
            limit_projects=proj,
            limit_storage_gb=stor,
            is_popular=popular,
            status=PlanStatus.ACTIVE,
        )
        session.add(plan)
        out[slug] = plan
    await session.flush()
    return out


async def _ensure_users(session: AsyncSession) -> dict[str, User]:
    out: dict[str, User] = {}
    for uid, email, username, name, password, role, is_admin in USERS:
        user_id = seed_id(uid)
        existing = await session.get(User, user_id)
        if existing:
            if email and existing.email != email:
                existing.email = email
            if uid == "user-demo":
                existing.password_hash = hash_password(password)
                existing.username = username or "demo"
            out[uid] = existing
            continue
        user = User(
            id=user_id,
            email=email,
            username=username,
            password_hash=hash_password(password),
            name=name,
            bio=f"اکانت آزمایشی — نقش {role}",
            job_title="مدیر محصول" if role == "owner" else "عضو تیم",
            status=UserStatus.ACTIVE,
            timezone="Asia/Tehran",
            language="fa",
            is_system_admin=is_admin,
            is_email_verified=True,
            last_active_at=datetime.now(UTC),
        )
        session.add(user)
        out[uid] = user
    await session.flush()
    return out


async def _ensure_workspace(session: AsyncSession, users: dict[str, User], plans: dict[str, Plan]) -> Workspace:
    ws_id = seed_id("ws-1")
    ws = await session.get(Workspace, ws_id)
    if ws:
        ws.name = "فضای کاری یادباکس"
        ws.project_count = 2
        ws.member_count = len(USERS)
        return ws
    owner = users["user-admin"]
    plan = plans.get("plan-pro") or (await session.execute(select(Plan).limit(1))).scalar_one()
    ws = Workspace(
        id=ws_id,
        name="فضای کاری یادباکس",
        slug="acme-product",
        description="فضای کاری اصلی تحویل محصول",
        industry="technology",
        company_size="51-200",
        timezone="Asia/Tehran",
        default_visibility=ProjectVisibility.TEAM,
        plan_id=plan.id,
        owner_id=owner.id,
        status=WorkspaceStatus.ACTIVE,
        member_count=len(USERS),
        project_count=2,
    )
    session.add(ws)
    await session.flush()

    for uid, _, _, _, _, role, _ in USERS:
        member = WorkspaceMember(
            id=seed_id(f"wm-{uid}"),
            workspace_id=ws.id,
            user_id=users[uid].id,
            role=WorkspaceRole(role),
            joined_at=datetime.now(UTC),
            is_active=True,
        )
        session.add(member)

    sub = Subscription(
        id=seed_id("sub-ws-1"),
        workspace_id=ws.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )
    session.add(sub)
    await session.flush()
    return ws


async def _ensure_workspace_members(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    """Idempotently ensure all seed users belong to the demo workspace."""
    for uid, _, _, _, _, role, _ in USERS:
        wm_id = seed_id(f"wm-{uid}")
        if await session.get(WorkspaceMember, wm_id):
            continue
        session.add(
            WorkspaceMember(
                id=wm_id,
                workspace_id=ws.id,
                user_id=users[uid].id,
                role=WorkspaceRole(role),
                joined_at=datetime.now(UTC),
                is_active=True,
            )
        )
    ws.member_count = len(USERS)
    await session.flush()


async def _ensure_roles(session: AsyncSession, ws: Workspace, perms: dict[str, Permission]) -> None:
    role_names = [
        ("role-owner", "مالک", "owner"),
        ("role-admin", "مدیر", "admin"),
        ("role-member", "عضو", "member"),
        ("role-guest", "مهمان", "guest"),
        ("role-viewer", "بیننده", "viewer"),
    ]
    for rid, name, key in role_names:
        role_id = seed_id(rid)
        if await session.get(Role, role_id):
            continue
        role = Role(
            id=role_id,
            workspace_id=ws.id,
            name=name,
            description=f"نقش سیستمی {name}",
            is_system=True,
            member_count=1,
        )
        session.add(role)
        await session.flush()
        for pkey in ROLE_PERMISSIONS.get(key, []):
            perm = perms.get(pkey)
            if perm:
                session.add(RolePermission(role_id=role.id, permission_id=perm.id))
    await session.flush()


async def _ensure_project(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> Project:
    proj_id = seed_id("proj-1")
    proj = await session.get(Project, proj_id)

    cat_id = seed_id("cat-1")
    cat = await session.get(ProjectCategory, cat_id)
    if cat is None:
        cat = ProjectCategory(
            id=cat_id,
            workspace_id=ws.id,
            name="محصول",
            color="#0052CC",
            project_count=2,
        )
        session.add(cat)
        await session.flush()
    else:
        cat.project_count = 2

    if proj:
        proj.name = "پلتفرم یادباکس"
        proj.description = "تحویل MVP مدیریت پروژه"
        proj.status = ProjectStatus.ACTIVE
        proj.deleted_at = None
        proj.category_id = cat.id
        return proj

    proj = Project(
        id=proj_id,
        workspace_id=ws.id,
        name="پلتفرم یادباکس",
        description="تحویل MVP مدیریت پروژه",
        key="YB",
        status=ProjectStatus.ACTIVE,
        visibility=ProjectVisibility.TEAM,
        category_id=cat.id,
        owner_id=users["user-1"].id,
        progress=42,
        task_count=4,
        completed_task_count=1,
    )
    session.add(proj)
    await session.flush()

    for uid in ("user-1", "user-2", "user-3"):
        session.add(
            ProjectMember(
                id=seed_id(f"pm-{uid}-proj1"),
                project_id=proj.id,
                user_id=users[uid].id,
                role=WorkspaceRole.MEMBER if uid == "user-3" else WorkspaceRole.ADMIN,
            )
        )

    columns = [
        ("col-backlog", "بک‌لاگ", TaskStatus.BACKLOG, 0, "#6B778C"),
        ("col-todo", "انجام نشده", TaskStatus.TODO, 1, "#0052CC"),
        ("col-progress", "در حال انجام", TaskStatus.IN_PROGRESS, 2, "#FF991F"),
        ("col-review", "در حال بررسی", TaskStatus.IN_REVIEW, 3, "#6554C0"),
        ("col-done", "انجام‌شده", TaskStatus.DONE, 4, "#00875A"),
    ]
    col_map: dict[str, KanbanColumn] = {}
    for cid, name, status, order, color in columns:
        col = KanbanColumn(
            id=seed_id(cid),
            project_id=proj.id,
            name=name,
            status=status,
            sort_order=order,
            color=color,
        )
        session.add(col)
        col_map[status.value] = col
    await session.flush()

    labels_data = [
        ("label-1", "فرانت‌اند", "#0052CC"),
        ("label-2", "بک‌اند", "#00875A"),
        ("label-3", "باگ", "#DE350B"),
    ]
    labels: dict[str, Label] = {}
    for lid, name, color in labels_data:
        label = Label(id=seed_id(lid), workspace_id=ws.id, name=name, color=color)
        session.add(label)
        labels[lid] = label
    await session.flush()

    tasks_data = [
        ("task-1", "YB-101", "طراحی API احراز هویت", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, "user-2", 0),
        ("task-2", "YB-102", "پیاده‌سازی Kanban", TaskStatus.TODO, TaskPriority.MEDIUM, "user-3", 1),
        ("task-3", "YB-103", "تست یکپارچه‌سازی فرانت", TaskStatus.DONE, TaskPriority.MEDIUM, "user-3", 2),
        ("task-4", "YB-104", "مستندسازی OpenAPI", TaskStatus.TODO, TaskPriority.LOW, None, 3),
    ]
    for tid, key, title, status, priority, assignee, order in tasks_data:
        col = col_map.get(status.value)
        task = Task(
            id=seed_id(tid),
            workspace_id=ws.id,
            project_id=proj.id,
            key=key,
            title=title,
            description=f"توضیحات {title}",
            status=status,
            priority=priority,
            assignee_id=users[assignee].id if assignee else None,
            reporter_id=users["user-1"].id,
            column_id=col.id if col else None,
            sort_order=order,
            progress=100 if status == TaskStatus.DONE else 30,
            estimate_hours=Decimal("8"),
            due_date=date.today() + timedelta(days=7),
        )
        if tid == "task-1":
            task.labels.append(labels["label-2"])
            task.actual_hours = Decimal("10")
            task.story_points = 5
        if tid == "task-2":
            task.due_date = date.today() - timedelta(days=3)
        if tid == "task-3":
            task.actual_hours = Decimal("6")
            task.story_points = 3
            task.due_date = date.today() - timedelta(days=10)
        session.add(task)

    await session.flush()
    return proj


async def _ensure_second_project(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> Project:
    """Second demo project — mobile app delivery."""
    proj_id = seed_id("proj-2")
    proj = await session.get(Project, proj_id)
    cat = await session.get(ProjectCategory, seed_id("cat-1"))
    if proj:
        proj.name = "اپلیکیشن موبایل یادباکس"
        proj.description = "نسخه iOS و Android برای مشتریان"
        proj.status = ProjectStatus.ACTIVE
        proj.deleted_at = None
        if cat:
            proj.category_id = cat.id
        return proj

    proj = Project(
        id=proj_id,
        workspace_id=ws.id,
        name="اپلیکیشن موبایل یادباکس",
        description="نسخه iOS و Android برای مشتریان",
        key="MOB",
        status=ProjectStatus.ACTIVE,
        visibility=ProjectVisibility.TEAM,
        category_id=cat.id if cat else None,
        owner_id=users["user-2"].id,
        progress=35,
        task_count=2,
        completed_task_count=0,
    )
    session.add(proj)
    await session.flush()

    for uid in ("user-2", "user-3", "user-4"):
        member_id = seed_id(f"pm-{uid}-proj2")
        if await session.get(ProjectMember, member_id):
            continue
        session.add(
            ProjectMember(
                id=member_id,
                project_id=proj.id,
                user_id=users[uid].id,
                role=WorkspaceRole.MEMBER,
            )
        )

    columns = [
        ("col-mob-backlog", "بک‌لاگ", TaskStatus.BACKLOG, 0, "#6B778C"),
        ("col-mob-todo", "انجام نشده", TaskStatus.TODO, 1, "#0052CC"),
        ("col-mob-progress", "در حال انجام", TaskStatus.IN_PROGRESS, 2, "#FF991F"),
        ("col-mob-done", "انجام‌شده", TaskStatus.DONE, 3, "#00875A"),
    ]
    col_map: dict[str, KanbanColumn] = {}
    for cid, name, status, order, color in columns:
        col = await session.get(KanbanColumn, seed_id(cid))
        if col is None:
            col = KanbanColumn(
                id=seed_id(cid),
                project_id=proj.id,
                name=name,
                status=status,
                sort_order=order,
                color=color,
            )
            session.add(col)
        col_map[status.value] = col
    await session.flush()

    mobile_tasks = [
        ("task-mob-1", "MOB-101", "طراحی رابط iOS", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, "user-3", 0),
        ("task-mob-2", "MOB-102", "اتصال push notification", TaskStatus.TODO, TaskPriority.MEDIUM, "user-4", 1),
    ]
    for tid, key, title, status, priority, assignee, order in mobile_tasks:
        if await session.get(Task, seed_id(tid)):
            continue
        col = col_map.get(status.value)
        session.add(
            Task(
                id=seed_id(tid),
                workspace_id=ws.id,
                project_id=proj.id,
                key=key,
                title=title,
                description=f"توضیحات {title}",
                status=status,
                priority=priority,
                assignee_id=users[assignee].id,
                reporter_id=users["user-2"].id,
                column_id=col.id if col else None,
                sort_order=order,
                progress=40 if status == TaskStatus.IN_PROGRESS else 0,
                estimate_hours=Decimal("6"),
                story_points=3 if status == TaskStatus.IN_PROGRESS else 2,
                due_date=date.today() + timedelta(days=21),
            )
        )
    await session.flush()
    return proj


async def _cleanup_demo_workspace_artifacts(session: AsyncSession, ws: Workspace) -> None:
    """Remove test/runtime pollution so the demo workspace shows exactly two projects."""
    demo_project_ids = {seed_id(label) for label in DEMO_PROJECT_IDS}
    demo_sprint_ids = {seed_id(label) for label in DEMO_SPRINT_IDS}

    projects = (
        await session.execute(
            select(Project).where(
                Project.workspace_id == ws.id,
                Project.status == ProjectStatus.ACTIVE,
            )
        )
    ).scalars().all()
    for project in projects:
        if project.id not in demo_project_ids:
            project.status = ProjectStatus.DELETED
            project.deleted_at = datetime.now(UTC)

    orphans = (
        await session.execute(
            select(Sprint).where(
                Sprint.workspace_id == ws.id,
                Sprint.id.not_in(demo_sprint_ids),
            )
        )
    ).scalars().all()
    for sprint in orphans:
        await session.delete(sprint)

    demo_time_entry_ids = {seed_id(f"te-{i}") for i in range(1, 5)}
    orphan_entries = (
        await session.execute(
            select(TimeEntry).where(
                TimeEntry.workspace_id == ws.id,
                TimeEntry.id.not_in(demo_time_entry_ids),
            )
        )
    ).scalars().all()
    for entry in orphan_entries:
        await session.delete(entry)

    ws.project_count = 2
    await session.flush()


async def _ensure_sprint_task_link(session: AsyncSession, sprint_id, task_label: str) -> None:
    task = await session.get(Task, seed_id(task_label))
    if task is None:
        return
    link_id = seed_id(f"st-{sprint_id}-{task_label}")
    if await session.get(SprintTask, link_id):
        return
    existing = (
        await session.execute(
            select(SprintTask).where(
                SprintTask.sprint_id == seed_id(sprint_id),
                SprintTask.task_id == task.id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        return
    session.add(
        SprintTask(
            id=link_id,
            sprint_id=seed_id(sprint_id),
            task_id=task.id,
        )
    )


async def _ensure_sprints(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    proj = await session.get(Project, seed_id("proj-1"))
    if proj is None:
        return

    today = date.today()
    sprint_specs = [
        (
            "sprint-1",
            "اسپرینت ۱",
            "انتشار پالت دستور و کشیدن و رها کردن کانبان",
            SprintStatus.ACTIVE,
            today - timedelta(days=7),
            today + timedelta(days=7),
            40,
            ("task-1", "task-2", "task-3"),
        ),
        (
            "sprint-2",
            "اسپرینت ۲",
            "گزارش‌ها و یکپارچه‌سازی صورتحساب",
            SprintStatus.PLANNING,
            today + timedelta(days=8),
            today + timedelta(days=21),
            40,
            ("task-4", "task-5"),
        ),
    ]
    for sid, name, goal, status, start, end, capacity, task_labels in sprint_specs:
        sprint_id = seed_id(sid)
        sprint = await session.get(Sprint, sprint_id)
        if sprint is None:
            sprint = Sprint(
                id=sprint_id,
                workspace_id=ws.id,
                project_id=proj.id,
                name=name,
                goal=goal,
                status=status,
                start_date=start,
                end_date=end,
                capacity=capacity,
            )
            session.add(sprint)
        else:
            sprint.name = name
            sprint.goal = goal
            sprint.status = status
            sprint.start_date = start
            sprint.end_date = end
            sprint.capacity = capacity
            sprint.project_id = proj.id
        await session.flush()
        for task_label in task_labels:
            await _ensure_sprint_task_link(session, sid, task_label)

    # Recompute sprint points from linked tasks
    for sid, *_ in sprint_specs:
        sprint = await session.get(Sprint, seed_id(sid))
        if sprint is None:
            continue
        task_ids = list(
            (
                await session.execute(
                    select(SprintTask.task_id).where(SprintTask.sprint_id == sprint.id)
                )
            ).scalars().all()
        )
        if not task_ids:
            sprint.committed_points = 0
            sprint.completed_points = 0
            continue
        tasks = (await session.execute(select(Task).where(Task.id.in_(task_ids)))).scalars().all()
        sprint.committed_points = sum(t.story_points or 0 for t in tasks)
        sprint.completed_points = sum(t.story_points or 0 for t in tasks if t.status == TaskStatus.DONE)
    await session.flush()


async def _ensure_roadmap(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    today = date.today()
    items = [
        (
            "rm-1",
            "همکاری هسته‌ای",
            "نظرات، منشن‌ها و فعالیت‌ها",
            RoadmapStatus.SHIPPED,
            date(today.year, 1, 1),
            date(today.year, 3, 31),
            "user-1",
            "پلتفرم",
            "v1.0",
        ),
        (
            "rm-2",
            "نماهای پیشرفته",
            "جدول زمانی، گانت و تقویم",
            RoadmapStatus.IN_PROGRESS,
            date(today.year, 4, 1),
            date(today.year, 8, 31),
            "user-2",
            "پلتفرم",
            "v1.2",
        ),
        (
            "rm-3",
            "دستیار هوش مصنوعی",
            "خلاصه‌های هوشمند و پیشنهاد وظایف",
            RoadmapStatus.PLANNED,
            date(today.year, 9, 1),
            date(today.year, 12, 31),
            "user-1",
            "هوشمندی",
            "v2.0",
        ),
    ]
    for rid, title, desc, status, start, end, owner_key, initiative, release in items:
        item_id = seed_id(rid)
        item = await session.get(RoadmapItem, item_id)
        if item is None:
            item = RoadmapItem(
                id=item_id,
                workspace_id=ws.id,
                title=title,
                description=desc,
                status=status,
                start_date=start,
                end_date=end,
                owner_id=users[owner_key].id,
                initiative=initiative,
                release=release,
            )
            session.add(item)
        else:
            item.title = title
            item.description = desc
            item.status = status
            item.start_date = start
            item.end_date = end
            item.owner_id = users[owner_key].id
            item.initiative = initiative
            item.release = release
    await session.flush()


async def _ensure_okrs(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    objectives = [
        (
            "okr-1",
            "بهبود پیش‌بینی‌پذیری تحویل",
            "user-1",
            70,
            58,
            "سه‌ماهه سوم ۱۴۰۵",
            OKRStatus.ON_TRACK,
            [
                ("kr-1", "کاهش وظایف معوق", 20, 12, "%"),
                ("kr-2", "تکمیل اهداف اسپرینت", 85, 78, "%"),
                ("kr-3", "زمان چرخه (روز)", 5, 6.2, "روز"),
            ],
        ),
        (
            "okr-2",
            "افزایش پذیرش محصول",
            "user-3",
            45,
            32,
            "سه‌ماهه سوم ۱۴۰۵",
            OKRStatus.AT_RISK,
            [
                ("kr-4", "فضاهای کاری فعال هفتگی", 500, 210, "فضای کاری"),
                ("kr-5", "نرخ فعال‌سازی", 40, 28, "%"),
            ],
        ),
    ]
    for oid, objective, owner_key, confidence, progress, period, status, key_results in objectives:
        obj_id = seed_id(oid)
        obj = await session.get(OKRObjective, obj_id)
        if obj is None:
            obj = OKRObjective(
                id=obj_id,
                workspace_id=ws.id,
                objective=objective,
                owner_id=users[owner_key].id,
                confidence=confidence,
                progress=progress,
                period=period,
                status=status,
            )
            session.add(obj)
            await session.flush()
        else:
            obj.objective = objective
            obj.owner_id = users[owner_key].id
            obj.confidence = confidence
            obj.progress = progress
            obj.period = period
            obj.status = status

        for index, (krid, title, target, current, unit) in enumerate(key_results):
            kr_id = seed_id(krid)
            kr = await session.get(OKRKeyResult, kr_id)
            if kr is None:
                session.add(
                    OKRKeyResult(
                        id=kr_id,
                        objective_id=obj.id,
                        title=title,
                        target=Decimal(str(target)),
                        current=Decimal(str(current)),
                        unit=unit,
                        sort_order=index,
                    )
                )
            else:
                kr.title = title
                kr.target = Decimal(str(target))
                kr.current = Decimal(str(current))
                kr.unit = unit
                kr.sort_order = index
    await session.flush()


async def _ensure_time_entries(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    today = date.today()
    entries = [
        ("te-1", "task-1", "user-3", Decimal("3.5"), "پیاده‌سازی رابط تعویض‌کننده", today - timedelta(days=1), True),
        ("te-2", "task-3", "user-3", Decimal("2"), "رفع نشان و تست‌ها", today - timedelta(days=1), True),
        ("te-3", "task-8", "user-2", Decimal("4"), "تحقیق خروجی CSV", today - timedelta(days=2), False),
        ("te-4", "task-mob-1", "user-3", Decimal("2.5"), "طراحی صفحه ورود iOS", today, True),
    ]
    for eid, task_label, user_key, hours, note, entry_date, billable in entries:
        entry_id = seed_id(eid)
        task = await session.get(Task, seed_id(task_label))
        if task is None:
            continue
        entry = await session.get(TimeEntry, entry_id)
        if entry is None:
            session.add(
                TimeEntry(
                    id=entry_id,
                    workspace_id=ws.id,
                    task_id=task.id,
                    user_id=users[user_key].id,
                    hours=hours,
                    note=note,
                    entry_date=entry_date,
                    billable=billable,
                )
            )
        else:
            entry.task_id = task.id
            entry.user_id = users[user_key].id
            entry.hours = hours
            entry.note = note
            entry.entry_date = entry_date
            entry.billable = billable
    await session.flush()


async def _ensure_approvals(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    approvals = [
        (
            "appr-1",
            "انتشار نقشه راه به‌صورت عمومی",
            "اشتراک‌گذاری نقشه راه فصل سوم با مشتریان",
            "user-3",
            ["user-1", "user-2"],
            ApprovalStatus.PENDING,
            "roadmap",
            "rm-2",
        ),
        (
            "appr-2",
            "افزایش سهمیه ذخیره‌سازی",
            "درخواست ارتقای فضای ذخیره‌سازی برای فایل‌های پروژه",
            "user-2",
            ["user-1"],
            ApprovalStatus.APPROVED,
            "billing",
            "inv-1",
        ),
    ]
    for aid, title, desc, requester_key, approver_keys, status, entity_type, entity_label in approvals:
        appr_id = seed_id(aid)
        appr = await session.get(ApprovalRequest, appr_id)
        approver_ids = [users[k].id for k in approver_keys]
        entity_id = seed_id(entity_label)
        if appr is None:
            session.add(
                ApprovalRequest(
                    id=appr_id,
                    workspace_id=ws.id,
                    title=title,
                    description=desc,
                    requester_id=users[requester_key].id,
                    approver_ids=approver_ids,
                    status=status,
                    entity_type=entity_type,
                    entity_id=entity_id,
                )
            )
        else:
            appr.title = title
            appr.description = desc
            appr.requester_id = users[requester_key].id
            appr.approver_ids = approver_ids
            appr.status = status
            appr.entity_type = entity_type
            appr.entity_id = entity_id
    await session.flush()


async def _ensure_teams(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    teams = [
        ("team-1", "تیم محصول", "طراحی و تحویل ویژگی‌های محصول", "محصول", "user-1", "#0052CC", ("user-1", "user-2", "user-3")),
        ("team-2", "تیم موبایل", "توسعه اپلیکیشن iOS و Android", "مهندسی", "user-2", "#6554C0", ("user-2", "user-3", "user-4")),
    ]
    for tid, name, desc, department, lead_key, color, member_keys in teams:
        team_id = seed_id(tid)
        team = await session.get(Team, team_id)
        if team is None:
            team = Team(
                id=team_id,
                workspace_id=ws.id,
                name=name,
                description=desc,
                department=department,
                lead_id=users[lead_key].id,
                color=color,
            )
            session.add(team)
            await session.flush()
        else:
            team.name = name
            team.description = desc
            team.department = department
            team.lead_id = users[lead_key].id
            team.color = color

        for uid in member_keys:
            member_row_id = seed_id(f"tm-{tid}-{uid}")
            if await session.get(TeamMember, member_row_id):
                continue
            existing = (
                await session.execute(
                    select(TeamMember).where(
                        TeamMember.team_id == team.id,
                        TeamMember.user_id == users[uid].id,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                continue
            session.add(
                TeamMember(
                    id=member_row_id,
                    team_id=team.id,
                    user_id=users[uid].id,
                    role="member",
                )
            )
    await session.flush()


async def _ensure_contract_fixture_tasks(
    session: AsyncSession, ws: Workspace, users: dict[str, User]
) -> None:
    proj = await session.get(Project, seed_id("proj-1"))
    if proj is None:
        return
    col_rows = (
        await session.execute(select(KanbanColumn).where(KanbanColumn.project_id == proj.id))
    ).scalars().all()
    col_map = {col.status.value: col for col in col_rows}
    await _ensure_overdue_and_estimation_fixtures(session, ws, proj, users, col_map)


async def _ensure_overdue_and_estimation_fixtures(
    session: AsyncSession,
    ws: Workspace,
    proj: Project,
    users: dict[str, User],
    col_map: dict[str, KanbanColumn],
) -> None:
    """Idempotent edge-case tasks for overdue counts and estimation variance."""
    extra_tasks = [
        (
            "task-5",
            "YB-105",
            "رفع باگ احراز هویت",
            TaskStatus.IN_PROGRESS,
            TaskPriority.HIGH,
            "user-2",
            4,
            date.today() - timedelta(days=5),
            Decimal("4"),
            Decimal("2"),
            2,
        ),
        (
            "task-6",
            "YB-106",
            "به‌روزرسانی وابستگی‌ها",
            TaskStatus.TODO,
            TaskPriority.LOW,
            "user-2",
            5,
            date.today() + timedelta(days=14),
            Decimal("3"),
            None,
            1,
        ),
        (
            "task-7",
            "YB-107",
            "بستن تیکت قدیمی",
            TaskStatus.DONE,
            TaskPriority.MEDIUM,
            "user-2",
            6,
            date.today() - timedelta(days=20),
            Decimal("2"),
            Decimal("2"),
            1,
        ),
        (
            "task-8",
            "YB-108",
            "پاکسازی لاگ‌ها",
            TaskStatus.TODO,
            TaskPriority.LOW,
            "user-3",
            7,
            None,
            Decimal("1"),
            None,
            1,
        ),
    ]
    for tid, key, title, status, priority, assignee, order, due, estimate, actual, points in extra_tasks:
        if await session.get(Task, seed_id(tid)):
            continue
        col = col_map.get(status.value)
        session.add(
            Task(
                id=seed_id(tid),
                workspace_id=ws.id,
                project_id=proj.id,
                key=key,
                title=title,
                description=f"توضیحات {title}",
                status=status,
                priority=priority,
                assignee_id=users[assignee].id,
                reporter_id=users["user-1"].id,
                column_id=col.id if col else None,
                sort_order=order,
                progress=100 if status == TaskStatus.DONE else 10,
                estimate_hours=estimate,
                actual_hours=actual,
                story_points=points,
                due_date=due,
            )
        )
    await session.flush()


async def _ensure_overdue_seed_updates(session: AsyncSession) -> None:
    """Apply stable overdue/estimation values to core seed tasks on every run."""
    task_1 = await session.get(Task, seed_id("task-1"))
    if task_1:
        task_1.actual_hours = Decimal("10")
        task_1.story_points = 5

    task_2 = await session.get(Task, seed_id("task-2"))
    if task_2:
        task_2.due_date = date.today() - timedelta(days=3)

    task_3 = await session.get(Task, seed_id("task-3"))
    if task_3:
        task_3.actual_hours = Decimal("6")
        task_3.story_points = 3
        task_3.due_date = date.today() - timedelta(days=10)

    await session.flush()


async def _ensure_notifications(session: AsyncSession, users: dict[str, User], ws: Workspace) -> None:
    if (await session.execute(select(Notification).limit(1))).scalar_one_or_none():
        return
    notifs = [
        (NotificationType.ASSIGNMENT, "وظیفه جدید", "یک وظیفه به شما اختصاص داده شد."),
        (NotificationType.MENTION, "منشن", "شما در یک نظر منشن شدید."),
        (NotificationType.DEADLINE, "سررسید نزدیک", "مهلت یک وظیفه فردا است."),
    ]
    for i, (ntype, title, body) in enumerate(notifs):
        session.add(
            Notification(
                id=seed_id(f"notif-{i+1}"),
                user_id=users["user-3"].id,
                type=ntype,
                title=title,
                body=body,
                read=i == 2,
            )
        )
    await session.flush()


def _demo_file_content(filename: str, size_bytes: int) -> bytes:
    header = f"YadBox demo file: {filename}\n".encode("utf-8")
    if size_bytes <= len(header):
        return header[:size_bytes]
    return header + (b"\x00" * (size_bytes - len(header)))


async def _ensure_demo_file_record(
    session: AsyncSession,
    ws: Workspace,
    users: dict[str, User],
    *,
    file_label: str,
    filename: str,
    size_bytes: int,
    uploader_key: str,
    project_label: str | None = None,
    created_days_ago: int = 7,
) -> None:
    storage = get_storage()
    ws_id = str(ws.id)
    storage_key = f"{ws_id}/seed/{file_label}"
    ext = filename.rsplit(".", 1)[-1].lower()
    mime_type = MIME_BY_EXT.get(ext, "application/octet-stream")
    data = _demo_file_content(filename, size_bytes)
    checksum = hashlib.sha256(data).hexdigest()
    uploader_id = users[uploader_key].id
    project_id = seed_id(project_label) if project_label else None
    created_at = datetime.now(UTC) - timedelta(days=created_days_ago)

    await storage.save(storage_key, data, content_type=mime_type)

    file_obj_id = seed_id(f"fo-{file_label}")
    file_obj = await session.get(FileObject, file_obj_id)
    if file_obj is None:
        file_obj = FileObject(
            id=file_obj_id,
            workspace_id=ws.id,
            storage_key=storage_key,
            original_name=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
            checksum=checksum,
            uploaded_by_id=uploader_id,
            created_at=created_at,
        )
        session.add(file_obj)
    else:
        file_obj.storage_key = storage_key
        file_obj.original_name = filename
        file_obj.mime_type = mime_type
        file_obj.size_bytes = size_bytes
        file_obj.checksum = checksum
        file_obj.uploaded_by_id = uploader_id
        file_obj.deleted_at = None
    await session.flush()

    version_id = seed_id(f"fv-{file_label}-1")
    version = await session.get(FileVersion, version_id)
    if version is None:
        session.add(
            FileVersion(
                id=version_id,
                file_id=file_obj.id,
                version_number=1,
                storage_key=storage_key,
                size_bytes=size_bytes,
                uploaded_by_id=uploader_id,
                checksum=checksum,
                created_at=created_at,
            )
        )
    else:
        version.storage_key = storage_key
        version.size_bytes = size_bytes
        version.uploaded_by_id = uploader_id
        version.checksum = checksum

    attachment_id = seed_id(f"att-{file_label}")
    attachment = await session.get(Attachment, attachment_id)
    url = storage.url(storage_key)
    if attachment is None:
        session.add(
            Attachment(
                id=attachment_id,
                file_id=file_obj.id,
                name=filename,
                mime_type=mime_type,
                size_bytes=size_bytes,
                url=url,
                project_id=project_id,
                uploaded_by_id=uploader_id,
                workspace_id=ws.id,
                version=1,
                created_at=created_at,
            )
        )
    else:
        attachment.file_id = file_obj.id
        attachment.name = filename
        attachment.mime_type = mime_type
        attachment.size_bytes = size_bytes
        attachment.url = url
        attachment.project_id = project_id
        attachment.uploaded_by_id = uploader_id
        attachment.deleted_at = None
        attachment.version = 1
    await session.flush()


async def _ensure_demo_files(session: AsyncSession, ws: Workspace, users: dict[str, User]) -> None:
    """Seed realistic Persian demo files for both projects and the workspace."""
    file_specs = [
        ("file-yb-1", "مستند نیازمندی‌های پلتفرم یادباکس.pdf", 850_000, "user-1", "proj-1", 14),
        ("file-yb-2", "طرح معماری فنی پلتفرم یادباکس.pdf", 1_200_000, "user-2", "proj-1", 10),
        ("file-yb-3", "گزارش تست ماژول پروژه‌ها.xlsx", 320_000, "user-3", "proj-1", 5),
        ("file-yb-4", "راهنمای استقرار نسخه دمو.docx", 180_000, "user-2", "proj-1", 3),
        ("file-mob-1", "وایرفریم اپلیکیشن موبایل یادباکس.fig", 2_500_000, "user-3", "proj-2", 12),
        ("file-mob-2", "سناریوهای تست ورود و ثبت‌نام.xlsx", 95_000, "user-4", "proj-2", 8),
        ("file-mob-3", "راهنمای طراحی رابط کاربری موبایل.pdf", 640_000, "user-3", "proj-2", 6),
        ("file-mob-4", "گزارش بازبینی نسخه آزمایشی.docx", 220_000, "user-2", "proj-2", 2),
        ("file-ws-1", "معرفی کلی یادباکس.pdf", 450_000, "user-1", None, 20),
        ("file-ws-2", "برنامه زمان‌بندی ارائه دمو.xlsx", 72_000, "user-1", None, 15),
    ]
    for label, filename, size, uploader, project, days_ago in file_specs:
        await _ensure_demo_file_record(
            session,
            ws,
            users,
            file_label=label,
            filename=filename,
            size_bytes=size,
            uploader_key=uploader,
            project_label=project,
            created_days_ago=days_ago,
        )

    demo_attachment_ids = {seed_id(f"att-{label}") for label in DEMO_FILE_LABELS}
    orphan_attachments = (
        await session.execute(
            select(Attachment).where(
                Attachment.workspace_id == ws.id,
                Attachment.id.not_in(demo_attachment_ids),
                Attachment.deleted_at.is_(None),
            )
        )
    ).scalars().all()
    for attachment in orphan_attachments:
        attachment.deleted_at = datetime.now(UTC)
    await session.flush()


async def _ensure_system(session: AsyncSession) -> None:
    if not (await session.execute(select(MaintenanceState).limit(1))).scalar_one_or_none():
        session.add(MaintenanceState(id=seed_id("maint-1"), is_active=False, message="سیستم در حال نگهداری است."))

    flags = [
        ("aiAssist", "دستیار هوش مصنوعی", False),
        ("advancedReports", "گزارش‌های پیشرفته", True),
        ("sso", "ورود یکپارچه", False),
        ("betaKanban", "کانبان آزمایشی", True),
        ("exportPdf", "خروجی PDF", True),
    ]
    for key, name, enabled in flags:
        if not (await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))).scalar_one_or_none():
            session.add(FeatureFlag(id=seed_id(f"ff-{key}"), key=key, name=name, is_enabled=enabled))

    if not (await session.execute(select(SystemLog).limit(1))).scalar_one_or_none():
        session.add(
            SystemLog(
                id=seed_id("log-1"),
                severity=LogSeverity.INFO,
                source="api",
                message="سیستم با موفقیت راه‌اندازی شد.",
            )
        )

    if not (await session.execute(select(Invoice).limit(1))).scalar_one_or_none():
        ws_id = seed_id("ws-1")
        session.add(
            Invoice(
                id=seed_id("inv-1"),
                workspace_id=ws_id,
                number="INV-2026-001",
                amount=Decimal("790000"),
                currency="IRR",
                status=InvoiceStatus.PAID,
                issued_at=datetime.now(UTC) - timedelta(days=30),
                due_at=datetime.now(UTC) - timedelta(days=15),
            )
        )
        session.add(
            Payment(
                id=seed_id("pay-1"),
                workspace_id=ws_id,
                amount=Decimal("790000"),
                currency="IRR",
                status=PaymentStatus.PAID,
                method="card",
                customer_name="فضای کاری",
            )
        )
    await session.flush()


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        perms = await _ensure_permissions(session)
        plans = await _ensure_plans(session)
        users = await _ensure_users(session)
        ws = await _ensure_workspace(session, users, plans)
        await _ensure_workspace_members(session, ws, users)
        await _ensure_roles(session, ws, perms)
        await _ensure_project(session, ws, users)
        await _ensure_second_project(session, ws, users)
        await _ensure_overdue_seed_updates(session)
        await _ensure_contract_fixture_tasks(session, ws, users)
        await _cleanup_demo_workspace_artifacts(session, ws)
        await _ensure_sprints(session, ws, users)
        await _ensure_roadmap(session, ws, users)
        await _ensure_okrs(session, ws, users)
        await _ensure_time_entries(session, ws, users)
        await _ensure_approvals(session, ws, users)
        await _ensure_teams(session, ws, users)
        await _ensure_demo_files(session, ws, users)
        await _ensure_notifications(session, users, ws)
        await _ensure_system(session)

        act_id = seed_id("act-1")
        if not await session.get(ActivityLog, act_id):
            session.add(
                ActivityLog(
                    id=act_id,
                    workspace_id=ws.id,
                    actor_id=users["user-1"].id,
                    action="created",
                    entity_type=ActivityEntityType.PROJECT,
                    entity_id=seed_id("proj-1"),
                    entity_name="پلتفرم یادباکس",
                )
            )
        await session.commit()
    print("Seed data applied successfully.")
    print("  Login: admin / 123/321  OR  owner@yadbox.app / demo")


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def main() -> None:
    await create_tables()
    await seed()


if __name__ == "__main__":
    asyncio.run(main())
