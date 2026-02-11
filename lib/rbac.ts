export type Role = "OWNER" | "MANAGER" | "TECH" | "ACTOR";

// роли с полным доступом
export const fullAccessRoles: Role[] = ["OWNER", "MANAGER"];

// кто может читать расписание/события
export const scheduleReadRoles: Role[] = ["OWNER", "MANAGER", "TECH", "ACTOR"];

// кто может менять расписание/события
export const scheduleWriteRoles: Role[] = ["OWNER", "MANAGER"];

// кто может работать с файлами "внутренними" (INTERNAL)
export const internalFilesRoles: Role[] = ["OWNER", "MANAGER"];

// кто может видеть файлы для состава/техников (CAST_TECH)
export const castTechFilesRoles: Role[] = ["OWNER", "MANAGER", "TECH", "ACTOR"];
