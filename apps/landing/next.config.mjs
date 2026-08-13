/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lint and type errors are build failures. They used to be ignored, which is
  // how a page shipped with a reference to a file that did not exist.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
