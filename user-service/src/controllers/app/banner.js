const Banner = require("../../models/Banner");

const isSafeLink = (link) => {
  if (typeof link !== "string" || !link.trim()) return false;
  if (link.startsWith("/") && !link.startsWith("//") && !link.includes("\\"))
    return true;
  try {
    return new URL(link).protocol === "https:";
  } catch {
    return false;
  }
};

exports.getHomepageBanners = async (req, res, next) => {
  try {
    const now = new Date();
    const banners = await Banner.find({
      position: "homepage-hero",
      status: { $in: ["active", "scheduled"] },
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(5)
      .select("_id title image link linkTarget deviceTypes priority")
      .lean();

    const publicBanners = banners.map(
      ({ _id, title, image, link, linkTarget, deviceTypes }) => ({
        id: _id,
        title,
        image,
        link: isSafeLink(link) ? link : null,
        linkTarget: linkTarget === "_blank" ? "_blank" : "_self",
        deviceTypes: Array.isArray(deviceTypes)
          ? deviceTypes
          : ["desktop", "mobile"],
      })
    );

    return res.json({
      data: { banners: publicBanners },
      meta: { code: 200, message: "Homepage banners retrieved successfully" },
    });
  } catch (error) {
    return next(error);
  }
};
