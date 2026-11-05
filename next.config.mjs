/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit reads its font files from node_modules at runtime, so it must not be bundled (Kundali PDF)
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
