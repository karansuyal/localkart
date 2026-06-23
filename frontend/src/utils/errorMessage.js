// FastAPI/Pydantic validation errors (HTTP 422) return `detail` as an array
// of objects like [{ type, loc, msg, input, ctx }], not a plain string.
// Passing that array straight into toast.error() or any JSX text node
// crashes React ("Objects are not valid as a React child" -- error #31 in
// production builds), which is what was causing the white screen after a
// failed register/login. This always returns a safe, displayable string.
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail

  if (!detail) return fallback
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    // Pydantic validation error array -- join each item's human message.
    return detail
      .map(d => (typeof d === 'string' ? d : d?.msg))
      .filter(Boolean)
      .join(', ') || fallback
  }

  // Single validation error object (older FastAPI versions sometimes send
  // a bare object instead of an array).
  if (typeof detail === 'object' && detail.msg) return detail.msg

  return fallback
}
