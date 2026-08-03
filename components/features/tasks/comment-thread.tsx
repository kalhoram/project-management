"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { faIR } from "date-fns/locale"
import { Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Comment } from "@/lib/types"
import { getUserById } from "@/lib/task-utils"
import { cn } from "@/lib/utils"

interface CommentThreadProps {
  comments: Comment[]
  currentUserId?: string
  onAddComment?: (body: string, parentId?: string) => void
  className?: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
}: {
  comment: Comment
  replies: Comment[]
  currentUserId?: string
  onReply?: (body: string, parentId: string) => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const author = getUserById(comment.authorId)

  function submitReply() {
    const body = replyBody.trim()
    if (!body || !onReply) return
    onReply(body, comment.id)
    setReplyBody("")
    setReplying(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {author?.avatarUrl ? (
            <AvatarImage src={author.avatarUrl} alt={author.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {author ? initials(author.name) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{author?.name ?? "ناشناس"}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: faIR })}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
          {onReply ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setReplying((v) => !v)}
            >
              پاسخ
            </Button>
          ) : null}
        </div>
      </div>

      {replying ? (
        <div className="ml-11 space-y-2">
          <Textarea
            placeholder="پاسخ بنویسید..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitReply}>
              پاسخ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : null}

      {replies.length > 0 ? (
        <div className="ml-11 space-y-3 border-l border-border pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              onReply={onReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CommentThread({
  comments,
  currentUserId,
  onAddComment,
  className,
}: CommentThreadProps) {
  const [body, setBody] = useState("")

  const roots = comments.filter((c) => !c.parentId)
  const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, comment) => {
    if (comment.parentId) {
      acc[comment.parentId] = acc[comment.parentId] ?? []
      acc[comment.parentId].push(comment)
    }
    return acc
  }, {})

  function handleSubmit() {
    const text = body.trim()
    if (!text || !onAddComment) return
    onAddComment(text)
    setBody("")
  }

  return (
    <div className={cn("space-y-4", className)}>
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز نظری نیست. گفتگو را شروع کنید.</p>
      ) : (
        <div className="space-y-4">
          {roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesByParent[comment.id] ?? []}
              currentUserId={currentUserId}
              onReply={onAddComment}
            />
          ))}
        </div>
      )}

      {onAddComment ? (
        <div className="flex gap-2 border-t border-border pt-4">
          <Textarea
            placeholder="نظر بنویسید..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
          />
          <Button size="icon" className="shrink-0 self-end" onClick={handleSubmit} disabled={!body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
