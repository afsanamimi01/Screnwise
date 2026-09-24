import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import { logAudit } from "../../shared/utils/audit.js";


export async function listUsers(req, res, next) {
  try {
    // ---- Sort config ----
    const SORT_BY = "createdAt asc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const allUsers = await User.find().sort({ [sortField]: sortOrder });
    const allCompanies = await Company.find().select("name");

    // Company name by id, looked up once instead of per row.
    const nameById = {};
    for (const company of allCompanies) {
      nameById[company._id.toString()] = company.name;
    }

    const rows = [];
    for (const user of allUsers) {
      // ---- Column: Name ----
      const name = user.name;

      // ---- Column: Email ----
      const email = user.email;

      // ---- Column: Role ----
      const role = user.role;

      // ---- Column: Company ----
      const companyName = user.companyId ? (nameById[user.companyId.toString()] ?? null) : null;

      // ---- Column: Joined ----
      const createdAt = user.toJSON().createdAt;

      // ---- Column: Active ----
      const active = user.active;

      rows.push({
        ...user.toJSON(),
        name,
        email,
        role,
        companyName,
        createdAt,
        active,
      });
    }

    res.json(rows);
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

    // ---- Action: Rename ----
    if (name !== undefined) {
      user.name = name;
    }

    // ---- Action: Active / inactive ----
    // The Users table sends a checkbox state: ticked = active, unticked = inactive.
    if (active !== undefined) {
      const ticked = Boolean(active);
      if (ticked) {
        user.active = true;
      } else {
        user.active = false;
      }
    }

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
