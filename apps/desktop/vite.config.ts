import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';
import { lingoCompilerPlugin } from "@lingo.dev/compiler/vite";


export default defineConfig({
    plugins: [
        lingoCompilerPlugin({
            sourceRoot: "src",
            sourceLocale: "en",
            targetLocales: ["es", "de", "fr", "hi", "de", "zh", "ja", "pt", "it", "ru", "ko", "nl", "tr", "pl", "sv"],
            models: "lingo.dev",
            dev: {
                usePseudotranslator: false,
            },
        }),
        react(),
        electron([
            {
                // Main-Process entry point of the Electron App.
                entry: 'electron/main.ts',
            },
            {
                entry: 'electron/preload.ts',
            },
        ]),
        renderer(),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
});

