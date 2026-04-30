import type { SessionOptions } from "iron-session";

import { env } from "./env";

export const sessionOptions: SessionOptions = {
  cookieName: "tuhfa_session",
  password: env.SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.SESSION_MAX_AGE_SECONDS,
  },
};
