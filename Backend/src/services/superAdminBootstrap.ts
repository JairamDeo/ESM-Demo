import Officer from "../models/Officer";

export async function ensureSuperAdminExists(): Promise<void> {
  const email = "admin@vitric.in";
  const username = "admin";
  const password = "Jairam@1234";

  const existing = await Officer.findOne({
    $or: [{ email }, { username }],
  }).select("+password");

  if (existing) {
    let changed = false;

    if (existing.email !== email) {
      existing.email = email;
      changed = true;
    }
    if (existing.username !== username) {
      existing.username = username;
      changed = true;
    }
    if (!existing.canLogin) {
      existing.canLogin = true;
      changed = true;
    }
    if (existing.status !== "active") {
      existing.status = "active";
      changed = true;
    }
    if (existing.role !== "Super Admin") {
      existing.role = "Super Admin";
      changed = true;
    }
    if (existing.rbacRole !== "super_admin") {
      existing.rbacRole = "super_admin";
      changed = true;
    }
    if (!existing.name) {
      existing.name = "Admin Officer";
      changed = true;
    }

    // Ensure known login password (user requested).
    existing.password = password;
    changed = true;

    if (changed) {
      await existing.save();
      console.log("✅ Ensured Super Admin account is present (admin@vitric.in).");
    }
    return;
  }

  await Officer.create({
    name: "Admin Officer",
    rank: "",
    role: "Super Admin",
    rbacRole: "super_admin",
    level: "L1",
    username,
    password,
    canLogin: true,
    email,
    status: "active",
    stationName: "Nagpur Sub-Area",
  });

  console.log("✅ Created Super Admin account (admin@vitric.in).");
}

