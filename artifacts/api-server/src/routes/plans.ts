import { Router } from "express";

const router = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    emailsPerMonth: 500,
    subscribers: 500,
    features: [
      "500 emails/month",
      "500 subscribers",
      "Basic templates",
      "Email support",
    ],
    isPopular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 29,
    emailsPerMonth: 50000,
    subscribers: 5000,
    features: [
      "50,000 emails/month",
      "5,000 subscribers",
      "All templates",
      "Campaign analytics",
      "A/B testing",
      "Priority support",
    ],
    isPopular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    emailsPerMonth: 250000,
    subscribers: 50000,
    features: [
      "250,000 emails/month",
      "50,000 subscribers",
      "All templates",
      "Advanced analytics",
      "A/B testing",
      "Automation workflows",
      "Custom domains",
      "Priority support",
    ],
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    emailsPerMonth: 9999999,
    subscribers: 9999999,
    features: [
      "Unlimited emails",
      "Unlimited subscribers",
      "All features",
      "Dedicated IP",
      "Custom integrations",
      "SLA guarantee",
      "Dedicated support",
      "White labeling",
    ],
    isPopular: false,
  },
];

router.get("/", (_req, res) => {
  res.json({ plans: PLANS });
});

export default router;
