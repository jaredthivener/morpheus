import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const resolveManualChunk = (id) => {
    if (!id.includes('node_modules')) {
        return undefined;
    }
    if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
        return 'react';
    }
    if (id.includes('/node_modules/@mui/') || id.includes('/node_modules/@emotion/')) {
        return 'mui';
    }
    if (id.includes('/node_modules/@tanstack/react-query/') ||
        id.includes('/node_modules/zustand/')) {
        return 'state';
    }
    return undefined;
};
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: resolveManualChunk,
            },
        },
    },
    server: {
        port: 5173,
    },
});
//# sourceMappingURL=vite.config.js.map