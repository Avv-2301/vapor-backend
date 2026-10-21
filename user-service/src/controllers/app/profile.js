const User = require("../../models/auth");
const { ensureProfile } = require("../../services/accountProfile");
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId);
    if (!user)
      return res
        .status(404)
        .json({ meta: { code: 404, message: "User not found" } });
    const profile = await ensureProfile(user);
    return res.json({
      data: profile,
      meta: { code: 200, message: "Profile found" },
    });
  } catch (error) {
    next(error);
  }
};
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId);
    if (!user)
      return res
        .status(404)
        .json({ meta: { code: 404, message: "User not found" } });

    const updates = {};
    const { name, profilePhoto, quote, city, profileType } = req.body || {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message: "Name must be between 1 and 100 characters.",
            },
          });
      updates.name = name.trim();
    }
    if (profilePhoto !== undefined) {
      if (
        typeof profilePhoto !== "string" ||
        profilePhoto.length > 2048 ||
        (profilePhoto && !/^https?:\/\//i.test(profilePhoto))
      )
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message:
                "Profile photo must be an HTTP or HTTPS URL under 2048 characters.",
            },
          });
      updates.profilePhoto = profilePhoto.trim();
    }
    if (quote !== undefined) {
      if (typeof quote !== "string" || quote.length > 25)
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message: "Quote must be 25 characters or fewer.",
            },
          });
      updates.quote = quote.trim();
    }
    if (city !== undefined) {
      if (typeof city !== "string" || city.length > 100)
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message: "City must be 100 characters or fewer.",
            },
          });
      updates.city = city.trim();
    }
    if (profileType !== undefined) {
      if (!["public", "private"].includes(profileType))
        return res
          .status(400)
          .json({
            meta: {
              code: 400,
              message: "Profile visibility must be public or private.",
            },
          });
      updates.profileType = profileType;
    }

    const profile = await ensureProfile(user);
    Object.assign(profile, updates);
    await profile.save();
    return res.json({
      data: profile,
      meta: { code: 200, message: "Profile updated" },
    });
  } catch (error) {
    next(error);
  }
};
exports.createProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUserId);
    const profile = await ensureProfile(user);
    return res.json({
      data: profile,
      meta: { code: 200, message: "Profile ready" },
    });
  } catch (error) {
    next(error);
  }
};
