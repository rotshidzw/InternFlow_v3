import { Role } from "@prisma/client";

export function assertRole(required: Role[], current: Role) {
  if (!required.includes(current)) {
    throw new Error("Forbidden");
  }
}
