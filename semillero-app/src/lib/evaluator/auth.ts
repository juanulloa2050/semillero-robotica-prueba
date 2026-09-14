export interface EvaluatorCredential {
  username: string;
  password: string;
}

// Credenciales temporales mientras no existe un backend ni un registro
// institucional de evaluadores. Cuando eso exista, cada evaluador iniciará
// sesión con su correo institucional y una contraseña propia.
export const EVALUATOR_CREDENTIALS: EvaluatorCredential[] = [
  { username: "evaluador_1", password: "evaluador" },
];

export function verifyEvaluatorCredentials(username: string, password: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername || !password) return false;

  return EVALUATOR_CREDENTIALS.some(
    (credential) =>
      credential.username.toLowerCase() === normalizedUsername && credential.password === password,
  );
}
