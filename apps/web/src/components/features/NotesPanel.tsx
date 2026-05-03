import { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { Edit2, Save, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface NotesPanelProps {
  notes?: string
  onSave: (notes: string) => void
  isPending?: boolean
}

export function NotesPanel({ notes = '', onSave, isPending = false }: NotesPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(notes)

  // Sync prop changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setContent(notes)
    }
  }, [notes, isEditing])

  const handleSave = () => {
    onSave(content)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setContent(notes)
    setIsEditing(false)
  }

  // Parse markdown to HTML
  const purify = DOMPurify
  purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer')
      node.setAttribute('target', '_blank')
    }
  })
  const parsedHtml = purify.sanitize(marked.parse(notes, { async: false }) as string)
  purify.removeHooks('afterSanitizeAttributes')

  return (
    <Card className="flex flex-col h-full min-h-[300px]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Notes</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded bg-bg-muted px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                <X className="size-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded bg-bg-muted px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              <Edit2 className="size-3.5" />
              Edit
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
            className="flex-1 w-full min-h-[200px] resize-none rounded-md border border-border-muted bg-bg-input p-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Write markdown here..."
          />
        ) : (
          <div
            className={cn(
              'flex-1 w-full rounded-md border border-transparent p-3 text-sm overflow-auto',
              'prose prose-sm dark:prose-invert max-w-none',
              'prose-p:leading-relaxed prose-pre:bg-bg-muted prose-pre:border prose-pre:border-border-muted',
              'prose-a:text-accent hover:prose-a:text-accent/80',
              !notes && 'text-text-muted italic flex items-center justify-center'
            )}
            style={{
              wordBreak: 'break-word',
            }}
            dangerouslySetInnerHTML={
              notes
                ? { __html: parsedHtml }
                : { __html: 'No notes provided. Click edit to add some.' }
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
