import { useParams } from 'react-router-dom'

export default function EditCoursePage() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-primary">Edit Course</h1>
      <p className="mt-1 text-sm text-gray-500">Course ID: {id}</p>
    </div>
  )
}
