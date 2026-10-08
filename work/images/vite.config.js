import { defineConfig } from "vite";
import { resolve } from "path";
export default defineConfig({ build:{ rollupOptions:{ input:{
  main: resolve(__dirname,"index.html"),
  about: resolve(__dirname,"about.html"),
  metlife: resolve(__dirname,"MetLife.html"),
  pip: resolve(__dirname,"PIP.html"),
  curae: resolve(__dirname,"curae-health.html"),
  bjc: resolve(__dirname,"BJC.html"),
  token: resolve(__dirname,"Token.html")
}}}});
