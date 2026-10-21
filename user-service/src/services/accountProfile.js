const Profile = require("../models/Profile");
const Library = require("../models/Library");
const User = require("../models/auth");
async function ensureProfile(user) {
  const library = await Library.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        games: [],
        totalGames: 0,
        totalPlayTime: 0,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  const profile = await Profile.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        name: user.name,
        profilePhoto:
          "https://api.dicebear.com/9.x/pixel-art/svg?seed=" +
          encodeURIComponent(user.name),
        rank: 1,
        level: 1,
        profileType: "public",
        library: library._id,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  await User.updateOne({ _id: user._id }, { $set: { profile: profile._id } });
  return profile;
}
module.exports = { ensureProfile };
