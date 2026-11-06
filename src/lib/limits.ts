const int = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : d);

/** Account limits. Read at call time so they can be changed with environment variables (see .env.example). */
export const limits = () => ({
  todosPerUser: int(process.env.MAX_TODOS_PER_USER, 5000),
  keysPerUser: int(process.env.API_MAX_KEYS, 5),
  perMinute: int(process.env.API_RATE_PER_MIN, 60),
  perDay: int(process.env.API_DAILY_QUOTA, 2000),
});
