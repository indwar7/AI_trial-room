# Mirror Fit · AI Trial Room

Take a photo of a person and a photo of a garment, say who is wearing it and what it is, and get back a picture of that person wearing the garment.

It is free to run: no AI API key and no billing. The browser sends the two photos straight to public AI demo servers on Hugging Face and shows the picture that comes back. The site keeps store logins and nothing else: no photos and no pictures.

## Logins

The trial room is behind a sign-in. There is no registration: a store asks for a login from the sign-in screen (name, store, phone), and we create it.

- `/admin` lists the requests and the stores that have a login. It opens with the admin key.
- Creating a login makes a password and shows it once, with a ready WhatsApp message for the store. A login can be turned off, given a new password, or deleted. Turning it off or resetting the password signs the store out everywhere.
- Logins and requests are small JSON files in a private Vercel Blob store. Passwords are stored hashed.

Environment variables on Vercel: `BLOB_READ_WRITE_TOKEN` (added by the Blob store), `ADMIN_KEY` and `SESSION_SECRET` (each 24 characters or more). For local work, `vercel env pull` brings the Blob token; add the other two to `.env.local` yourself.

The sign-in keeps other people out of the app. The try-on itself still runs between the browser and the public demo servers.

## The free limit

The demo servers give each network (IP address) a free allowance of GPU time per day. Measured on 24 Nov 2026 it was 180 seconds, and one top used about 20 seconds of it. Everyone on the same Wi-Fi shares the allowance; a phone on mobile data has its own.

- Tops: several a day. A run is refused once too little allowance is left, which should work out to six or seven a day. That figure is estimated from the numbers above, not counted.
- Trousers, skirts and dresses: these run on a second server that asks for the full 180 seconds up front. In testing it worked as the first try-on of the day and was refused after anything else had run.

When the allowance runs out the site says so and, where the server gives one, shows the time until it resets.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The camera only works on `localhost` or over HTTPS.

## Deploy

A standard Next.js app. It needs the three environment variables listed under Logins. Pushing to `main` redeploys it on Vercel.

## How it works

| Path | Role |
| --- | --- |
| `src/components/TrialRoom.tsx` | The page: two photo slots, the choices, the result |
| `src/components/CameraModal.tsx` | In-browser camera with a 3:4 viewfinder |
| `src/lib/image.ts` | Shrinks photos in the browser before they are sent, and tidies the result |
| `src/lib/garments.ts` | Garment types and which garment area each maps to |
| `src/lib/tryon.ts` | Calls the demo servers with `@gradio/client` |

Two servers are used, in this order:

| Server | Garments | Licence |
| --- | --- | --- |
| [yisol/IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON) | tops | CC BY-NC-SA 4.0 (non-commercial) |
| [franciszzj/Leffa](https://huggingface.co/spaces/franciszzj/Leffa) | tops (fallback), trousers, skirts, dresses | MIT |

These are other people's public demos. They can be slow, queued, changed or taken offline without notice, and IDM-VTON's licence does not allow commercial use.

## Photo tips

- Person: one person, standing straight, facing the camera, head to hips in view.
- Garment: laid flat or on a hanger, the whole garment in view, plain background.
