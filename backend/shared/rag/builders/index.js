import { cvBuilder } from "./cv.builder.js";
import { jobBuilder } from "./job.builder.js";
import { applicationBuilder } from "./application.builder.js";
import { policyBuilder } from "./policy.builder.js";
import { profileBuilder } from "./profile.builder.js";

/** Every source the knowledge base is built from, in rebuild order. */
export const builders = [policyBuilder, jobBuilder, applicationBuilder, cvBuilder, profileBuilder];

export const builderByType = Object.fromEntries(builders.map((b) => [b.sourceType, b]));

export { cvBuilder, jobBuilder, applicationBuilder, policyBuilder, profileBuilder };
