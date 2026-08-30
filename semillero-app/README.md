This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Abre `http://localhost:3000/semillero-robotica-prueba/`; el prefijo corresponde
al `basePath` usado por GitHub Pages.

## Backend y autenticación

La aplicación usa Supabase para autenticación por correo/contraseña,
PostgreSQL, roles (`candidate`, `evaluator`, `admin`) y Storage privado. Sin
variables de Supabase conserva un modo local para desarrollo.

Consulta [supabase/README.md](./supabase/README.md) para aplicar la migración,
crear evaluadores y administradores, abrir el banco común de aspirantes y
configurar GitHub Actions.

La rama de Sistemas e Integración (SI0–SI6) ya utiliza retos interactivos: una
terminal determinista que no ejecuta shell real y una entrega abierta para el
reto de deployment.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
