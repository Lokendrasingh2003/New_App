const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: { type: String, default: null, trim: true },
    image: { type: String, default: null },
    icon: { type: String, default: null },
    subcategories: { type: [subcategorySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    displayOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ status: 1, isActive: 1, createdAt: -1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
