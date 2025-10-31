const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["FRIEND_REQUEST", "FRIEND_REQUEST_ACCEPTED", "VEHICLE_SHARED", "CHAT_MESSAGE", "GENERAL"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Para dados adicionais, como requestId, etc.
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
