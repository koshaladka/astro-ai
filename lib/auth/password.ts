import bcrypt from "bcryptjs";

// Хеширует пароль для хранения в БД
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Проверяет пароль против хеша
export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
