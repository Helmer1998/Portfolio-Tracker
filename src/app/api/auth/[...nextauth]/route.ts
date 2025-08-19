// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";   // <- use the alias to src/auth.ts
export const { GET, POST } = handlers;
