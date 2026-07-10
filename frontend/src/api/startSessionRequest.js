export function buildStartSessionFormData(text, imageFile, examMode, mode = 'academic') {
  const formData = new FormData()
  formData.append('question', text)
  if (imageFile) formData.append('image', imageFile)
  formData.append('exam_mode', examMode ? 'true' : 'false')
  formData.append('mode', mode)
  return formData
}
