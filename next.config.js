/** @type {import('next').NextConfig} */

// Ensure DATABASE_URL is available during build
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  // Railway sets this, but if it's missing during build, use a placeholder
  process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@placeholder:5432/placeholder'
}

const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
