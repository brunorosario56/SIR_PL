export function badRequest(res, message, errors) {
  const payload = { message };
  if (Array.isArray(errors) && errors.length > 0) payload.errors = errors;
  return res.status(400).json(payload);
}

export function unauthorized(res, message) {
  return res.status(401).json({ message });
}

export function forbidden(res, message) {
  return res.status(403).json({ message });
}

export function notFound(res, message) {
  return res.status(404).json({ message });
}

export function serverError(res, message = 'Erro interno do servidor.', details) {
  const payload = { message };
  if (details !== undefined) payload.details = details;
  return res.status(500).json(payload);
}
