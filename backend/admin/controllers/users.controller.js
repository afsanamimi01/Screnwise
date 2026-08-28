import User from "../../shared/models/User.model.js";
import { logAudit } from "../../shared/utils/audit.js";

const ROLES = ["hr", "manager", "candidate", "admin"];

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { role, active, name } = req.body;
    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: `role must be one of ${ROLES.join(", ")}` });
      }
      user.role = role;
    }
    if (active !== undefined) user.active = Boolean(active);
    if (name !== undefined) user.name = name;

    await user.save();
    await logAudit(
      req.user.name,
      "User updated",
      `${user.name} — ${user.role}, ${user.active ? "active" : "inactive"}`,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}
