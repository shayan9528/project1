# Fieldwork Job Portal

A responsive React job portal using the Arbeitnow job board API. Browse listings, search and filter by location, job type, and tags, save jobs locally, and open detailed role pages with a validated application form.

## Run locally

```bash
npm install
npm run dev
```

The job board requires an internet connection. Saved jobs are stored in browser local storage. The application form validates details in the browser and links to the employer's listing; it does not submit or store personal information.

## Build and deploy

```bash
npm run build
npm run preview
```

Push this repository to GitHub, then import it into a static host such as Vercel or Netlify. Use the default Vite build command (`npm run build`) and output directory (`dist`). Configure the host to serve `index.html` for client-side routes such as `/jobs/:slug`.