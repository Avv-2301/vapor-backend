const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userRole: {
      type: String,
      enum: ["admin", "user"],
      default: null,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
    endpoint: {
      type: String,
      required: true,
    },
    fullUrl: {
      type: String,
      required: true,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    queryParams: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ endpoint: 1, createdAt: -1 });
auditLogSchema.index({ method: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });
auditLogSchema.index({ responseStatus: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

