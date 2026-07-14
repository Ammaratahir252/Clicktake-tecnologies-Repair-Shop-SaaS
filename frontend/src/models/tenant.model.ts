import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * REPAIR SHOP SaaS - Tenant Model
 * Based on Module 1 Guide: Step 2
 * This represents the "Shop" itself.
 */
export interface ITenant extends Document {
  name: string;
  ownerName: string;
  subdomain: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Shop profile fields
  logo?: string;
  bannerUrl?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  // ── GPS (Module: Global GPS) ──────────────────────────────────────────────
  // GeoJSON Point — required shape for MongoDB 2dsphere geospatial queries.
  // coordinates are stored as [lng, lat] per GeoJSON spec (NOT [lat, lng]).
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  locationUpdatedAt?: Date;
  acceptedDevices: string[];
  servicesOffered: string[];
  openingHours?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  // Public shop directory / profile page
  isPubliclyVisible: boolean;
  showReviewsPublicly: boolean;
  team: {
    name: string;
    title: string;
    photoUrl?: string;
    bio?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  // Shop customization: bio + dashboard/portal toggles (owner-controlled)
  branding?: {
    bio?: string;
    homeWidgets?: {
      shopIdCard?: boolean;      // Show/hide shop ID card (owner dashboard only)
      moduleShortcuts?: boolean; // Show/hide module grid
      teamTable?: boolean;       // Show/hide team members table
      lowStockBadge?: boolean;   // Show/hide low stock indicator
    };
    customerPortal?: {
      showReviews?: boolean;   // "Review" tab in customer nav
      showDelivery?: boolean;  // "Delivery" tab in customer nav
      showEstimates?: boolean; // "Estimates" tab in customer nav
    };
    notificationPrefs?: {
      emailOnNewTicket?: boolean;    // Email the owner when a new ticket is created
      emailOnPayment?: boolean;      // Email the owner when a payment is recorded
      smsOnReadyForPickup?: boolean; // SMS the owner when a ticket is marked Ready
      smsOnOverdue?: boolean;        // Daily SMS digest of overdue tickets
    };
  };
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    subdomain: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    ownerName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    // REMOVED: Email field is removed here because it belongs to the User/Owner.
    // Having it here as 'required' was causing your terminal error.
    plan: { 
      type: String, 
      enum: ['free', 'pro', 'enterprise'], 
      default: 'free' 
    },
    isActive: { type: Boolean, default: true },
    stripeCustomerId:     { type: String },
    stripeSubscriptionId: { type: String },
    logo:          { type: String },
    bannerUrl:     { type: String },
    tagline:       { type: String },
    description:   { type: String },
    phone:         { type: String },
    address:       { type: String },
    city:          { type: String },
    postcode:      { type: String },
    country:       { type: String },
    // NO default on `type` — a default of 'Point' used to stamp every new tenant
    // with `location: { type: 'Point' }` and no coordinates, which breaks 2dsphere
    // key extraction ("Can't extract geo keys ... got type missing") on every
    // subsequent write to that document. `location` must be entirely absent until
    // real coordinates are saved via the shop profile GPS flow.
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
      },
    },
    locationUpdatedAt: { type: Date },
    acceptedDevices: { type: [String], default: [] },
    servicesOffered: { type: [String], default: [] },
    openingHours:  { type: String },
    socialLinks: {
      facebook:  { type: String },
      instagram: { type: String },
      twitter:   { type: String },
      youtube:   { type: String },
      website:   { type: String },
    },
    isPubliclyVisible:   { type: Boolean, default: false },
    showReviewsPublicly: { type: Boolean, default: true },
    team: {
      type: [{
        name:     { type: String, required: true },
        title:    { type: String, default: '' },
        photoUrl: { type: String, default: '' },
        bio:      { type: String, default: '' },
      }],
      default: [],
    },
    branding: {
      bio: { type: String, default: '' },
      homeWidgets: {
        shopIdCard:      { type: Boolean, default: true },
        moduleShortcuts: { type: Boolean, default: true },
        teamTable:       { type: Boolean, default: true },
        lowStockBadge:   { type: Boolean, default: true },
      },
      customerPortal: {
        showReviews:   { type: Boolean, default: true },
        showDelivery:  { type: Boolean, default: true },
        showEstimates: { type: Boolean, default: true },
      },
      notificationPrefs: {
        emailOnNewTicket:    { type: Boolean, default: true },
        emailOnPayment:      { type: Boolean, default: true },
        smsOnReadyForPickup: { type: Boolean, default: false },
        smsOnOverdue:        { type: Boolean, default: false },
      },
    },
  },
  { 
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

// 2dsphere index — required for $near / $geoNear "nearby shops" queries.
// sparse: true so tenants without a location set yet don't break the index.
tenantSchema.index({ location: '2dsphere' }, { sparse: true });

// Safety net: strip a half-formed location (type without coordinates) before any
// save, so a malformed document can never poison the 2dsphere index again.
tenantSchema.pre('validate', function (next) {
  const loc = this.location as any;
  if (loc && (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2)) {
    this.location = undefined;
  }
  next();
});

/**
 * Prevents "OverwriteModelError" in Next.js during hot-reloading.
 */
const Tenant: Model<ITenant> = 
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', tenantSchema);

export default Tenant;