import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true, // The user who is reporting the issue
  },
  reportedEntity: {
    type: Schema.Types.ObjectId,
    ref: 'Product', // Dynamically reference the collection based on entityType
    required: true, // Reference to the entity being reported
  },
  reason: {
    type: String,
    required: true, // Reason for the report (e.g., "Fake product", "Offensive behavior")
  },
  details: {
    type: String,
    required: false, // Additional details about the report
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Dismissed'],
    default: 'Pending', // Status of the report
  },
  adminComments: {
    type: String,
    required: false, // Comments from the admin after reviewing the report
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp when the report was created
  },
  resolvedAt: {
    type: Date, // Timestamp when the report was resolved
  },
});

export const Report = mongoose.model('Report', ReportSchema);
