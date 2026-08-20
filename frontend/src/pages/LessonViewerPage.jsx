import { useParams } from 'react-router-dom'

export default function LessonViewerPage() {
  const { courseId, lessonId } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary">Lesson Viewer</h1>
      <p className="mt-1 text-sm text-gray-500">
        Course ID: {courseId} — Lesson ID: {lessonId}
      </p>
    </div>
  )
}
