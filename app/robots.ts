import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://placetrix.app";

  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/dashboard/",
        "/home/",
        "/api/",
        "/auth/",
        "/verify/",
        "/admin/",
        "/tests/",
        "/events/",
        "/courses/",
        "/logiclab/",
        "/opportunities/",
        "/users/",
        "/cohorts/",
        "/support/",
        "/gethelp/",
        "/settings/",
        "/myprofile/",
        "/licenses/",
        "/analytics/",
        "/groups/",
        "/candidates/",
      ],
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
