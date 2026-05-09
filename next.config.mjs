import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Worksheet uploads can be 5MB PDFs; default server action limit is 1MB.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default withNextIntl(nextConfig);
