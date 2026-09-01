import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import { logAudit } from "../../shared/utils/audit.js";

/** Every account on the platform, with its company name where applicable. */
export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    const companies = await Company.find().select("name");
    const nameById = Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]));

    res.json(
      users.map((u) => {
        const json = u.toJSON();
        json.companyName = json.companyId ? (nameById[json.companyId] ?? null) : null;
        return json;
      }),
    );
  } catch (err) {
    next(err);
  }
}

/** Super admin can rename or deactivate an account - not reassign its role/company. */
export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { active, name } = req.body;
    if (active !== undefined) user.active = Boolean(active);
    if (name !== undefined) user.name = name;

    await user.save();
    await logAudit(
      req.user.name,
      "User updated",
      `${user.name} - ${user.role}, ${user.active ? "active" : "inactive"}`,
    );
    res.json(user.toJSON());
  } catch (err) {
    next(err);
  }
}
