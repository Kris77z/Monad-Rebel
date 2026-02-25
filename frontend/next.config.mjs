/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next 15 specific config improvements can go here
    async rewrites() {
        return [
            {
                source: '/api/hunter/:path*',
                destination: 'http://localhost:3002/:path*',
            },
        ];
    },
};

export default nextConfig;
