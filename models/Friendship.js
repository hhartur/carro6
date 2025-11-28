const mongoose = require("mongoose");

const FriendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enums: ["pending", "accepted", "declined"],
      default: "pending",
    },
    requesterNickname: { type: String, trim: true },
    recipientNickname: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Friendship", FriendshipSchema);
