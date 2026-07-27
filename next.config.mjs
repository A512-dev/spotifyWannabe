/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow this LAN host to reach the development server without an origin
  // warning. This does not define production CORS or application routing.
  allowedDevOrigins: ['10.161.194.237'],
};

export default nextConfig;
