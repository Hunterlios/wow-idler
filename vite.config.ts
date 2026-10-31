import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' -> działa z file:// w Electronie
export default defineConfig({ plugins: [react()], base: './' })
